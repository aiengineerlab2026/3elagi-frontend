/** Show the BETA pill beside the logo (set EXPO_PUBLIC_SHOW_BETA_BADGE=false to hide). */
export const SHOW_BETA_BADGE =
  process.env.EXPO_PUBLIC_SHOW_BETA_BADGE !== "false";

/** Shared logo heights for consistent branding across native and web. */
export const LOGO_HEIGHT = {
  /** Main tab header (native + web mobile). */
  header: 42,
  /** Desktop web sidebar. */
  sidebar: 40,
  /** Auth brand panel (login/signup desktop). */
  authPanel: 50,
  /** Welcome / marketing hero (desktop web). */
  welcomeDesktop: 76,
  /** Welcome top bar (tablet / mobile web). */
  welcomeBarTablet: 56,
  welcomeBarMobile: 48,
  /** Welcome centered logo (mobile web + native). */
  welcomeHero: 60,
} as const;
