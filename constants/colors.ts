const colors = {
  light: {
    text: "#1a2132",
    tint: "#0f766e",
    background: "#f5f7fa",
    foreground: "#1a2132",
    card: "#ffffff",
    cardForeground: "#1a2132",
    primary: "#0f766e",
    primaryForeground: "#ffffff",
    secondary: "#eef2f8",
    secondaryForeground: "#1a2132",
    muted: "#eef2f8",
    mutedForeground: "#5c6b82",
    accent: "#e6f4f1",
    accentForeground: "#115e59",
    destructive: "#dc4c4c",
    destructiveForeground: "#ffffff",
    border: "#dde4ef",
    input: "#dde4ef",
    filterPanel: "#e8eef8",
    success: "#3d9a7a",
    warning: "#d4a012",
    info: "#0e7490",
  },
  dark: {
    text: "#e8edf5",
    tint: "#2dd4bf",
    background: "#0f1419",
    foreground: "#e8edf5",
    card: "#1a2132",
    cardForeground: "#e8edf5",
    primary: "#2dd4bf",
    primaryForeground: "#0f1419",
    secondary: "#1e2838",
    secondaryForeground: "#e8edf5",
    muted: "#1e2838",
    mutedForeground: "#8b9cb8",
    accent: "#123430",
    accentForeground: "#99f6e4",
    destructive: "#f06060",
    destructiveForeground: "#ffffff",
    border: "#2a3548",
    input: "#2a3548",
    filterPanel: "#1a2132",
    success: "#4db892",
    warning: "#e8b020",
    info: "#22d3ee",
  },
  radius: 16,
};


/** Switchable primary palettes — picked from the sidebar, blue is the default. */
export const ACCENT_KEYS = ["blue", "green", "red"] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

type AccentTokens = Pick<
  (typeof colors)["light"],
  "primary" | "tint" | "accent" | "accentForeground"
>;

export const ACCENTS: Record<
  AccentKey,
  { light: AccentTokens; dark: AccentTokens; swatch: string; gradient: [string, string] }
> = {
  green: {
    swatch: "#0f766e",
    gradient: ["#0F766E", "#34D399"],
    light: { primary: "#0f766e", tint: "#0f766e", accent: "#e6f4f1", accentForeground: "#115e59" },
    dark: { primary: "#2dd4bf", tint: "#2dd4bf", accent: "#123430", accentForeground: "#99f6e4" },
  },
  blue: {
    swatch: "#3057f2",
    gradient: ["#3057F2", "#38BDF8"],
    light: { primary: "#3057f2", tint: "#3057f2", accent: "#e8effe", accentForeground: "#2546c4" },
    dark: { primary: "#6b8af7", tint: "#6b8af7", accent: "#1e2a42", accentForeground: "#a5b8fc" },
  },
  red: {
    swatch: "#be123c",
    gradient: ["#BE123C", "#FB7185"],
    light: { primary: "#be123c", tint: "#be123c", accent: "#ffe4e6", accentForeground: "#9f1239" },
    dark: { primary: "#fb7185", tint: "#fb7185", accent: "#3f1d24", accentForeground: "#fecdd3" },
  },
};

export default colors;
