import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export function AppToast() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topOffset = Platform.OS === "web" ? 16 : insets.top + 8;

  // BaseToast defaults to one line and a fixed 60px box, which cut longer
  // messages mid-word; let both lines wrap and the box grow with them.
  const shared = {
    contentContainerStyle: { paddingHorizontal: 14, paddingVertical: 10 },
    text1Style: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
    text2Style: { fontSize: 13, color: colors.mutedForeground },
    text1NumberOfLines: 3,
    text2NumberOfLines: 3,
  };
  const box = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    width: "92%" as const,
    maxWidth: 420,
    height: undefined,
    minHeight: 60,
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Toast
        topOffset={topOffset}
        config={{
          success: (props) => (
            <BaseToast {...props} {...shared} style={{ ...box, borderLeftColor: "#10b981" }} />
          ),
          error: (props) => (
            <ErrorToast {...props} {...shared} style={{ ...box, borderLeftColor: "#ef4444" }} />
          ),
          info: (props) => (
            <BaseToast {...props} {...shared} style={{ ...box, borderLeftColor: colors.primary }} />
          ),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
    elevation: 999999,
  },
});
