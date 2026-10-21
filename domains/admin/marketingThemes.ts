/** Keep in sync with 3eyadahub-api/src/mail/marketing-email-themes.ts */
export const MARKETING_EMAIL_THEMES = ["blue", "green", "red"] as const;
export type MarketingEmailTheme = (typeof MARKETING_EMAIL_THEMES)[number];

export const DEFAULT_MARKETING_EMAIL_THEME: MarketingEmailTheme = "blue";

type ThemePalette = {
  brand: string;
  gradientEnd: string;
  brandDark: string;
  tint: string;
  tintSoft: string;
  highlightBorder: string;
};

export const MARKETING_THEME_PALETTES: Record<
  MarketingEmailTheme,
  ThemePalette
> = {
  blue: {
    brand: "#2563EB",
    gradientEnd: "#3B82F6",
    brandDark: "#1D4ED8",
    tint: "#EFF6FF",
    tintSoft: "#F8FAFC",
    highlightBorder: "#BFDBFE",
  },
  green: {
    brand: "#0F766E",
    gradientEnd: "#34D399",
    brandDark: "#115E59",
    tint: "#E6F4F1",
    tintSoft: "#F0FDFA",
    highlightBorder: "#99F6E4",
  },
  red: {
    brand: "#BE123C",
    gradientEnd: "#FB7185",
    brandDark: "#9F1239",
    tint: "#FFE4E6",
    tintSoft: "#FFF1F2",
    highlightBorder: "#FECDD3",
  },
};

export const MARKETING_THEME_LABELS: Record<MarketingEmailTheme, string> = {
  blue: "Blue",
  green: "Green",
  red: "Red",
};

/** Swap palette colors in edited HTML when the admin picks another theme. */
export function rethemeMarketingBodyHtml(
  html: string,
  theme: MarketingEmailTheme,
): string {
  let out = html;
  const target = MARKETING_THEME_PALETTES[theme];
  for (const palette of Object.values(MARKETING_THEME_PALETTES)) {
    if (palette === target) continue;
    for (const key of Object.keys(target) as (keyof ThemePalette)[]) {
      out = out.split(palette[key]).join(target[key]);
    }
  }
  return out;
}
