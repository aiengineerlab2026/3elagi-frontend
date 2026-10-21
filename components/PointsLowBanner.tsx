import { Coins } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

interface Props {
  balance: number;
  messageCost?: number;
}

export function PointsLowBanner({ balance, messageCost = 1 }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);

  if (balance >= 10) return null;

  const text =
    balance < 1
      ? t.credits.lowBalanceNone
      : t.credits.lowBalanceSome(balance, messageCost);

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/points")}
      style={[styles.wrap, { flexDirection: dir, backgroundColor: `${colors.primary}12` }]}
    >
      <Coins size={16} color={colors.primary} />
      <Text style={[styles.text, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
