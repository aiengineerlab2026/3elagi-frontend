import { useMemo } from "react";
import { getDict, useI18nStore, type Locale } from "@/domains/i18n/store";
import type { Translations } from "@/constants/translations";

export interface I18nApi {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
  isRTL: boolean;
  dir: "rtl" | "ltr";
}

export function useI18n(): I18nApi {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  return useMemo(
    () => ({
      locale,
      setLocale,
      t: getDict(locale),
      isRTL: locale === "ar",
      dir: locale === "ar" ? "rtl" : "ltr",
    }),
    [locale, setLocale],
  );
}
