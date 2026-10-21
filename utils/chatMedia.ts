/** Audio/voice mime helpers shared between the chat composer and consultation dialog. */

export function mimeFromUri(uri: string, fallback: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "m4a") return "audio/m4a";
  if (ext === "caf") return "audio/x-caf";
  if (ext === "3gp") return "audio/3gpp";
  if (ext === "aac") return "audio/aac";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "webm") return "audio/webm";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "wav") return "audio/wav";
  return fallback;
}

export function normalizeWebVoiceMime(rawType: string, fallbackMime: string): string {
  const base = rawType.split(";")[0].trim().toLowerCase();
  if (!base || base === "application/octet-stream") return fallbackMime;
  // MediaRecorder on Chrome may label audio-only captures as video/webm.
  if (base === "video/webm") return "audio/webm";
  return base;
}

export async function resolveWebVoiceFile(
  uri: string,
  fallbackMime: string,
): Promise<{ webFile: File; mimeType: string; fileName: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const mimeType = normalizeWebVoiceMime(blob.type, fallbackMime);
  const ext = mimeType.includes("webm")
    ? "webm"
    : mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("mpeg")
          ? "mp3"
          : "m4a";
  const fileName = `voice-${Date.now()}.${ext}`;
  const webFile = new File([blob], fileName, { type: mimeType });
  return { webFile, mimeType, fileName };
}
