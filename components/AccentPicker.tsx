import { Check } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ACCENTS, ACCENT_KEYS } from "@/constants/colors";
import { useThemeStore } from "@/domains/theme/store";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

/** Three circles switching the app's primary colour (green / blue / red). */
export function AccentPicker() {
  const { isRTL } = useI18n();
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);

  return (
    <View style={[styles.row, { flexDirection: flexRow(isRTL) }]}>
      {ACCENT_KEYS.map((key) => {
        const selected = key === accent;
        return (
          <Pressable
            key={key}
            onPress={() => setAccent(key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={key}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.swatch,
              selected && styles.swatchSelected,
              {
                backgroundColor: ACCENTS[key].swatch,
                opacity: pressed || hovered ? 0.85 : 1,
              },
            ]}
          >
            {selected ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 10,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // The tick marks the active colour; scale gives it a little presence too.
  swatchSelected: {
    transform: [{ scale: 1.15 }],
  },
});
