import { useEffect } from "react";
import { Platform } from "react-native";
import { useI18nStore, type Locale } from "@/domains/i18n/store";

const LOCALE_STORAGE_KEY = "3elagi-locale";

function readLocaleFromStorage(raw: string | null): Locale | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { locale?: unknown } };
    const next = parsed.state?.locale;
    if (next === "ar" || next === "en" || next === "de" || next === "es") {
      return next;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Keeps web document lang/dir aligned with the persisted locale. */
export function LocaleBootstrap() {
  const locale = useI18nStore((s) => s.locale);
  const hydrated = useI18nStore((s) => s.hydrated);

  useEffect(() => {
    if (Platform.OS !== "web" || !hydrated || typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.lang = locale;
    // RTL is hand-rolled (flexDirection / textAlign per component), so the
    // document must stay ltr — dir="rtl" would reverse those rows a second
    // time. Arabic-only styling keys off [lang="ar"] (see GLOBAL_WEB_CSS).
    root.dir = "ltr";
  }, [locale, hydrated]);

  // Demo shell and iframe panels share localStorage; sync locale across frames.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCALE_STORAGE_KEY) return;
      const next = readLocaleFromStorage(event.newValue);
      if (!next || next === useI18nStore.getState().locale) return;
      useI18nStore.setState({ locale: next });
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}
