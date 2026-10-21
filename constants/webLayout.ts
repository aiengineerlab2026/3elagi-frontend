export const WEB_BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export const WEB_MAX_WIDTH = {
  content: 1200,
  wide: 1400,
  stack: 960,
  auth: 640,
  chat: 980,
  profile: 1200,
} as const;

/** Shared horizontal padding for desktop content columns. */
export const WEB_CONTENT_PADDING = 24;

/** Gap between split dashboard panes (12-col grid gutter). */
export const WEB_DASHBOARD_GAP = 24;

/** Minimum height for the medical records split dashboard (both panes). */
export const WEB_DASHBOARD_MIN_HEIGHT = 560;

/** Viewport inset for floating action buttons on web desktop. */
export const WEB_FAB_INSET = 24;

/** Tab bar content row height on mobile web (matches `(tabs)/_layout.web`). */
export const WEB_MOBILE_TAB_BAR_HEIGHT = 60;

/** Native bottom tab bar row height, excluding the safe-area inset
 *  (matches `(tabs)/_layout`). Floating UI lifts by this to clear it. */
export const NATIVE_TAB_BAR_HEIGHT = 58;

/** Minimum top inset for tab page titles/logos on mobile web (below status bar). */
export const WEB_MOBILE_PAGE_TITLE_TOP_PADDING = 8;

/** Extra top inset for auth pages (login/signup) on mobile web. */
export const WEB_MOBILE_AUTH_EXTRA_TOP_PADDING = 8;

/** Extra bottom inset for auth pages on mobile web. */
export const WEB_MOBILE_AUTH_EXTRA_BOTTOM_PADDING = 32;

/** Extra bottom inset for signup on mobile web (long scrollable form). */
export const WEB_MOBILE_AUTH_SIGNUP_EXTRA_BOTTOM_PADDING = 48;

/** Extra top margin for login language flags on mobile web. */
export const WEB_MOBILE_AUTH_LOGIN_FLAGS_EXTRA_TOP_MARGIN = 8;

export function mobileWebTabBarHeight(bottomInset: number): number {
  return WEB_MOBILE_TAB_BAR_HEIGHT + Math.max(bottomInset, 8);
}

/** Top padding for mobile web page titles — respects safe area when available. */
export function mobileWebPageTitlePaddingTop(safeAreaTop: number): number {
  return Math.max(safeAreaTop, WEB_MOBILE_PAGE_TITLE_TOP_PADDING);
}
