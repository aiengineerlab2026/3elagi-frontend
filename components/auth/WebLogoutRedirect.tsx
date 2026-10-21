import { usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { isPublicWebPath, navigateToWelcome } from "@/domains/auth/navigation";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { on } from "@/utils/eventBus";

/** After logout on web, leave protected screens; keep welcome + auth routes. */
export function WebLogoutRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    return on(AUTH_EVENTS.LOGOUT, () => {
      navigateToWelcome(router);
    });
  }, [router]);

  useEffect(() => {
    // Guests on /auth/* (forgot/reset password, login) must not be bounced to welcome.
    if (Platform.OS !== "web" || !hydrated || signedIn || isPublicWebPath(pathname)) {
      return;
    }
    navigateToWelcome(router);
  }, [hydrated, signedIn, pathname, router]);

  return null;
}
