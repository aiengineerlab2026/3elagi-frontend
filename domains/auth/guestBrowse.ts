import { useGuestAuthDialogStore } from "@/domains/auth/guestAuthDialogStore";

/** Tab segments guests may open without signing in. */
export const GUEST_ALLOWED_TABS = new Set([
  "index",
  "about-us",
  "assistant",
  "faq",
  "for-doctors",
  "documentation",
]);

/** Root segments guests may open (browse + auth + marketing). */
export function isGuestAllowedRoot(
  root: string | undefined,
  tabSegment?: string,
): boolean {
  if (
    root === undefined ||
    root === "welcome" ||
    root === "auth" ||
    root === "contact" ||
    root === "register-with-us" ||
    root === "rate-us" ||
    root === "documentation" ||
    root === "demo" ||
    // Doctor directory: browsing is public, starting a consultation still prompts.
    root === "doctors" ||
    // Per-speciality roster deep links (/speciality/cardiology, /specialties/…).
    root === "speciality" ||
    root === "specialties"
  ) {
    return true;
  }
  // Public doctor profile only — not doctor tooling routes.
  if (root === "doctor") {
    return !!tabSegment && tabSegment !== "intake-exams";
  }
  if (root === "(tabs)") {
    if (!tabSegment || tabSegment === "index") return true;
    return GUEST_ALLOWED_TABS.has(tabSegment);
  }
  return false;
}

/** Marketing / support pages that stay reachable after sign-in (email links, sidebar). */
export function isSignedInPublicRoot(
  root: string | undefined,
  tabSegment?: string,
): boolean {
  if (root === "(tabs)" && tabSegment && GUEST_ALLOWED_TABS.has(tabSegment)) {
    return tabSegment !== "index";
  }
  return (
    root === "contact" ||
    root === "register-with-us" ||
    root === "rate-us" ||
    root === "documentation" ||
    root === "demo"
  );
}

/**
 * Prompt guests to log in / sign up (design-system dialog).
 * Pass `returnTo` (e.g. `/chat/:userId`) to resume that screen after auth.
 */
export function promptAuthForConsultation(returnTo?: string | null): void {
  useGuestAuthDialogStore.getState().open(returnTo ?? null);
}
