import { useMemo } from "react";
import { useColorScheme } from "react-native";
import colors, { ACCENTS } from "@/constants/colors";
import { resolveTheme, useThemeStore } from "@/domains/theme/store";

export type AppColors = (typeof colors)["light"] & { radius: number };

export function useColors(): AppColors {
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);
  const systemScheme = useColorScheme();
  const resolved = resolveTheme(mode, systemScheme);

  return useMemo(
    // The accent palette only overrides the primary/accent tokens; surfaces,
    // text and status colours stay put across every choice.
    () => ({ ...colors[resolved], ...ACCENTS[accent][resolved], radius: colors.radius }),
    [resolved, accent],
  );
}

/** Brand gradient for the active accent (CTAs, auth buttons). */
export function useAccentGradient(): [string, string] {
  const accent = useThemeStore((s) => s.accent);
  return ACCENTS[accent].gradient;
}

export function useResolvedTheme() {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  return resolveTheme(mode, systemScheme);
}
