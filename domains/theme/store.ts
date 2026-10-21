import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ACCENT_KEYS, type AccentKey } from "@/constants/colors";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  /** Primary colour palette; blue ships as the default. */
  accent: AccentKey;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
}

function isAccentKey(value: unknown): value is AccentKey {
  return ACCENT_KEYS.includes(value as AccentKey);
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(
  mode: ThemeMode,
  systemScheme: "light" | "dark" | null | undefined,
): ResolvedTheme {
  if (mode === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }
  return mode;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      accent: "blue",
      hydrated: false,
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
    }),
    {
      name: "3elagi-theme",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode, accent: state.accent }),
      merge: (persisted, current) => {
        const stored = persisted as Partial<ThemeState> | undefined;
        return {
          ...current,
          ...stored,
          mode: isThemeMode(stored?.mode) ? stored.mode : "system",
          accent: isAccentKey(stored?.accent) ? stored.accent : "blue",
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!isThemeMode(state.mode)) state.mode = "system";
          if (!isAccentKey(state.accent)) state.accent = "blue";
          state.hydrated = true;
        }
      },
    },
  ),
);
