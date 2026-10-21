import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { isDemoSlot } from "@/constants/demo";
import {
  persistDemoSlot,
  readDemoSlotFromPathname,
} from "@/domains/auth/demoSession";
import { ensureDemoEmbedTokenAuthMode } from "@/domains/auth/http";
import { getPostAuthRoute } from "@/domains/auth/navigation";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useColors } from "@/hooks/useColors";

if (typeof window !== "undefined") {
  const slot = readDemoSlotFromPathname(window.location.pathname);
  if (slot) {
    persistDemoSlot(slot);
    ensureDemoEmbedTokenAuthMode();
  }
}

/** Isolated demo iframe — sign in / sign up, then enter the normal app. */
export default function DemoEmbedScreen() {
  const colors = useColors();
  const { slot: slotParam } = useLocalSearchParams<{ slot?: string | string[] }>();
  const slotRaw = Array.isArray(slotParam) ? slotParam[0] : slotParam;
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const doctorApprovalStatus = useAuthStore((s) => s.doctorApprovalStatus);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);

  useEffect(() => {
    if (slotRaw && isDemoSlot(slotRaw)) {
      persistDemoSlot(slotRaw);
    }
  }, [slotRaw]);

  useEffect(() => {
    if (!hydrated) return;
    if (signedIn) {
      router.replace(getPostAuthRoute(role, doctorApprovalStatus));
      return;
    }
    router.replace("/welcome");
  }, [hydrated, signedIn, role, doctorApprovalStatus]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
