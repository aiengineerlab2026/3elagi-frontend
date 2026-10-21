import { CalendarClock, MessageSquare, Video } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

export function PublicHowItWorksSection() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const steps = [
    { icon: MessageSquare, title: t.landing.step1Title, body: t.landing.step1Body },
    { icon: Video, title: t.landing.step2Title, body: t.landing.step2Body },
    { icon: CalendarClock, title: t.landing.step3Title, body: t.landing.step3Body },
  ];

  return (
    <View style={[styles.wrap, surfaceCard(colors.card, colors.border), { marginHorizontal: 16 }]}>
      <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
        {t.landing.howItWorksTitle}
      </Text>
      <View style={[styles.grid, isDesktop ? { flexDirection: dir } : styles.gridStack]}>
        {steps.map((step, index) => (
          <View
            key={step.title}
            style={[
              styles.step,
              // Badge + icon follow the text side; without this they stay left
              // while Arabic copy is right-aligned.
              { alignItems: isRTL ? "flex-end" : "flex-start" },
              isDesktop && { flex: 1 },
            ]}
          >
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
              <step.icon size={20} color={colors.primary} />
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground, textAlign }]}>
              {step.title}
            </Text>
            <Text style={[styles.stepBody, { color: colors.mutedForeground, textAlign }]}>
              {step.body}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: UI.space.md,
    gap: UI.space.md,
    marginVertical: 8,
  },
  title: {
    ...UI.type.section,
    fontSize: 20,
  },
  grid: {
    gap: UI.space.md,
  },
  gridStack: {
    flexDirection: "column",
  },
  step: {
    gap: 8,
    paddingVertical: 4,
    minWidth: 0,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
