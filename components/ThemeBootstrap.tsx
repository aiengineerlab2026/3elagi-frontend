import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import colors, { ACCENTS } from "@/constants/colors";
import { resolveTheme, useThemeStore } from "@/domains/theme/store";

function primaryTrack(hex: string, alpha = 0.1): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Syncs OS status bar + web document surfaces with the active theme. */
export function ThemeBootstrap() {
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);
  const systemScheme = useColorScheme();
  const resolved = resolveTheme(mode, systemScheme);
  const palette = { ...colors[resolved], ...ACCENTS[accent][resolved] };

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.colorScheme = resolved;
    root.dataset.theme = resolved;
    root.style.setProperty("--app-bg", palette.background);
    root.style.setProperty("--app-fg", palette.foreground);
    root.style.setProperty("--scrollbar-thumb", palette.primary);
    root.style.setProperty("--scrollbar-thumb-hover", palette.accentForeground);
    root.style.setProperty("--scrollbar-track", primaryTrack(palette.primary));
    document.body.style.backgroundColor = palette.background;
    document.body.style.color = palette.foreground;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", palette.background);
  }, [
    resolved,
    palette.background,
    palette.foreground,
    palette.primary,
    palette.accentForeground,
  ]);

  return <StatusBar style={resolved === "dark" ? "light" : "dark"} />;
}
