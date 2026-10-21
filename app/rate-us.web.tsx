import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { RateUsForm } from "@/components/feedback/RateUsForm";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useAccentGradient, useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function RateUsWebScreen() {
  const colors = useColors();
  const accentGradient = useAccentGradient();
  const { isDesktop, isMobile, width } = useWebLayout();

  const sidebarWidth = isDesktop ? 260 : isMobile ? 0 : 68;
  const contentWidth = Math.max(320, width - sidebarWidth);
  const formWidth = isDesktop
    ? Math.max(420, Math.min(720, contentWidth * 0.5))
    : Math.min(width - 32, 560);

  return (
    <WebDesktopShell>
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
            <RateUsForm showHero />
          </View>
        </ScrollView>
      </View>
    </WebDesktopShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0 },
  pageGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
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
  },
});
