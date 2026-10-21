import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  value: string;
  onChange: (html: string) => void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
}

/** Native fallback — plain multiline text (HTML mode on web). */
export function MarketingHtmlEditor({
  value,
  onChange,
  dir = "ltr",
  placeholder = "Write the email body…",
}: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        textAlign={dir === "rtl" ? "right" : "left"}
        style={[
          styles.input,
          { color: colors.foreground, textAlign: dir === "rtl" ? "right" : "left" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 160,
  },
  input: {
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 160,
    textAlignVertical: "top",
  },
});
