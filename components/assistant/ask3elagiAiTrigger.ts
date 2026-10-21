import { Platform } from "react-native";
import { isDemoEmbedPath } from "@/domains/auth/demoSession";

export const ASK_3ELAGI_AI_RED = "#e11d48";
export const ASK_3ELAGI_AI_RED_HOVER = "#be123c";
export const ASK_3ELAGI_AI_RED_ACTIVE = "#9f1239";

/** Desktop / tablet web: trigger lives in the left sidebar instead of a floating FAB. */
export function ask3elagiAiTriggerInSidebar(isTablet: boolean): boolean {
  return Platform.OS === "web" && isTablet;
}

export function shouldHideAsk3elagiAiOnRoute(
  pathname: string | null,
  segments: string[],
): boolean {
  const root = segments[0];
  if (!root || root === "welcome" || root === "auth") return true;
  if (root === "admin") return true;
  if (root === "video-call") return true;
  if (root === "doctor-pending") return true;
  if (pathname === "/demo") return true;
  if (pathname && isDemoEmbedPath(pathname)) return true;
  if (pathname?.includes("/assistant") || segments.includes("assistant")) {
    return true;
  }
  return false;
}

/** Doctor patient profile route → scope AI to that patient. */
export function patientUserIdFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/\/patients\/([0-9a-fA-F-]{36})(?:\/|$)/);
  return match?.[1] ?? null;
}
