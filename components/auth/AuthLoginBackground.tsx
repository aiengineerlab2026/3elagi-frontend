import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthLanguageField } from "@/components/auth/AuthLanguageField";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

const WELCOME_HERO_MOBILE = require("@/assets/images/welcome-hero-mobile.jpg");

interface Props {
  children: React.ReactNode;
}

/**
 * Native auth shell — hero photo with a bottom sheet that hugs short forms
 * and scrolls within a max height for longer ones.
 */
export function AuthLoginBackground({ children }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * 0.82);

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
          {
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View
          style={[
            styles.topBar,
            { flexDirection: dir, paddingTop: insets.top + 4 },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
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
          <View style={styles.topBarSpacer} />
          <ThemeToggle />
          <AuthLanguageField />
        </View>

        <View style={styles.spacer} />

        <View
          style={[
            styles.footerOuter,
            {
              maxHeight: sheetMaxHeight,
              shadowColor: "#0f2744",
            },
          ]}
        >
          <View
            style={[
              styles.footer,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                maxHeight: sheetMaxHeight,
              },
            ]}
          >
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
              {children}
            </KeyboardSafeScrollView>
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
    justifyContent: "flex-end",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignItems: "center",
    gap: 8,
    zIndex: 2,
  },
  topBarSpacer: { flex: 1 },
  backBtn: {
    padding: 6,
  },
  spacer: {
    flex: 1,
    minHeight: 80,
  },
  footerOuter: {
    marginHorizontal: 16,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 14,
    alignSelf: "stretch",
  },
  footer: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
  },
  footerContent: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    flexGrow: 0,
  },
});
