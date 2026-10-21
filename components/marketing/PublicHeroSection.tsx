import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TvFramedVideo } from "@/components/marketing/TvFramedVideo";
import { primaryButton, secondaryButton, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

interface Props {
  /** Optional overrides; both CTAs land on the doctor directory by default. */
  onGetStarted?: () => void;
  onBrowseDoctors?: () => void;
  /** Desktop inline media in the two-column hero; off on mobile (see PublicHeroMediaSection). */
  showMedia?: boolean;
}

export function PublicHeroSection({
  onGetStarted,
  onBrowseDoctors,
  showMedia = true,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const showVisual = showMedia && isDesktop;
  const openDirectory = () => router.push("/doctors");

  return (
    <View style={[styles.shell, isDesktop && styles.shellDesktop]}>
      <View
        style={[
          styles.wrap,
          isDesktop && styles.wrapDesktop,
          isDesktop && { flexDirection: dir },
        ]}
      >
        <View style={[styles.copy, isDesktop && styles.copyDesktop]}>
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.badgeText, { color: colors.accentForeground, textAlign }]}>
              {t.landing.heroBadge}
            </Text>
          </View>
          <Text style={[styles.headline, { color: colors.foreground, textAlign }]}>
            {t.landing.heroHeadline}
          </Text>
          <Text style={[styles.subheadline, { color: colors.mutedForeground, textAlign }]}>
            {t.landing.heroSubheadline}
          </Text>
          <View style={[styles.ctaRow, { flexDirection: dir }]}>
            <Pressable
              onPress={onGetStarted ?? openDirectory}
              style={({ pressed }) => [
                primaryButton(),
                styles.primaryCta,
                { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <Text style={[styles.primaryCtaText, { color: colors.primaryForeground }]}>
                {t.landing.heroPrimaryCta}
              </Text>
            </Pressable>
            <Pressable
              onPress={onBrowseDoctors ?? openDirectory}
              style={({ pressed }) => [
                secondaryButton(colors.border, colors.card),
                styles.secondaryCta,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={[styles.secondaryCtaText, { color: colors.foreground }]}>
                {t.landing.heroSecondaryCta}
              </Text>
            </Pressable>
          </View>
          <View style={[styles.trustRow, { flexDirection: dir }]}>
            {t.landing.heroTrustPoints.map((point) => (
              <View key={point} style={[styles.trustPill, { backgroundColor: colors.muted }]}>
                <Text style={[styles.trustText, { color: colors.foreground, textAlign }]}>
                  {point}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {showVisual ? (
          <View style={styles.visual}>
            <TvFramedVideo />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  shellDesktop: {
    marginTop: 16,
    marginBottom: 32,
  },
  wrap: {
    gap: 24,
  },
  wrapDesktop: {
    alignItems: "center",
    gap: 64,
  },
  copy: {
    flex: 1,
    gap: 14,
    minWidth: 0,
    justifyContent: "center",
  },
  // 5 of 12 columns — narrow enough to keep line length readable.
  copyDesktop: {
    flex: 5,
    minWidth: 300,
    paddingVertical: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: UI.radius.chip,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  subheadline: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
  },
  ctaRow: {
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  primaryCta: {
    paddingHorizontal: 22,
    minWidth: 180,
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryCta: {
    paddingHorizontal: 20,
    minWidth: 160,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: "600",
  },
  trustRow: {
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  trustPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: UI.radius.chip,
  },
  trustText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // 7 of 12 columns — the TV set sizes itself off this column's width.
  visual: {
    flex: 7,
    minWidth: 380,
  },
});
