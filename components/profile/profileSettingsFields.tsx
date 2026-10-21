import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import { useColors } from "@/hooks/useColors";

export function profileFieldGridStyle(desktop: boolean, columns = 2): ViewStyle {
  if (!desktop || columns <= 1) {
    return { flexDirection: "column", gap: 12 };
  }
  return {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    alignItems: "start",
  } as unknown as ViewStyle;
}

export function profileGridSpanFull(desktop: boolean): ViewStyle | undefined {
  return desktop ? ({ gridColumn: "1 / -1" } as ViewStyle) : undefined;
}

export function certFileName(url: string, index: number): string {
  try {
    const raw = decodeURIComponent(url.split("?")[0].split("/").pop() ?? "");
    const cleaned = raw.replace(/^[0-9a-f-]{36}-/i, "");
    if (cleaned) return cleaned;
  } catch {
    // fall through
  }
  return `Certificate ${index + 1}`;
}

export function ProfileSettingsField({
  label,
  value,
  onChangeText,
  editable = true,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline = false,
  colors,
  isRTL,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "number-pad" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={styles.field}>
      {label ? (
        <Text style={[styles.label, { color: PROFILE_SETTINGS.text.section, textAlign }]}>
          {label}
        </Text>
      ) : null}
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: editable ? colors.foreground : colors.mutedForeground,
            borderColor: PROFILE_SETTINGS.border,
            backgroundColor: editable ? PROFILE_SETTINGS.bg.card : `${PROFILE_SETTINGS.bg.app}`,
            textAlign,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.control,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 46,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: 12,
  },
});
