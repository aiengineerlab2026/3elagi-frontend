import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { useEffect } from "react";
import { Platform, Vibration } from "react-native";

/** Ring-ring, pause — repeats until the call is answered or gone. */
const RING_VIBRATION_PATTERN = [0, 700, 400, 700, 1400];

const SOUNDS = {
  /** Caller side: the classic 440+480 Hz ringback, 2s on / 3s off. */
  ringback: require("@/assets/sounds/ringback.wav"),
  /** Callee side: rising chime, like a phone ringing. */
  ringtone: require("@/assets/sounds/ringtone.wav"),
} as const;

/**
 * Loops a call ring while `active`. Failures are swallowed on purpose — a
 * blocked autoplay or a busy audio session must never break the call itself.
 *
 * The callee ring takes over audio focus instead of ducking: ducking left it
 * mixed under other audio and tied to the media volume, so an incoming call
 * could arrive inaudible. It vibrates alongside for the same reason.
 */
export function useRinger(kind: keyof typeof SOUNDS, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let sound: Audio.Sound | null = null;
    let cancelled = false;
    const isCallee = kind === "ringtone";

    if (isCallee && Platform.OS !== "web") {
      Vibration.vibrate(RING_VIBRATION_PATTERN, true);
    }

    void (async () => {
      try {
        if (Platform.OS !== "web") {
          // Ring through the silent switch. The callee ring interrupts other
          // audio (a phone ringing should); the caller's ringback still ducks.
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            interruptionModeIOS: isCallee
              ? InterruptionModeIOS.DoNotMix
              : InterruptionModeIOS.DuckOthers,
            interruptionModeAndroid: isCallee
              ? InterruptionModeAndroid.DoNotMix
              : InterruptionModeAndroid.DuckOthers,
            shouldDuckAndroid: !isCallee,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });
        }
        const created = await Audio.Sound.createAsync(SOUNDS[kind], {
          isLooping: true,
          shouldPlay: true,
          volume: isCallee ? 1 : 0.9,
        });
        if (cancelled) {
          await created.sound.unloadAsync();
          return;
        }
        sound = created.sound;
      } catch {
        // no ring is better than a crash
      }
    })();

    return () => {
      cancelled = true;
      if (isCallee && Platform.OS !== "web") Vibration.cancel();
      void sound?.unloadAsync().catch(() => {});
    };
  }, [kind, active]);
}
