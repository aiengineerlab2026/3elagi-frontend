import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AccentPicker } from "@/components/AccentPicker";
import { LanguageDropdown } from "@/components/language/LanguageDropdown";
import { Logo3elagi } from "@/components/Logo3elagi";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LOGO_HEIGHT } from "@/constants/brand";
import { primaryButton, surfaceCard, UI } from "@/constants/uiTokens";
import { goHome } from "@/domains/navigation/goHome";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

type NavLink = {
  key: string;
  label: string;
  onPress: () => void;
};

export function PublicLandingNav() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isMobile } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const [menuOpen, setMenuOpen] = useState(false);

  const links: NavLink[] = [
    {
      key: "home",
      label: t.tabs.home,
      onPress: goHome,
    },
    {
      key: "for-doctors",
      label: t.landing.navForDoctors,
      onPress: () => router.push("/(tabs)/for-doctors"),
    },
    {
      key: "register-with-us",
      label: t.landing.navRegisterWithUs,
      onPress: () => router.push("/register-with-us"),
    },
    {
      key: "faq",
      label: t.landing.navFaq,
      onPress: () => router.push("/(tabs)/faq"),
    },
    {
      key: "documentation",
      label: t.tabs.documentation,
      onPress: () => router.push("/(tabs)/documentation"),
    },
    {
      key: "about",
      label: t.tabs.aboutUs,
      onPress: () => router.push("/(tabs)/about-us"),
    },
    {
      key: "contact",
      label: t.tabs.contactUs,
      onPress: () => router.push("/contact"),
    },
  ];

  if (Platform.OS !== "web") return null;

  // Same controls in the bar (desktop) and in the drawer (mobile) — at ~460px
  // the four of them no longer fit next to the logo, so they move down.
  const authControls = (stacked: boolean) => (
    <>
      <LanguageDropdown compact />
      <ThemeToggle />
      <AccentPicker />
      <Pressable
        onPress={() => router.push("/auth/login")}
        style={({ pressed }) => [
          styles.loginBtn,
          stacked && styles.stackedBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.loginText, { color: colors.primary, textAlign }]}>
          {t.auth.logIn}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.push("/auth/signup")}
        style={({ pressed }) => [
          primaryButton(),
          styles.cta,
          stacked && styles.stackedBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>
          {t.landing.getStarted}
        </Text>
      </Pressable>
    </>
  );

  return (
    <View
      style={[
        styles.shell,
        surfaceCard(colors.card, colors.border),
        { backgroundColor: `${colors.card}f2` },
      ]}
    >
      <View style={[styles.row, { flexDirection: dir }]}>
        <Pressable onPress={goHome} accessibilityRole="button">
          <Logo3elagi height={LOGO_HEIGHT.welcomeBarMobile} />
        </Pressable>

        {!isMobile ? (
          <View style={[styles.links, { flexDirection: dir }]}>
            {links.map((link) => (
              <Pressable
                key={link.key}
                onPress={link.onPress}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.link,
                  { opacity: pressed || hovered ? 0.75 : 1 },
                ]}
              >
                <Text style={[styles.linkText, { color: colors.foreground, textAlign }]}>
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => setMenuOpen((v) => !v)}
            style={styles.menuBtn}
            accessibilityRole="button"
            accessibilityLabel={t.landing.navMenu}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {menuOpen ? "✕" : "☰"}
            </Text>
          </Pressable>
        )}

        {!isMobile ? (
          <View style={[styles.actions, { flexDirection: dir }]}>
            {authControls(false)}
          </View>
        ) : null}
      </View>

      {isMobile && menuOpen ? (
        <View style={[styles.mobileMenu, { borderTopColor: colors.border }]}>
          {links.map((link) => (
            <Pressable
              key={link.key}
              onPress={() => {
                setMenuOpen(false);
                link.onPress();
              }}
              style={({ pressed }) => [styles.mobileLink, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.linkText, { color: colors.foreground, textAlign }]}>
                {link.label}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.mobileActions, { borderTopColor: colors.border }]}>
            {authControls(true)}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "sticky" as unknown as undefined,
    top: 0,
    zIndex: 20,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: UI.radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...Platform.select({
      web: { backdropFilter: "blur(10px)" } as object,
      default: {},
    }),
  },
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  links: {
    flex: 1,
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  link: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: UI.radius.inner,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  loginBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  loginText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 38,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
  },
  menuBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 40,
    paddingVertical: 8,
  },
  mobileActions: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "stretch",
    gap: 10,
  },
  stackedBtn: {
    width: "100%",
    alignItems: "center",
  },
  mobileMenu: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  mobileLink: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
