import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { recordAppVisit } from "@/domains/analytics/api";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";

/** Counts a home-tab visit when the user is signed in. */
export function useRecordAppVisit() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);

  useFocusEffect(
    useCallback(() => {
      if (!isSignedIn(profile, accessToken) || !accessToken) return;
      void recordAppVisit(accessToken);
    }, [accessToken, profile]),
  );
}
