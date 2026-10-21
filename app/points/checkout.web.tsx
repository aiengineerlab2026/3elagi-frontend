import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";
import { PointsCheckoutView } from "@/components/points/PointsCheckoutView";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";

export default function PointsCheckoutWebScreen() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { amount: rawAmount } = useLocalSearchParams<{ amount?: string }>();
  const amount = Number(Array.isArray(rawAmount) ? rawAmount[0] : rawAmount);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  if (!Number.isFinite(amount) || amount < 1) {
    return <Redirect href="/(tabs)/points" />;
  }

  return (
    <WebDesktopShell>
      <PointsCheckoutView amount={Math.floor(amount)} desktopLayout />
    </WebDesktopShell>
  );
}
