import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { PaymentProviderLogo } from "@/components/points/PaymentProviderLogo";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

export type PaymentMethodId = "credit_card";

interface PaymentMethodCardProps {
  id: PaymentMethodId;
  label: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function PaymentMethodCard({
  id,
  label,
  subtitle,
  onPress,
  disabled = false,
  loading = false,
}: PaymentMethodCardProps) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const dir = isRTL ? "row-reverse" : "row";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.card,
        {
          flexDirection: dir,
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: disabled || loading ? 0.65 : pressed ? 0.92 : hovered ? 0.98 : 1,
        },
      ]}
    >
      <View style={styles.logoSlot}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PaymentProviderLogo id={id} />
        )}
      </View>
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <Text style={[styles.label, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {label}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    cursor: "pointer" as "auto",
  },
  logoSlot: {
    flexShrink: 0,
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 18 },
});
