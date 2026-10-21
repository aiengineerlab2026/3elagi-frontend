import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { DOCTOR_APPLY_ROUTE } from "@/constants/doctorSignup";
import { router } from "expo-router";
import { Activity, CalendarClock, Coins, MessageSquare, ShieldCheck, Video } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { primaryButton, surfaceCard, UI } from "@/constants/uiTokens";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText } from "@/utils/rtl";

const FOR_DOCTORS_HERO = require("@/assets/images/for-doctors-hero.jpg");

const HERO_FLOATING_ICONS = [
  { key: "chat", Icon: MessageSquare, top: "10%", left: "6%" },
  { key: "video", Icon: Video, top: "16%", right: "5%" },
  { key: "pulse", Icon: Activity, bottom: "30%", left: "3%" },
  { key: "shield", Icon: ShieldCheck, bottom: "18%", right: "8%" },
] as const;

export default function ForDoctorsScreen() {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const { isDesktop, width } = useWebLayout();
  const textAlign = alignText(isRTL);
  const sideBySide = width >= 640;

  const perks = [
    { icon: Video, text: t.landing.forDoctorsPerk1 },
    { icon: CalendarClock, text: t.landing.forDoctorsPerk2 },
    { icon: Coins, text: t.landing.forDoctorsPerk3 },
    { icon: ShieldCheck, text: t.landing.forDoctorsPerk4 },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView
        nativeID={BRAND_SCROLL_NATIVE_ID}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        <View style={[styles.shell, isDesktop && { maxWidth: WEB_MAX_WIDTH.content, alignSelf: "center" }]}>
          <View style={[styles.hero, sideBySide && styles.heroSideBySide]}>
            <View style={[styles.visual, sideBySide && styles.visualDesktop]}>
              <Image
                source={FOR_DOCTORS_HERO}
                style={styles.heroImage}
                contentFit="cover"
                contentPosition="center"
                accessibilityLabel=""
              />
              <LinearGradient
                // Tint follows the active accent instead of fixed teal.
                colors={[
                  `${colors.primary}24`,
                  `${accentGradient[1]}47`,
                  `${colors.primary}1a`,
                ]}
                locations={[0, 0.45, 1]}
                style={styles.heroOverlay}
                pointerEvents="none"
              />
              <LinearGradient
                colors={["transparent", `${colors.background}88`, `${colors.background}dd`]}
                start={{ x: 0, y: 0.35 }}
                end={{ x: 1, y: 0.35 }}
                style={styles.heroOverlay}
                pointerEvents="none"
              />
              {sideBySide
                ? HERO_FLOATING_ICONS.map(({ key, Icon, ...pos }) => (
                    <View
                      key={key}
                      style={[
                        styles.floatIcon,
                        pos,
                        {
                          backgroundColor: `${colors.primary}22`,
                          borderColor: `${accentGradient[1]}59`,
                        },
                      ]}
                    >
                      <Icon size={18} color={colors.primary} strokeWidth={2.2} />
                    </View>
                  ))
                : null}
            </View>

            <View style={[styles.copy, sideBySide && styles.copyDesktop]}>
              <Text style={[styles.headline, { color: colors.foreground, textAlign }]}>
                {t.landing.forDoctorsHeadline}
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground, textAlign }]}>
                {t.landing.forDoctorsBody}
              </Text>
              <View style={[styles.ctaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Pressable
                  onPress={() => router.push(DOCTOR_APPLY_ROUTE)}
                  style={({ pressed }) => [
                    primaryButton(),
                    styles.cta,
                    {
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
                    {t.landing.registerWithUsCta}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={[styles.perksCard, surfaceCard(colors.card, colors.border)]}>
            {perks.map(({ icon: Icon, text }, index) => (
              <View key={text}>
                {index > 0 ? (
                  <View style={[styles.perkDivider, { backgroundColor: colors.border }]} />
                ) : null}
                <View style={styles.perkRow}>
                  <Text style={[styles.perkText, { color: colors.foreground, textAlign, flex: 1 }]}>
                    {text}
                  </Text>
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}12` }]}>
                    <Icon size={20} color={colors.primary} strokeWidth={2} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
  },
  shell: {
    width: "100%",
    gap: 20,
  },
  hero: {
    gap: 20,
  },
  heroSideBySide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 36,
  },
  visual: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: UI.radius.xl,
    overflow: "hidden",
    position: "relative",
    ...UI.shadowMd,
  },
  visualDesktop: {
    flex: 1.25,
    minWidth: 0,
    aspectRatio: 2.2,
    maxHeight: 280,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  floatIcon: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    // borderColor comes from the active accent.
    ...UI.shadow,
  },
  copy: {
    gap: 14,
    minWidth: 0,
  },
  copyDesktop: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 12,
    minWidth: 280,
    maxWidth: 440,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 480,
  },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 180,
  },
  ctaRow: {
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  ctaSecondary: {
    minWidth: 180,
    borderWidth: 1,
    borderRadius: UI.radius.inner,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "700",
  },
  perksCard: {
    paddingHorizontal: UI.space.md,
    paddingVertical: 6,
    borderRadius: UI.radius.xl,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  perkDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  perkText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
});
