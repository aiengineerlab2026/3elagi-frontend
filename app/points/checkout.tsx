import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";
import { PointsCheckoutView } from "@/components/points/PointsCheckoutView";
import { AppHeader } from "@/components/AppHeader";
import { View } from "react-native";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useColors } from "@/hooks/useColors";

export default function PointsCheckoutScreen() {
  const colors = useColors();
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader />
      <PointsCheckoutView amount={Math.floor(amount)} />
    </View>
  );
}
