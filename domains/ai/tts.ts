import { API_BASE } from "@/constants/api";

const TTS_TIMEOUT_MS = 60_000;

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `TTS request failed (${res.status})`;
  try {
    const data = JSON.parse(text) as { message?: string | string[]; error?: string };
    if (Array.isArray(data.message)) return data.message.join(", ");
    return data.message ?? data.error ?? text;
  } catch {
    return text;
  }
}

export async function fetchAssistantTts(
  token: string,
  text: string,
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/tts`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      throw new Error(await parseError(res));
    }
    return res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}
