import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { isGuestAllowedRoot, isSignedInPublicRoot } from "@/domains/auth/guestBrowse";
import {
  navigatePostAuth,
  navigateToWelcome,
} from "@/domains/auth/navigation";
import { hydratePendingAuthReturn } from "@/domains/auth/pendingAuthReturn";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";

function isDoctorPendingApproval(
  role: string | null,
  status: string | null,
): boolean {
  return (
    role?.toLowerCase() === "doctor" &&
    (status === "pending" || status === "rejected")
  );
}

/** Guests may browse home/doctors; signed-in users are routed into the app. */
export function AuthRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const doctorApprovalStatus = useAuthStore((s) => s.doctorApprovalStatus);
  const signedIn = isSignedIn(profile, accessToken);

  useEffect(() => {
    void hydratePendingAuthReturn();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const root = segments[0] as string | undefined;
    const second = segments[1] as string | undefined;
    const authScreen = root === "auth" ? String(second ?? "") : "";
    // Password reset / forgot / verify must stay reachable even when a session exists.
    const isAuthUtilityRoute =
      authScreen === "forgot-password" ||
      authScreen === "reset-password" ||
      authScreen === "verify-email";
    const isAdminRoute = root === "admin";
    const isPendingRoute = root === "doctor-pending";

    if (!signedIn) {
      if (!isGuestAllowedRoot(root, second)) {
        if (Platform.OS === "web") {
          navigateToWelcome(router);
        } else {
          router.replace("/welcome");
        }
      }
      return;
    }

    if (isAuthUtilityRoute) {
      return;
    }

    if (isSignedInPublicRoot(root, second)) {
      return;
    }

    const isAdmin = role?.toLowerCase() === "admin";

    if (isAdmin) {
      const isChatRoute = root === "chat";
      if (!isAdminRoute && !isChatRoute) {
        router.replace("/admin");
      }
      return;
    }

    if (role?.toLowerCase() === "hospital") {
      if (root !== "hospital") {
        router.replace("/hospital");
      }
      return;
    }

    if (isDoctorPendingApproval(role, doctorApprovalStatus)) {
      if (!isPendingRoute) {
        router.replace("/doctor-pending");
      }
      return;
    }

    if (signedIn && (root === "welcome" || root === "auth")) {
      // Honors pending guest chat return (same helper as login/signup forms).
      navigatePostAuth(router, role, doctorApprovalStatus);
      return;
    }

    if (isAdminRoute) {
      router.replace("/(tabs)");
    }
  }, [
    hydrated,
    signedIn,
    segments,
    router,
    role,
    doctorApprovalStatus,
  ]);

  return null;
}
