import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  online: boolean;
  onCall?: boolean;
  immediateCallEnabled?: boolean;
  compact?: boolean;
};

export function DoctorAvailabilityBadge({
  online,
  onCall = false,
  immediateCallEnabled = false,
  compact = false,
}: Props) {
  const colors = useColors();
  const { t } = useI18n();

  let tint = colors.mutedForeground;
  let bg = colors.muted;
  let label = t.home.offline;

  if (online) {
    if (immediateCallEnabled) {
      tint = onCall ? "#ef4444" : colors.success;
      bg = `${tint}14`;
      label = onCall ? t.auth.doctorOnCall : t.auth.doctorAvailableNow;
    } else {
      tint = colors.success;
      bg = `${colors.success}14`;
      label = t.home.online;
    }
  }

  return (
    <View style={[styles.badge, compact && styles.badgeCompact, { backgroundColor: bg }]}>
      <View style={[styles.dot, compact && styles.dotCompact, { backgroundColor: tint }]} />
      <Text style={[styles.text, compact && styles.textCompact, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: "100%",
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotCompact: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
  textCompact: {
    fontSize: 10,
  },
});
