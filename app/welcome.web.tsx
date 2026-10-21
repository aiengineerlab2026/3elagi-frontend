import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelcomeLoginForm } from "@/components/auth/WelcomeLoginForm";
import { WelcomeSignupForm } from "@/components/auth/WelcomeSignupForm";
import { Logo3elagi } from "@/components/Logo3elagi";
import { MobileAppLink } from "@/components/web/MobileAppLink.web";
import { LOGO_HEIGHT } from "@/constants/brand";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { on } from "@/utils/eventBus";
import { alignText, flexRow } from "@/utils/rtl";

const WELCOME_HERO_LEFT = require("@/assets/images/welcome-hero-left.jpg");

type WelcomePanel = "home" | "login" | "signup";

export default function WelcomeScreenWeb() {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { isDesktop, isMobile, isTablet, width: layoutWidth } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const stackVertical = !isTablet;
  const [panel, setPanel] = useState<WelcomePanel>("home");
  const showForm = panel !== "home";

  const showHomePanel = useCallback(() => {
    setPanel("home");
  }, []);

  useFocusEffect(
    useCallback(() => {
      const { profile, accessToken } = useAuthStore.getState();
      if (!isSignedIn(profile, accessToken)) {
        showHomePanel();
      }
    }, [showHomePanel]),
  );

  useEffect(() => {
    return on(AUTH_EVENTS.LOGOUT, showHomePanel);
  }, [showHomePanel]);

  const formTitle =
    panel === "login" ? t.auth.logIn : panel === "signup" ? t.auth.register : "";

  return (
    <View
      style={[
        styles.shell,
        stackVertical
          ? styles.shellStacked
          : { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      {!stackVertical ? (
        <View style={styles.heroPane}>
          <Image
            source={WELCOME_HERO_LEFT}
            style={styles.heroImage}
            contentFit="cover"
            contentPosition="center"
            accessibilityLabel=""
          />
        </View>
      ) : null}

      <View
        style={[
          styles.actionPane,
          { backgroundColor: colors.background },
          stackVertical && styles.actionPaneFull,
        ]}
      >
        <View
          style={[
            styles.actionTopBar,
            {
              flexDirection: dir,
              paddingHorizontal: isMobile ? 16 : 20,
              paddingTop: stackVertical ? Math.max(insets.top, 8) : 16,
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
          <View style={styles.actionTopSpacer} />
          <View style={[styles.topActions, { flexDirection: dir }]}>
            <MobileAppLink variant="toolbar" />
            <ThemeToggle />
            <AuthLanguageField />
          </View>
        </View>

        <ScrollView
          style={styles.actionScroll}
          contentContainerStyle={[
            styles.actionScrollContent,
            { paddingHorizontal: isMobile ? 16 : 24 },
            // Login/signup start at the top; home CTAs stay vertically centered.
            showForm
              ? styles.actionScrollContentTop
              : styles.actionScrollContentCentered,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {panel === "home" ? (
            <View style={styles.actionContent}>
              <Logo3elagi
                height={
                  isDesktop
                    ? LOGO_HEIGHT.welcomeDesktop
                    : layoutWidth < 340
                      ? LOGO_HEIGHT.welcomeBarMobile
                      : LOGO_HEIGHT.welcomeHero
                }
                centered
              />

              <Text
                style={[
                  styles.ctaTitle,
                  { color: colors.foreground, textAlign },
                  isMobile && styles.ctaTitleMobile,
                ]}
              >
                {t.auth.welcomeCtaTitle}
              </Text>
              <Text style={[styles.ctaSubtitle, { color: colors.mutedForeground, textAlign }]}>
                {t.auth.welcomeCtaSubtitle}
              </Text>

              <View style={styles.btnColumn}>
                <Pressable
                  onPress={() => setPanel("login")}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.btn,
                    styles.btnLogin,
                    { shadowColor: colors.primary },
                    pressed && styles.btnPressed,
                    hovered && styles.btnLoginHovered,
                  ]}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={accentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.btnLoginGradient}
                  >
                    <Text style={styles.btnLoginText}>{t.auth.logIn}</Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={() => setPanel("signup")}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.btn,
                    styles.btnSignup,
                    {
                      borderColor: colors.primary,
                      backgroundColor: hovered
                        ? colors.primary + "29"
                        : colors.primary + "14",
                    },
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnSignupText, { color: colors.primary }]}>
                    {t.auth.register}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.replace("/(tabs)")}
                  style={({ pressed }) => [
                    styles.btnBrowse,
                    { opacity: pressed ? 0.75 : 1 },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnBrowseText, { color: colors.foreground }]}>
                    {isRTL ? "تصفح التخصصات والأطباء" : "Browse specialties & doctors"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.formSection}>
              <Text style={[styles.formTitle, { color: colors.foreground, textAlign }]}>
                {formTitle}
              </Text>
              {panel === "login" ? (
                <WelcomeLoginForm onSwitchToSignup={() => setPanel("signup")} />
              ) : (
                <WelcomeSignupForm onSwitchToLogin={() => setPanel("login")} />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    height: "100vh" as unknown as number,
    minHeight: "100vh" as unknown as number,
    width: "100%",
    overflow: "hidden",
  },
  shellStacked: {
    flexDirection: "column",
  },
  heroPane: {
    flex: 1.25,
    alignSelf: "stretch",
    height: "100%" as unknown as number,
    minWidth: 0,
    minHeight: "100%" as unknown as number,
    backgroundColor: "#eef4fc",
    overflow: "hidden",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  actionPane: {
    flex: 0.85,
    alignSelf: "stretch",
    height: "100%" as unknown as number,
    minWidth: 320,
    maxWidth: 520,
    minHeight: 0,
  },
  actionPaneFull: {
    width: "100%",
    flex: 1,
    minWidth: 0,
    maxWidth: "100%" as unknown as number,
  },
  actionTopBar: {
    paddingBottom: 4,
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    padding: 6,
    cursor: "pointer" as "auto",
  },
  backBtnPlaceholder: {
    width: 34,
    height: 34,
  },
  actionTopSpacer: { flex: 1 },
  topActions: {
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  actionScroll: {
    flex: 1,
    minHeight: 0,
  },
  actionScrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  actionScrollContentTop: {
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  actionScrollContentCentered: {
    justifyContent: "center",
    alignItems: "center",
  },
  actionContent: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 16,
    alignSelf: "center",
  },
  formSection: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: 20,
    paddingTop: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  ctaTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.4,
    marginTop: 8,
  },
  ctaTitleMobile: {
    fontSize: 22,
    lineHeight: 28,
  },
  ctaSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  btnColumn: {
    width: "100%",
    gap: 12,
    marginTop: 4,
  },
  btn: {
    width: "100%",
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer" as "auto",
    overflow: "hidden",
  },
  btnLogin: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  btnLoginGradient: {
    width: "100%",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  btnLoginHovered: {
    opacity: 0.95,
    transform: [{ translateY: -1 }],
  },
  btnLoginText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  btnSignup: {
    borderWidth: 2.5,
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  btnSignupText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  btnBrowse: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
    cursor: "pointer" as "auto",
  },
  btnBrowseText: {
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
