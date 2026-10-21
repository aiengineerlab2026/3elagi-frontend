import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

const AUTH_HERO = require("@/assets/images/auth-hero.jpg");

interface Props {
  style?: StyleProp<ViewStyle>;
  /** 0–1 primary wash over the hero image. */
  overlayOpacity?: number;
}

/** Shared login/signup hero photo tinted with the active primary colour. */
export function AuthHeroMedia({ style, overlayOpacity = 0.48 }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={AUTH_HERO}
        style={styles.image}
        contentFit="cover"
        contentPosition="center"
        accessibilityLabel=""
      />
      <LinearGradient
        colors={[
          `${colors.primary}${toHexAlpha(overlayOpacity * 0.85)}`,
          `${colors.primary}${toHexAlpha(overlayOpacity)}`,
          `${colors.primary}${toHexAlpha(overlayOpacity * 0.72)}`,
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
    </View>
  );
}

function toHexAlpha(opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

export { AUTH_HERO };
