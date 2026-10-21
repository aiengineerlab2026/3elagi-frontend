import { router } from "expo-router";
import { Home } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthHeroMedia } from "@/components/auth/AuthHeroMedia";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

interface Props {
  children: React.ReactNode;
  /** Shown as a page eyebrow on smaller web viewports. */
  eyebrow?: string;
  /** Kept for API compatibility with callers. */
  headline?: string;
  description?: string;
  /** Prefer scrolling the form column (signup / long forms). */
  scrollForm?: boolean;
  /** Kept for API compatibility; layout is always full-screen like welcome. */
  backgroundVariant?: "gradient" | "login-hero";
  heroOverlayOpacity?: number;
  /** Show top-left back control. Default true. */
  showBack?: boolean;
}

/**
 * Full-viewport auth shell matching welcome.web:
 * left lifestyle hero + right form pane (edge-to-edge, no card inset).
 */
export function WebAuthFrame({
  children,
  eyebrow,
  scrollForm = false,
  showBack = true,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { isMobile, isTablet } = useWebLayout();
  const dir = flexRow(isRTL);
  const stackVertical = !isTablet;
  // Mobile / stacked: pin content to the top. Desktop split pane may center.
  const centerForm = !scrollForm && !stackVertical;

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
          <AuthHeroMedia overlayOpacity={0.48} />
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
          {showBack ? (
            <AppBackButton
              color={colors.foreground}
              style={styles.backBtn}
              accessibilityLabel={t.auth.goBack}
            />
          ) : (
            <Pressable
              onPress={() => router.replace("/(tabs)")}
              accessibilityRole="link"
              accessibilityLabel={t.tabs.home}
              style={({ pressed }) => [
                styles.homeLink,
                { flexDirection: dir, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Home size={18} color={colors.primary} />
              <Text style={[styles.homeLinkText, { color: colors.primary }]}>
                {t.tabs.home}
              </Text>
            </Pressable>
          )}
          <View style={styles.actionTopSpacer} />
          <View style={[styles.topActions, { flexDirection: dir }]}>
            <AuthLanguageField />
          </View>
        </View>

        {stackVertical && eyebrow ? (
          <Text
            style={[
              styles.eyebrow,
              {
                color: colors.mutedForeground,
                borderBottomColor: colors.border,
              },
            ]}
          >
            {eyebrow}
          </Text>
        ) : null}

        <ScrollView
          nativeID={scrollForm ? "auth-form-scroll" : undefined}
          style={styles.actionScroll}
          contentContainerStyle={[
            styles.actionScrollContent,
            { paddingHorizontal: isMobile ? 16 : 24 },
            stackVertical && styles.actionScrollContentTop,
            centerForm && styles.actionScrollContentCentered,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={scrollForm}
        >
          <View style={styles.formSection}>{children}</View>
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
    position: "relative",
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
    maxWidth: "100%" as unknown as number,
    flex: 1,
  },
  actionTopBar: {
    paddingBottom: 4,
    alignItems: "center",
    gap: 8,
    zIndex: 25,
  },
  backBtn: {
    padding: 6,
  },
  homeLink: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    cursor: "pointer" as "auto",
  },
  homeLinkText: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionTopSpacer: { flex: 1 },
  topActions: {
    alignItems: "center",
    gap: 10,
    zIndex: 30,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },
  formSection: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
});
