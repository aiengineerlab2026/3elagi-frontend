import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LANGUAGE_OPTIONS } from "@/components/language/LanguageFlags";
import type { Locale } from "@/domains/i18n/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  value?: Locale;
  onChange?: (locale: Locale) => void;
  /** Stretch chips across the row (profile preferences). */
  fillWidth?: boolean;
};

export function LanguageFlagRow({ value, onChange, fillWidth = false }: Props) {
  const colors = useColors();
  const { locale: storeLocale, setLocale, isRTL } = useI18n();
  const locale = value ?? storeLocale;
  const applyLocale = onChange ?? setLocale;

  return (
    <View
      style={[
        styles.row,
        {
          flexDirection: isRTL ? "row-reverse" : "row",
          justifyContent: fillWidth ? "space-between" : "flex-start",
          flexWrap: fillWidth ? "nowrap" : "wrap",
        },
      ]}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const active = locale === option.locale;
        return (
          <Pressable
            key={option.locale}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => applyLocale(option.locale)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.chip,
              fillWidth && styles.chipFill,
              {
                backgroundColor: active ? `${colors.primary}14` : colors.muted,
                borderColor: active ? colors.primary : colors.border,
                opacity: pressed || hovered ? 0.85 : 1,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.chipLabel,
                { color: active ? colors.primary : colors.foreground },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    cursor: "pointer" as "auto",
  },
  chipFill: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    paddingHorizontal: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
});
