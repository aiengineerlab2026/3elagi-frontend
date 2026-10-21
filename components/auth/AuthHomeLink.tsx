import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Home } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

/** Same ramp as the primary auth buttons. */
const BRAND_GRADIENT = ["#0F766E", "#34D399"] as const;

type Props = {
  /** Smaller type for the top bar; default is the footer size. */
  compact?: boolean;
};

/**
 * "Home" escape hatch on the auth screens, styled as a link: brand-blue label
 * over a gradient underline. Text itself cannot carry a gradient without a
 * masked-view dependency, so the rule does the job.
 */
export function AuthHomeLink({ compact = false }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const fontSize = compact ? 14 : 15;

  return (
    <Pressable
      onPress={() => router.replace("/(tabs)")}
      accessibilityRole="link"
      accessibilityLabel={t.tabs.home}
      hitSlop={8}
      style={styles.pressable}
    >
      {({ pressed }: { pressed: boolean }) => (
        <View style={[styles.inner, pressed && styles.pressed]}>
          <View style={[styles.labelRow, { flexDirection: flexRow(isRTL) }]}>
            <Home size={fontSize + 2} color={colors.primary} />
            <Text style={[styles.label, { color: colors.primary, fontSize }]}>
              {t.tabs.home}
            </Text>
          </View>
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.underline}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: "pointer" as "auto",
  },
  inner: { alignItems: "center" },
  labelRow: { alignItems: "center", gap: 6 },
  pressed: { opacity: 0.65 },
  label: { fontWeight: "800", letterSpacing: 0.2 },
  underline: {
    height: 2,
    borderRadius: 2,
    alignSelf: "stretch",
    marginTop: 3,
  },
});
