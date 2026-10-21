import { ShieldCheck, Star, Users } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

export function PublicTrustSection() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const stats = [
    { icon: Users, value: t.landing.statDoctors, label: t.landing.statDoctorsLabel },
    { icon: Star, value: t.landing.statRating, label: t.landing.statRatingLabel },
    { icon: ShieldCheck, value: t.landing.statSecure, label: t.landing.statSecureLabel },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
        {t.landing.trustTitle}
      </Text>
      <View style={[styles.stats, isDesktop ? { flexDirection: dir } : styles.statsStack]}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.stat, surfaceCard(colors.card, colors.border), isDesktop && { flex: 1 }]}
          >
            <stat.icon size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground, textAlign }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, textAlign }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.quoteCard, surfaceCard(colors.card, colors.border), { backgroundColor: colors.accent }]}>
        <Text style={[styles.quote, { color: colors.foreground, textAlign }]}>
          “{t.landing.testimonialQuote}”
        </Text>
        <Text style={[styles.quoteAuthor, { color: colors.mutedForeground, textAlign }]}>
          {t.landing.testimonialAuthor}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 14,
  },
  title: {
    ...UI.type.section,
    fontSize: 20,
  },
  stats: {
    gap: UI.space.sm,
  },
  statsStack: {
    flexDirection: "column",
  },
  stat: {
    alignItems: "center",
    padding: UI.space.md,
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  quoteCard: {
    padding: UI.space.md,
    gap: 8,
  },
  quote: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: "italic",
  },
  quoteAuthor: {
    fontSize: 13,
    fontWeight: "600",
  },
});
