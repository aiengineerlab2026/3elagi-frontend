import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { glassSurface } from "@/constants/uiTokens";
import { useColors, useResolvedTheme } from "@/hooks/useColors";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  isRTL?: boolean;
}

/** Frosted glass wrapper for the medical specialities grid. */
export function SpecialityGlassShell({ children, style, isRTL }: Props) {
  const colors = useColors();
  const theme = useResolvedTheme();
  const isDark = theme === "dark";

  // Native has no backdrop blur, so the blur + white sheen rendered as an
  // opaque white card under the grid. Plain background there; glass on web.
  if (Platform.OS !== "web") {
    return (
      <View style={[styles.shell, styles.plainNative, style]}>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.shell,
        glassSurface({ isDark, accentColor: colors.primary }),
        style,
        { direction: isRTL ? "rtl" : "ltr" } as object,
      ]}
      // @ts-expect-error web writing direction
      dir={isRTL ? "rtl" : "ltr"}
    >
      <LinearGradient
        colors={
          isDark
            ? ["rgba(45,212,191,0.1)", "transparent", "rgba(26,33,50,0.4)"]
            : ["rgba(255,255,255,0.62)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0.06)"]
        }
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <LinearGradient
        colors={
          isDark
            ? ["rgba(255,255,255,0.07)", "transparent"]
            : ["rgba(255,255,255,0.75)", "transparent"]
        }
        style={styles.shine}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: "relative",
  },
  plainNative: {
    backgroundColor: "transparent",
  },
  shine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  content: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 12,
    position: "relative",
    zIndex: 1,
  },
});
