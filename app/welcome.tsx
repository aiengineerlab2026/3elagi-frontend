import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelcomeLoginForm } from "@/components/auth/WelcomeLoginForm";
import { WelcomeSignupForm } from "@/components/auth/WelcomeSignupForm";
import type { GoogleNoAccountPayload } from "@/domains/auth/googleAuthFlow";
import { Logo3elagi } from "@/components/Logo3elagi";
import { useAccentGradient, useColors, useResolvedTheme } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

const WELCOME_HERO_MOBILE = require("@/assets/images/welcome-hero-mobile.jpg");

type WelcomePanel = "home" | "login" | "signup";

export default function WelcomeScreen() {
  const colors = useColors();
  const isDark = useResolvedTheme() === "dark";
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * 0.82);
  const { panel: panelParam } = useLocalSearchParams<{ panel?: string | string[] }>();
  const logoHeight = Math.min(64, screenWidth * 0.18);
  const [panel, setPanel] = useState<WelcomePanel>("home");
  const [googlePrefill, setGooglePrefill] = useState<GoogleNoAccountPayload | null>(null);
  const showForm = panel !== "home";

  useEffect(() => {
    const raw = Array.isArray(panelParam) ? panelParam[0] : panelParam;
    if (raw === "login" || raw === "signup") {
      setPanel(raw);
    }
  }, [panelParam]);

  const handleGoogleNoAccount = (payload: GoogleNoAccountPayload) => {
    setGooglePrefill(payload);
    setPanel("signup");
  };

  const formTitle =
    panel === "login" ? t.auth.logIn : panel === "signup" ? t.auth.register : "";

  return (
    <View style={styles.root}>
      <Image
        source={WELCOME_HERO_MOBILE}
        style={styles.background}
        contentFit="cover"
        contentPosition="top center"
        accessibilityLabel=""
      />

      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,255,255,0)",
          "rgba(238,244,252,0.2)",
          "rgba(255,255,255,0.5)",
        ]}
        locations={[0, 0.45, 0.72, 1]}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View
        style={[
          styles.page,
          showForm && styles.pageForm,
          {
            paddingBottom: showForm ? insets.bottom + 12 : insets.bottom + 8,
          },
        ]}
      >
        <View
          style={[
            styles.topBar,
            showForm && styles.topBarForm,
            {
              flexDirection: dir,
              paddingTop: insets.top + 4,
            },
          ]}
        >
          {showForm ? (
            <Pressable
              onPress={() => setPanel("home")}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={t.auth.goBack}
            >
              <ArrowLeft
                size={22}
                color={colors.foreground}
                style={isRTL ? { transform: [{ rotate: "180deg" }] } : undefined}
              />
            </Pressable>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
          <View style={styles.topBarSpacer} />
          <ThemeToggle />
          <AuthLanguageField />
        </View>

        {!showForm ? (
          <>
            <View style={styles.logoHeader}>
              <Logo3elagi height={logoHeight} centered />
            </View>
            <View style={styles.spacer} />
          </>
        ) : null}

        <View
          style={[
            styles.footerOuter,
            showForm && { maxHeight: sheetMaxHeight, shadowColor: "#0f2744" },
          ]}
        >
          <View
            style={[
              styles.footer,
              showForm && styles.footerForm,
              showForm && {
                borderColor: colors.border,
                backgroundColor: colors.background,
                maxHeight: sheetMaxHeight,
              },
            ]}
          >
            {!showForm ? (
              <>
                <BlurView
                  intensity={85}
                  tint={isDark ? "dark" : "light"}
                  style={styles.footerBlur}
                />
                <View
                  style={[
                    styles.footerTint,
                    {
                      backgroundColor: isDark
                        ? "rgba(15,20,25,0.42)"
                        : "rgba(255,255,255,0.32)",
                    },
                  ]}
                />
              </>
            ) : null}

            {showForm ? (
              <KeyboardSafeScrollView
                style={{ maxHeight: sheetMaxHeight, flexGrow: 0, flex: 0 }}
                contentContainerStyle={[
                  styles.footerContent,
                  { paddingBottom: Math.max(insets.bottom, 16) + 12 },
                ]}
                bottomOffset={32}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Text style={[styles.formTitle, { color: colors.foreground }]}>
                  {formTitle}
                </Text>

                {panel === "login" ? (
                  <WelcomeLoginForm
                    onSwitchToSignup={() => setPanel("signup")}
                    onGoogleNoAccount={handleGoogleNoAccount}
                  />
                ) : (
                  <WelcomeSignupForm
                    onSwitchToLogin={() => setPanel("login")}
                    googlePrefill={googlePrefill}
                    onGoogleNoAccount={handleGoogleNoAccount}
                  />
                )}
              </KeyboardSafeScrollView>
            ) : (
              <View style={styles.footerContent}>
                <Text style={[styles.ctaTitle, { color: colors.foreground }]}>
                  {t.auth.welcomeCtaTitle}
                </Text>
                <Text style={[styles.ctaSubtitle, { color: colors.mutedForeground }]}>
                  {t.auth.welcomeCtaSubtitle}
                </Text>

                <Pressable
                  onPress={() => setPanel("login")}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    {
                      opacity: pressed ? 0.92 : 1,
                      shadowColor: colors.primary,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={accentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnPrimaryGradient}
                  >
                    <Text style={styles.btnPrimaryText}>{t.auth.logIn}</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => setPanel("signup")}
                  style={({ pressed }) => [
                    styles.btnGhost,
                    {
                      borderColor: colors.primary,
                      backgroundColor: pressed
                        ? colors.primary + "29"
                        : colors.primary + "14",
                    },
                  ]}
                >
                  <Text style={[styles.btnGhostText, { color: colors.primary }]}>
                    {t.auth.register}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.replace("/(tabs)")}
                  style={({ pressed }) => [
                    styles.btnBrowse,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.btnBrowseText, { color: colors.foreground }]}>
                    {isRTL ? "تصفح التخصصات والأطباء" : "Browse specialties & doctors"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#eef4fc",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  page: {
    flex: 1,
    justifyContent: "space-between",
  },
  pageForm: {
    justifyContent: "flex-end",
  },
  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: "center",
    gap: 8,
  },
  topBarForm: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  topBarSpacer: { flex: 1 },
  backBtn: {
    padding: 6,
  },
  backBtnPlaceholder: {
    width: 34,
    height: 34,
  },
  logoHeader: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    flex: 1,
    minHeight: 48,
  },
  footerOuter: {
    marginHorizontal: 16,
    borderRadius: 28,
    shadowColor: "#0f2744",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 14,
  },
  footer: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  footerForm: {
    borderColor: "transparent",
  },
  footerBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  footerTint: {
    ...StyleSheet.absoluteFillObject,
  },
  footerContent: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    flexGrow: 0,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 0,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  ctaSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 4,
  },
  btnPrimary: {
    borderRadius: 16,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 8,
  },
  btnPrimaryGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnGhost: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
  },
  btnGhostText: {
    fontWeight: "800",
    fontSize: 16,
  },
  btnBrowse: {
    paddingVertical: 10,
    alignItems: "center",
  },
  btnBrowseText: {
    fontWeight: "700",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
