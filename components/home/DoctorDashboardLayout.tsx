import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { UI } from "@/constants/uiTokens";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props {
  hero: React.ReactNode;
  queue: React.ReactNode;
}

/** Doctor dashboard — hero (metrics embedded left) + queue flush underneath. */
export function DoctorDashboardLayout({ hero, queue }: Props) {
  const { isDesktop } = useWebLayout();

  return (
    <View style={[styles.outer, isDesktop && styles.outerDesktop]}>
      <View style={styles.heroRow}>{hero}</View>
      <View style={[styles.queueBand, isDesktop && styles.queueBandDesktop]}>{queue}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    gap: UI.space.sm,
  },
  outerDesktop: Platform.select({
    web: { minHeight: "100%" } as object,
    default: {},
  }),
  heroRow: {
    width: "100%",
  },
  queueBand: {
    width: "100%",
    paddingHorizontal: UI.space.md,
    paddingBottom: UI.space.lg,
  },
  queueBandDesktop: Platform.select({
    web: { flex: 1, minHeight: "58vh", paddingTop: 0 } as object,
    default: { minHeight: 420, paddingTop: UI.space.xs },
  }),
});
