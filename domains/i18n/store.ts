import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ar, de, en, es, type Translations } from "@/constants/translations";
import { patchUserLocale } from "./serverSync";

export type Locale = "en" | "ar" | "de" | "es";

/** App-wide default language for new sessions / missing preferences. */
export const DEFAULT_LOCALE: Locale = "ar";

interface I18nState {
  locale: Locale;
  hydrated: boolean;
  setLocale: (l: Locale) => void;
  syncLocaleToServer: () => void;
}

function syncLocaleIfSignedIn(locale: Locale) {
  void import("@/domains/auth/store").then(({ useAuthStore }) => {
    const token = useAuthStore.getState().accessToken;
    if (token) void patchUserLocale(token, locale);
  });
}

function isLocale(value: unknown): value is Locale {
  return value === "ar" || value === "en" || value === "de" || value === "es";
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      // Default language is Arabic (web + mobile) until the user picks one or a
      // server preference loads.
      locale: DEFAULT_LOCALE,
      hydrated: false,
      setLocale: (locale) => {
        set({ locale });
        syncLocaleIfSignedIn(locale);
      },
      syncLocaleToServer: () => {
        syncLocaleIfSignedIn(get().locale);
      },
    }),
    {
      name: "3elagi-locale",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ locale: state.locale }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<I18nState> | undefined;
        return {
          ...current,
          ...stored,
          locale: isLocale(stored?.locale) ? stored.locale : DEFAULT_LOCALE,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!isLocale(state.locale)) state.locale = DEFAULT_LOCALE;
          state.hydrated = true;
        }
      },
    },
  ),
);

export function getDict(locale: Locale): Translations {
  switch (locale) {
    case "ar":
      return ar;
    case "de":
      return de;
    case "es":
      return es;
    default:
      return en;
  }
}

export function getApiLang(): Locale {
  return useI18nStore.getState().locale;
}

export function applyLocaleAfterAuth(
  preferredLocale: Locale | null | undefined,
): void {
  if (isLocale(preferredLocale)) {
    useI18nStore.setState({ locale: preferredLocale });
    return;
  }
  // No server preference → keep / restore Arabic as the product default.
  useI18nStore.setState({ locale: DEFAULT_LOCALE });
  useI18nStore.getState().syncLocaleToServer();
}
