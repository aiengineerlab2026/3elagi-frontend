import type { Locale } from "@/domains/i18n/store";
import type { TextStyle } from "react-native";

const ARABIC_RE = /[\u0600-\u06FF]/;
const LATIN_RE = /[A-Za-z]/;

export function doctorTagTextStyle(label: string, locale: Locale): TextStyle {
  const hasArabic = ARABIC_RE.test(label);
  const hasLatin = LATIN_RE.test(label);

  if (hasArabic && !hasLatin) {
    return { writingDirection: "rtl", textAlign: "right" };
  }
  if (hasLatin && !hasArabic) {
    return { writingDirection: "ltr", textAlign: "left" };
  }

  return locale === "ar"
    ? { writingDirection: "rtl", textAlign: "right" }
    : { writingDirection: "ltr", textAlign: "left" };
}

export function doctorTagRowStyle(isRTL: boolean) {
  return {
    width: "100%" as const,
    justifyContent: isRTL ? ("flex-end" as const) : ("flex-start" as const),
  };
}
