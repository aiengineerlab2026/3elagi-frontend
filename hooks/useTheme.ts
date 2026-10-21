import { useColorScheme } from "react-native";
import { resolveTheme, useThemeStore, type ThemeMode } from "@/domains/theme/store";
import { useResolvedTheme } from "@/hooks/useColors";

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const hydrated = useThemeStore((s) => s.hydrated);
  const setMode = useThemeStore((s) => s.setMode);
  const systemScheme = useColorScheme();
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";

  return {
    mode,
    hydrated,
    setMode,
    resolved,
    isDark,
    systemScheme,
    isSystem: mode === "system",
  } satisfies {
    mode: ThemeMode;
    hydrated: boolean;
    setMode: (mode: ThemeMode) => void;
    resolved: "light" | "dark";
    isDark: boolean;
    systemScheme: ReturnType<typeof useColorScheme>;
    isSystem: boolean;
  };
}

export function getResolvedThemeSnapshot(): "light" | "dark" {
  const { mode } = useThemeStore.getState();
  return resolveTheme(mode, null);
}
