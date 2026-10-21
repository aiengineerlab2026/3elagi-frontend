import { router, type Href, type Router } from "expo-router";

type NavRouter = Pick<Router, "back" | "replace" | "canGoBack">;

/** True when the navigation stack has a previous entry to pop. */
export function canNavigateBack(r: NavRouter = router): boolean {
  return typeof r.canGoBack === "function" && r.canGoBack();
}

/**
 * Pop to the previous pushed screen.
 * If there is no previous entry and `fallback` is set, replace to that route.
 * Returns whether navigation happened.
 */
export function navigateBack(
  r: NavRouter = router,
  fallback?: Href,
): boolean {
  if (canNavigateBack(r)) {
    r.back();
    return true;
  }
  if (fallback != null) {
    r.replace(fallback as never);
    return true;
  }
  return false;
}
