import { Monitor, Moon, Sun } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { UI } from "@/constants/uiTokens";
import type { ThemeMode } from "@/domains/theme/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useTheme } from "@/hooks/useTheme";
import { flexRow } from "@/utils/rtl";

type Option = {
  id: ThemeMode;
  label: string;
  Icon: typeof Sun;
};

export function ProfileThemeField() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { mode, setMode } = useTheme();
  const dir = flexRow(isRTL);
  const textAlign = isRTL ? "right" : "left";

  const options: Option[] = [
    { id: "light", label: t.settings.themeLight, Icon: Sun },
    { id: "dark", label: t.settings.themeDark, Icon: Moon },
    { id: "system", label: t.settings.themeSystem, Icon: Monitor },
  ];

  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
        {t.settings.theme}
      </Text>
      <View style={[styles.row, { flexDirection: dir }]}>
        {options.map(({ id, label, Icon }) => {
          const active = mode === id;
          return (
            <Pressable
              key={id}
              onPress={() => setMode(id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? `${colors.primary}14` : colors.background,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
                Platform.OS === "web" ? UI.pressable : null,
              ]}
            >
              <Icon size={16} color={active ? colors.primary : colors.mutedForeground} />
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primary : colors.foreground },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    flex: 1,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: UI.radius.inner,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
