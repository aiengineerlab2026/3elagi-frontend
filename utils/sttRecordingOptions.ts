import {
  AndroidAudioEncoder,
  AndroidOutputFormat,
  IOSAudioQuality,
  IOSOutputFormat,
} from "expo-av/build/Audio/RecordingConstants";
import type { RecordingOptions } from "expo-av/build/Audio/Recording.types";

/** Mono speech capture tuned for backend STT (Gemini / Cloud Speech). */
export const STT_RECORDING_OPTIONS: RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: ".m4a",
    outputFormat: AndroidOutputFormat.MPEG_4,
    audioEncoder: AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: ".wav",
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 64000,
  },
};

export function mimeTypeForRecordingUri(uri: string): string {
  const path = uri.toLowerCase();
  if (path.endsWith(".wav")) return "audio/wav";
  if (path.endsWith(".3gp")) return "audio/3gpp";
  if (path.endsWith(".m4a") || path.endsWith(".mp4")) return "audio/mp4";
  if (path.endsWith(".caf")) return "audio/x-caf";
  if (path.endsWith(".webm")) return "audio/webm";
  return "audio/mp4";
}
