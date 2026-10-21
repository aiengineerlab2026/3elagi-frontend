import { useI18nStore, type Locale } from "@/domains/i18n/store";

/** API language code from the persisted user locale (not layout direction). */
export function useApiLang(): Locale {
  return useI18nStore((s) => s.locale);
}
