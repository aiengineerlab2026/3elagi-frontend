import { Platform } from "react-native";
import type { Href, Router } from "expo-router";
import {
  clearPendingAuthReturn,
  consumePendingAuthReturn,
} from "@/domains/auth/pendingAuthReturn";
import { GUEST_ALLOWED_TABS } from "@/domains/auth/guestBrowse";
import type { DoctorApprovalStatus } from "./types";

const WELCOME_ROUTE = "/welcome" as const;
const MAIN_ROUTE = "/(tabs)" as const;

type ForcedPostAuthRoute = "/admin" | "/doctor-pending" | "/hospital";

/** Prevent login form + AuthRedirect from racing to different destinations. */
let lockedPostAuthHref: Href | undefined;

function getForcedPostAuthRoute(
  role: string | null,
  doctorApprovalStatus: DoctorApprovalStatus | null,
): ForcedPostAuthRoute | null {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "admin") {
    return "/admin";
  }
  if (normalizedRole === "hospital") {
    return "/hospital";
  }
  if (
    normalizedRole === "doctor" &&
    (doctorApprovalStatus === "pending" || doctorApprovalStatus === "rejected")
  ) {
    return "/doctor-pending";
  }
  return null;
}

/** Resolve post-auth destination (consumes pending guest return once). */
export function getPostAuthRoute(
  role: string | null,
  doctorApprovalStatus: DoctorApprovalStatus | null,
): Href {
  if (lockedPostAuthHref !== undefined) return lockedPostAuthHref;

  const forced = getForcedPostAuthRoute(role, doctorApprovalStatus);
  if (forced) {
    clearPendingAuthReturn();
    lockedPostAuthHref = forced;
  } else {
    const pending = consumePendingAuthReturn();
    lockedPostAuthHref = (pending as Href | null) ?? MAIN_ROUTE;
  }

  const dest = lockedPostAuthHref;
  setTimeout(() => {
    lockedPostAuthHref = undefined;
  }, 1500);
  return dest;
}

/**
 * After login: same destinations as signup; honors pending guest chat return.
 */
export function getPostLoginRoute(
  role: string | null,
  doctorApprovalStatus: DoctorApprovalStatus | null,
): Href {
  return getPostAuthRoute(role, doctorApprovalStatus);
}

/** Navigate after auth; safe to call from form + AuthRedirect together. */
export function navigatePostAuth(
  router: Pick<Router, "replace">,
  role: string | null,
  doctorApprovalStatus: DoctorApprovalStatus | null,
): void {
  router.replace(getPostAuthRoute(role, doctorApprovalStatus));
}

/** Landing page after logout — main home browse (not welcome). */
export function getPostLogoutRoute(): "/(tabs)" {
  return MAIN_ROUTE;
}

/** Paths guests may stay on (browse + welcome + auth flows). */
export function isPublicWebPath(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === WELCOME_ROUTE ||
    pathname.startsWith(`${WELCOME_ROUTE}/`) ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/doctor/") ||
    // Doctor directory (note: distinct from the /doctor/ profile route above).
    pathname === "/doctors" ||
    pathname.startsWith("/doctors/") ||
    pathname.startsWith("/speciality/") ||
    pathname.startsWith("/specialties/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname === "/register-with-us" ||
    pathname.startsWith("/register-with-us/") ||
    pathname === "/rate-us" ||
    pathname.startsWith("/rate-us/") ||
    pathname === "/demo" ||
    pathname.startsWith("/demo/")
  ) {
    return true;
  }
  // Guest browse tabs. Keep in step with GUEST_ALLOWED_TABS — this is the
  // path-based twin used on web, and a tab missing here bounces guests back to
  // the welcome page, which looks like the nav link doing nothing.
  const guestTabs = [...GUEST_ALLOWED_TABS].filter((tab) => tab !== "index");
  if (pathname === "/(tabs)") return true;
  if (
    guestTabs.some(
      (tab) =>
        pathname === `/${tab}` ||
        pathname.startsWith(`/${tab}/`) ||
        pathname.startsWith(`/(tabs)/${tab}`),
    )
  ) {
    return true;
  }
  // Expo Router may expose home as bare "/" under tabs already covered above.
  return false;
}

/** Navigate to main home after logout; retries on web when router.replace is dropped. */
export function navigateToWelcome(router: Pick<Router, "replace">): void {
  const dest = getPostLogoutRoute();
  router.replace(dest);

  if (Platform.OS !== "web" || typeof window === "undefined") return;

  const ensureHome = () => {
    if (isPublicWebPath(window.location.pathname)) return;
    router.replace(dest);
  };

  queueMicrotask(ensureHome);
  window.setTimeout(ensureHome, 0);
  window.setTimeout(() => {
    if (!isPublicWebPath(window.location.pathname)) {
      window.location.replace("/");
    }
  }, 100);
}
