import { Audio as ExpoAudio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { AppState, Platform } from "react-native";
import {
  mimeTypeForRecordingUri,
  STT_RECORDING_OPTIONS,
} from "@/utils/sttRecordingOptions";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Buffer } = require("buffer") as typeof import("buffer");
  return Buffer.from(bytes).toString("base64");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type NativeRecorderOptions = {
  /** Minimum capture length before STT (default 400ms for tap-to-talk). */
  minDurationMs?: number;
};

function isAudioFocusError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return (
    /AudioFocusNotAcquired/i.test(message) ||
    /currently in the background/i.test(message) ||
    /audio session could not be activated/i.test(message) ||
    /audio focus could not be acquired/i.test(message)
  );
}

/** Map raw expo-av / OS errors to a short user-facing string. */
export function friendlyAssistantVoiceError(err: unknown, fallback: string): string {
  if (isAudioFocusError(err)) {
    return "Could not start audio. Keep the app open and try again.";
  }
  if (err instanceof Error && err.message.trim()) {
    // Avoid dumping Java exception class names into the UI.
    if (/Exception:|Error Domain=|expo\.modules/i.test(err.message)) {
      return fallback;
    }
    return err.message;
  }
  return fallback;
}

/** Wait until the JS AppState is active — expo-av rejects focus while “background”. */
async function waitForForeground(timeoutMs = 2500): Promise<boolean> {
  if (Platform.OS === "web") return true;
  if (AppState.currentState === "active") return true;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      sub.remove();
      clearTimeout(timer);
      resolve(ok);
    };
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") finish(true);
    });
    const timer = setTimeout(() => finish(AppState.currentState === "active"), timeoutMs);
  });
}

async function prepareNativeAudioMode(allowsRecording: boolean) {
  await ExpoAudio.setAudioModeAsync({
    allowsRecordingIOS: allowsRecording,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    // Android only: helps after permission sheet. iOS needs UIBackgroundModes
    // "audio" for true background stays — we do not declare that.
    staysActiveInBackground: Platform.OS === "android",
  });
}

async function withAudioFocusRetry<T>(run: () => Promise<T>): Promise<T> {
  const foreground = await waitForForeground();
  if (!foreground) {
    throw new Error("Could not start audio. Keep the app open and try again.");
  }

  try {
    return await run();
  } catch (err) {
    if (!isAudioFocusError(err)) throw err;
    // Common after mic permission sheet / brief inactivity — brief pause then retry once.
    await sleep(400);
    if (AppState.currentState !== "active") {
      const ok = await waitForForeground(1500);
      if (!ok) {
        throw new Error("Could not start audio. Keep the app open and try again.");
      }
    }
    return await run();
  }
}

export class NativeAssistantRecorder {
  private recording: ExpoAudio.Recording | null = null;
  private startedAt = 0;
  private readonly minDurationMs: number;

  constructor(options?: NativeRecorderOptions) {
    this.minDurationMs = options?.minDurationMs ?? 400;
  }

  get active() {
    return !!this.recording;
  }

  async start(): Promise<void> {
    const { status } = await ExpoAudio.requestPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Microphone permission is required for voice chat.");
    }

    await withAudioFocusRetry(async () => {
      await prepareNativeAudioMode(true);
      // Small delay after permission / mode change so Android can grant focus.
      await sleep(150);
      const { recording } = await ExpoAudio.Recording.createAsync(
        STT_RECORDING_OPTIONS,
      );
      this.recording = recording;
      this.startedAt = Date.now();
    });
  }

  async stop(): Promise<{ base64: string; mimeType: string }> {
    const recording = this.recording;
    if (!recording) throw new Error("Recorder not started");

    const durationMs = Date.now() - this.startedAt;
    await recording.stopAndUnloadAsync();
    this.recording = null;
    await prepareNativeAudioMode(false);

    if (durationMs < this.minDurationMs) {
      throw new Error("Recording too short. Hold the mic a little longer.");
    }

    const uri = recording.getURI();
    if (!uri) throw new Error("Could not save recording.");

    const mimeType = mimeTypeForRecordingUri(uri);
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64?.length) {
      throw new Error("Could not read recording.");
    }
    return { base64, mimeType };
  }

  async cancel(): Promise<void> {
    if (!this.recording) return;
    try {
      await this.recording.stopAndUnloadAsync();
    } catch {
      /* ignore */
    }
    this.recording = null;
    try {
      await prepareNativeAudioMode(false);
    } catch {
      /* ignore */
    }
  }
}

export async function playAssistantTtsBuffer(
  audioBuffer: ArrayBuffer,
  callbacks: {
    onStart?: () => void;
    onProgress?: (ratio: number) => void;
    onEnd?: () => void;
    onError?: (message: string) => void;
  },
): Promise<() => void> {
  if (Platform.OS === "web") {
    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const audio = new window.Audio(url);
    audio.onplay = () => callbacks.onStart?.();
    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        callbacks.onProgress?.(audio.currentTime / audio.duration);
      }
    };
    audio.onended = () => {
      URL.revokeObjectURL(url);
      callbacks.onProgress?.(1);
      callbacks.onEnd?.();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      callbacks.onError?.("Could not play voice response.");
    };
    await audio.play();
    return () => {
      audio.pause();
      URL.revokeObjectURL(url);
    };
  }

  const path = `${FileSystem.cacheDirectory}assistant-tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(path, arrayBufferToBase64(audioBuffer), {
    encoding: FileSystem.EncodingType.Base64,
  });

  let sound: ExpoAudio.Sound;
  try {
    sound = await withAudioFocusRetry(async () => {
      await prepareNativeAudioMode(false);
      const created = await ExpoAudio.Sound.createAsync(
        { uri: path },
        { shouldPlay: false },
      );
      return created.sound;
    });
  } catch (err) {
    callbacks.onError?.(
      friendlyAssistantVoiceError(err, "Could not play voice response."),
    );
    throw err;
  }

  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) {
      if ("error" in status && status.error) {
        callbacks.onError?.(
          friendlyAssistantVoiceError(status.error, "Could not play voice response."),
        );
      }
      return;
    }
    if (status.isPlaying) callbacks.onStart?.();
    if (status.durationMillis && status.positionMillis != null) {
      callbacks.onProgress?.(status.positionMillis / status.durationMillis);
    }
    if (status.didJustFinish) {
      callbacks.onProgress?.(1);
      void sound.unloadAsync();
      callbacks.onEnd?.();
    }
  });

  try {
    await withAudioFocusRetry(async () => {
      await sound.playAsync();
    });
  } catch (err) {
    try {
      await sound.unloadAsync();
    } catch {
      /* ignore */
    }
    callbacks.onError?.(
      friendlyAssistantVoiceError(err, "Could not play voice response."),
    );
    throw err;
  }

  callbacks.onStart?.();
  return async () => {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {
      /* ignore */
    }
  };
}
