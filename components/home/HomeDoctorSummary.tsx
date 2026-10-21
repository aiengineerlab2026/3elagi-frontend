import { router } from "expo-router";
import { CalendarClock, Bell, Users, Video } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { DASHBOARD_INDIGO } from "@/constants/dashboardTheme";
import { surfaceCard, UI } from "@/constants/uiTokens";
import type { DoctorDashboardMetrics } from "@/hooks/useDoctorDashboard";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

interface Props {
  metrics: DoctorDashboardMetrics;
  /** `card` = full-width section; `inHero` = under quick actions in the hero column. */
  variant?: "card" | "embedded" | "inHero";
}

export function HomeDoctorSummary({ metrics, variant = "card" }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const embedded = variant === "embedded";
  const inHero = variant === "inHero";

  const stats = [
    {
      key: "video-calls",
      label: t.doctorDashboard.upcomingVideoCalls,
      value: String(metrics.upcomingVideoCalls),
      icon: Video,
      onPress: () => router.push("/(tabs)/appointments"),
    },
    {
      key: "appointments",
      label: t.doctorDashboard.appointmentsToday,
      value: String(metrics.appointmentsToday),
      icon: CalendarClock,
      onPress: () => router.push("/(tabs)/appointments"),
    },
    {
      key: "consultations",
      label: t.doctorDashboard.activeConsultations,
      value: String(metrics.openConsultations),
      icon: Users,
      onPress: () => router.push("/(tabs)/consultations"),
    },
    {
      key: "notifications",
      label: t.doctorDashboard.unreadNotifications,
      value: String(metrics.unreadNotifications),
      icon: Bell,
      onPress: () => router.push("/(tabs)/notifications"),
    },
  ];

  const grid = (
    <View
      style={[
        styles.grid,
        isDesktop && !embedded && !inHero ? { flexDirection: dir } : styles.gridStack,
        (embedded || inHero) && [styles.gridEmbedded, { flexDirection: dir }],
      ]}
    >
      {stats.map((stat) => (
        <Pressable
          key={stat.key}
          onPress={stat.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.stat,
            (embedded || inHero) && styles.statEmbedded,
            {
              backgroundColor: embedded || inHero ? `${DASHBOARD_INDIGO}08` : colors.muted,
              borderColor: embedded || inHero ? `${DASHBOARD_INDIGO}20` : "transparent",
              opacity: pressed ? 0.9 : 1,
              flex: isDesktop && !inHero ? 1 : undefined,
            },
          ]}
        >
          <View style={[styles.statHead, { flexDirection: dir }]}>
            <stat.icon size={14} color={DASHBOARD_INDIGO} />
            <Text
              style={[styles.statLabel, { color: colors.mutedForeground, textAlign }]}
              numberOfLines={2}
            >
              {stat.label}
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.foreground, textAlign }]} numberOfLines={1}>
            {stat.value}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  if (embedded) {
    return grid;
  }

  if (inHero) {
    return (
      <View
        style={[
          styles.wrapInHero,
          surfaceCard(colors.card, colors.border),
          { backgroundColor: colors.card },
          Platform.select({
            web: { boxShadow: "0 1px 3px rgba(79,70,229,0.06), inset 0 0 0 1px rgba(79,70,229,0.08)" },
            default: { borderWidth: 1, borderColor: colors.border },
          }),
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {t.doctorDashboard.metricsSummary}
        </Text>
        {grid}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        surfaceCard(colors.card, colors.border),
        { marginHorizontal: 16 },
        Platform.select({
          web: { boxShadow: "0 1px 3px rgba(79,70,229,0.06), inset 0 0 0 1px rgba(79,70,229,0.08)" },
          default: {},
        }),
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
        {t.doctorDashboard.metricsSummary}
      </Text>
      {grid}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 6,
  },
  wrapInHero: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderRadius: UI.radius.card,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  grid: {
    gap: 6,
  },
  gridStack: {
    flexDirection: "column",
  },
  gridEmbedded: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  stat: {
    borderRadius: UI.radius.inner,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
    minWidth: 0,
  },
  statEmbedded: {
    flexBasis: "48%",
    flexGrow: 1,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statHead: {
    alignItems: "center",
    gap: 5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
