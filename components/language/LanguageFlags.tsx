import type { Locale } from "@/domains/i18n/store";

export const LANGUAGE_OPTIONS: {
  locale: Locale;
  label: string;
  sublabel: string;
}[] = [
  { locale: "ar", label: "العربية", sublabel: "Arabic" },
  { locale: "en", label: "English", sublabel: "English" },
  { locale: "de", label: "Deutsch", sublabel: "German" },
  { locale: "es", label: "Español", sublabel: "Spanish" },
];
