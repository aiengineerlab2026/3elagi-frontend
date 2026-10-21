import type { Router } from "expo-router";
import { isAiChatWebPath, isNormalChatWebPath } from "@/constants/webAppPaths";
import { canNavigateBack, navigateBack } from "@/utils/appNavigation";
import { leaveChatToHistory } from "@/utils/chatNavigation";
import { leaveMedicalForm } from "@/utils/medicalFormNavigation";

function normalizePathname(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return path.startsWith("/") ? path : `/${path}`;
}

export function isNormalChatPath(pathname: string): boolean {
  return isNormalChatWebPath(normalizePathname(pathname));
}

export function isAiChatPath(pathname: string): boolean {
  return isAiChatWebPath(normalizePathname(pathname));
}

/**
 * Resolve the action for hardware / mobile back on the current route.
 * Returns null when the default OS behavior should run (i.e. exit the app).
 *
 * Order matters: real navigation history wins, so back retraces the pages the
 * user actually visited. The per-route destinations below are only fallbacks
 * for when there is no history to pop — a chat opened straight from a push
 * notification, for instance.
 */
export function getHardwareBackAction(
  pathname: string,
  router: Pick<Router, "back" | "replace" | "canGoBack">,
): (() => void) | null {
  const path = normalizePathname(pathname);

  if (canNavigateBack(router)) {
    return () => {
      navigateBack(router);
    };
  }

  if (isNormalChatPath(path)) {
    const origin = /[?&]from=([^&]+)/.exec(pathname)?.[1];
    return () => leaveChatToHistory(origin ? decodeURIComponent(origin) : null);
  }

  if (isAiChatPath(path)) {
    return () => {
      navigateBack(router, "/(tabs)/assistant");
    };
  }

  if (path.includes("/medical/add") || path.includes("/prescription/add")) {
    return () => leaveMedicalForm();
  }

  if (path.includes("/points/checkout")) {
    return () => {
      navigateBack(router, "/(tabs)/points");
    };
  }

  if (path.includes("/doctor/")) {
    return () => {
      navigateBack(router, "/(tabs)");
    };
  }

  if (path.includes("/patients/")) {
    return () => {
      navigateBack(router, "/(tabs)/history");
    };
  }

  if (path.includes("/contact") || path.includes("/register-with-us") || path.includes("/rate-us")) {
    return () => {
      navigateBack(router, "/(tabs)");
    };
  }

  // Nothing left in history and no route-specific home to fall back to:
  // hand back to the OS, which closes the app.
  return null;
}
