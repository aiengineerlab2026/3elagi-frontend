import { API_BASE } from "@/constants/api";
import type { Locale } from "@/domains/i18n/store";

const STT_TIMEOUT_MS = 60_000;

/** Auto-detect among Arabic, English, German, Spanish. */
export type SttLanguageCode = Locale | "auto";

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `STT request failed (${res.status})`;
  try {
    const data = JSON.parse(text) as { message?: string | string[]; error?: string };
    if (Array.isArray(data.message)) return data.message.join(", ");
    return data.message ?? data.error ?? text;
  } catch {
    return text;
  }
}

export async function transcribeAssistantAudio(
  token: string,
  audioBase64: string,
  mimeType: string,
  languageCode: SttLanguageCode = "auto",
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/stt`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio: audioBase64,
        mimeType,
        languageCode:
          !languageCode || languageCode === "auto" ? "auto" : languageCode,
      }),
    });
    if (!res.ok) {
      throw new Error(await parseError(res));
    }
    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();
    if (!text) throw new Error("No speech detected");
    return text;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Speech recognition timed out. Try a shorter recording.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read audio"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read audio"));
    reader.readAsDataURL(blob);
  });
}
