/**
 * Google AI Gemini (@google/generative-ai) accepts a narrower MIME set than
 * Vertex: wav/mp3/aiff/aac/ogg/flac — not always audio/mp4 for m4a containers.
 * Map expo-av HIGH_QUALITY (.m4a / MPEG-4 AAC) to audio/aac.
 */
export function normalizeSttMimeType(mimeType: string, uri?: string): string {
  const raw = (mimeType || "").trim().toLowerCase();
  const path = (uri || "").toLowerCase();
  if (
    raw === "audio/mp4" ||
    raw === "audio/m4a" ||
    raw === "audio/x-m4a" ||
    raw === "audio/aac" ||
    raw === "audio/x-aac" ||
    path.endsWith(".m4a") ||
    path.endsWith(".aac")
  ) {
    return "audio/aac";
  }
  if (raw === "audio/3gpp" || raw === "audio/3gp" || path.endsWith(".3gp")) {
    return "audio/aac";
  }
  if (
    raw === "audio/mpeg" ||
    raw === "audio/mp3" ||
    raw === "audio/mpga" ||
    path.endsWith(".mp3")
  ) {
    return "audio/mp3";
  }
  if (raw === "audio/webm" || path.endsWith(".webm")) return "audio/webm";
  if (raw === "audio/wav" || raw === "audio/wave" || path.endsWith(".wav")) {
    return "audio/wav";
  }
  if (raw === "audio/ogg" || path.endsWith(".ogg") || path.endsWith(".opus")) {
    return "audio/ogg";
  }
  if (raw === "audio/flac" || raw === "audio/aiff") return raw;
  return raw || "audio/aac";
}
