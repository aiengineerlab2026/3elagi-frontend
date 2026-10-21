import type { Locale } from "@/domains/i18n/store";

/** BCP-47 tags tuned for Chrome / Safari Web Speech API. */
export const WEB_SPEECH_LANG: Record<Locale, string> = {
  ar: "ar-SA",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
};

/**
 * Web Speech API needs one language tag (used for AI voice-mode continuous listen).
 * Dictation / STT paths use backend auto-detect among ar | en | de | es instead.
 */
export function resolveWebSpeechLang(locale: Locale): string {
  return WEB_SPEECH_LANG[locale];
}

/** Pick a supported locale when the browser reports a preferred language list. */
export function pickSpeechLocaleFromBrowser(): Locale {
  if (typeof navigator === "undefined") return "ar";
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const tag of langs) {
    const lower = tag.toLowerCase();
    if (lower.startsWith("ar")) return "ar";
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("es")) return "es";
    if (lower.startsWith("en")) return "en";
  }
  return "ar";
}

export function speechLocaleLabel(locale: Locale, uiLocale: Locale): string {
  const option = {
    ar: { ar: "العربية", en: "Arabic", de: "Arabisch", es: "Árabe" },
    en: { ar: "الإنجليزية", en: "English", de: "Englisch", es: "Inglés" },
    de: { ar: "الألمانية", en: "German", de: "Deutsch", es: "Alemán" },
    es: { ar: "الإسبانية", en: "Spanish", de: "Spanisch", es: "Español" },
  }[locale];
  return option[uiLocale];
}
