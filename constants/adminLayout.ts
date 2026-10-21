import { WEB_BREAKPOINTS } from "@/constants/webLayout";

/** Admin sidebar layout — matches useWebLayout tablet breakpoint. */
export const ADMIN_MOBILE_MAX_WIDTH = WEB_BREAKPOINTS.tablet - 1;

export function adminPagePadding(compact: boolean): number {
  return compact ? 16 : 28;
}

export function adminContentMaxWidth(compact: boolean): number | undefined {
  return compact ? undefined : 960;
}
