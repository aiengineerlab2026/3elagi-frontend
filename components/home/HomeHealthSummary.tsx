import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { ClipboardList, MessageSquare, Receipt, Video } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useAuthStore } from "@/domains/auth/store";
import { fetchMyAppointments } from "@/domains/appointments/api";
import { countUpcomingVideoCalls } from "@/domains/appointments/upcomingVideoCalls";
import { fetchPatientConsultations } from "@/domains/consultations/api";
import {
  formatPaidTotals,
  paidConsultationTotals,
} from "@/domains/consultations/paidTotals";
import { useMedicalStore } from "@/domains/medical/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

interface Props {
  signedIn: boolean;
}

export function HomeHealthSummary({ signedIn }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const records = useMedicalStore((s) => s.records);
  const accessToken = useAuthStore((s) => s.accessToken);
  const recordCount = records.length;
  const [openConsultations, setOpenConsultations] = useState(0);
  const [paidTotal, setPaidTotal] = useState("0");
  const [upcomingVideoCalls, setUpcomingVideoCalls] = useState(0);

  const loadOpenConsultations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await fetchPatientConsultations(accessToken);
      setOpenConsultations(list.filter((c) => c.status === "open").length);
      setPaidTotal(formatPaidTotals(paidConsultationTotals(list)));
    } catch {
      // Keep the last count if refresh fails.
    }
  }, [accessToken]);

  const loadUpcomingVideoCalls = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await fetchMyAppointments(accessToken);
      setUpcomingVideoCalls(countUpcomingVideoCalls(list));
    } catch {
      // Keep the last count if refresh fails.
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      void loadOpenConsultations();
      void loadUpcomingVideoCalls();
    }, [signedIn, loadOpenConsultations, loadUpcomingVideoCalls]),
  );

  if (!signedIn) {
    return (
      <View style={[styles.wrap, surfaceCard(colors.card, colors.border), { marginHorizontal: 16 }]}>
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {t.home.healthSummary}
        </Text>
        <Text style={[styles.guestHint, { color: colors.mutedForeground, textAlign }]}>
          {t.home.healthSummaryGuest}
        </Text>
      </View>
    );
  }

  const stats = [
    {
      key: "records",
      label: t.home.recordsStat,
      value: String(recordCount),
      icon: ClipboardList,
      onPress: () => router.push("/(tabs)/records"),
    },
    {
      key: "consultations-paid",
      label: t.home.consultationsPaidStat,
      value: paidTotal,
      icon: Receipt,
      onPress: () => router.push("/(tabs)/consultations"),
    },
    {
      key: "consultations",
      label: t.home.consultationsStat,
      value: String(openConsultations),
      icon: MessageSquare,
      onPress: () =>
        router.push({ pathname: "/(tabs)/consultations", params: { status: "open" } }),
    },
    {
      key: "video-calls",
      label: t.home.upcomingVideoCallsStat,
      value: String(upcomingVideoCalls),
      icon: Video,
      onPress: () => router.push("/(tabs)/appointments"),
    },
  ];

  return (
    <View style={[styles.wrap, surfaceCard(colors.card, colors.border), { marginHorizontal: 16 }]}>
      <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
        {t.home.healthSummary}
      </Text>
      <View style={[styles.grid, isDesktop ? { flexDirection: dir } : styles.gridStack]}>
        {stats.map((stat) => (
          <Pressable
            key={stat.key}
            onPress={stat.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.stat,
              {
                backgroundColor: colors.muted,
                opacity: pressed ? 0.9 : 1,
                flex: isDesktop ? 1 : undefined,
              },
            ]}
          >
            <View style={[styles.statHead, { flexDirection: dir }]}>
              <stat.icon size={16} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.mutedForeground, textAlign }]}>
                {stat.label}
              </Text>
            </View>
            <Text style={[styles.statValue, { color: colors.foreground, textAlign }]}>
              {stat.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: UI.space.md,
    gap: UI.space.sm,
    marginBottom: UI.space.sm,
  },
  title: {
    ...UI.type.section,
    fontSize: 16,
  },
  guestHint: {
    ...UI.type.subtitle,
    fontSize: 13,
  },
  grid: {
    gap: UI.space.sm,
  },
  gridStack: {
    flexDirection: "column",
  },
  stat: {
    borderRadius: UI.radius.inner,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    minWidth: 0,
  },
  statHead: {
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    ...UI.type.meta,
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
});
