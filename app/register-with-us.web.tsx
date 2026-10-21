import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { RegisterWithUsForm } from "@/components/marketing/RegisterWithUsForm";
import { PublicLandingNav } from "@/components/marketing/PublicLandingNav";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function RegisterWithUsWebScreen() {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);
  const { isDesktop, isMobile, width } = useWebLayout();

  const sidebarWidth = isDesktop ? 260 : isMobile ? 0 : 68;
  const contentWidth = Math.max(320, width - sidebarWidth);
  const formWidth = isDesktop
    ? Math.max(420, Math.min(720, contentWidth * 0.5))
    : Math.min(width - 32, 560);

  return (
    <WebDesktopShell allowGuests>
      {!signedIn && isMobile ? <PublicLandingNav /> : null}

      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[
            `${colors.primary}10`,
            `${accentGradient[1]}08`,
            "transparent",
          ]}
          locations={[0, 0.45, 1]}
          style={styles.pageGlow}
          pointerEvents="none"
        />

        <ScrollView
          nativeID={BRAND_SCROLL_NATIVE_ID}
          contentContainerStyle={[
            styles.scroll,
            isDesktop && styles.scrollDesktop,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View
            style={[
              styles.card,
              surfaceCard(colors.card, colors.border),
              UI.shadowXl,
              {
                width: formWidth,
                maxWidth: "100%",
                borderColor: `${colors.primary}22`,
              },
            ]}
          >
            <LinearGradient
              colors={[
                `${colors.primary}16`,
                `${accentGradient[1]}12`,
                "transparent",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardAccent}
              pointerEvents="none"
            />
            <RegisterWithUsForm showHero />
          </View>
        </ScrollView>
      </View>
    </WebDesktopShell>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 0,
  },
  pageGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
    alignItems: "center",
  },
  scrollDesktop: {
    paddingTop: 48,
    paddingBottom: 64,
    justifyContent: "center",
    flexGrow: 1,
  },
  card: {
    borderRadius: UI.radius.xl,
    paddingHorizontal: UI.space.lg,
    paddingVertical: UI.space.lg + 4,
    overflow: "hidden",
    position: "relative",
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
});
