import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View, type TextStyle } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { useColors } from "@/hooks/useColors";
import { useInputContainerFocus } from "@/hooks/useInputContainerFocus";
import { useI18n } from "@/hooks/useI18n";
import { currencySuffix } from "@/utils/credits";
import { flexRow } from "@/utils/rtl";

const MIN_EGP = 1;
const MAX_EGP = 100_000;

interface Props {
  value: number;
  onChange: (value: number) => void;
  label: string;
  hint?: string;
  compact?: boolean;
  /** Match profile form fields (label + input height). */
  variant?: "default" | "field";
}

export function EgpPriceInput({
  value,
  onChange,
  label,
  hint,
  compact = false,
  variant = "default",
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { borderColor, onFocus, onBlur } = useInputContainerFocus();
  const textAlign = isRTL ? "right" : "left";
  const isField = variant === "field";
  const [text, setText] = useState(String(value > 0 ? value : ""));

  useEffect(() => {
    setText(String(value > 0 ? value : ""));
  }, [value]);

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setText("");
      return;
    }
    const n = Math.min(MAX_EGP, Math.max(MIN_EGP, parseInt(digits, 10)));
    setText(String(n));
    onChange(n);
  };

  return (
    <View style={{ gap: isField ? 6 : compact ? 4 : 8 }}>
      <Text
        style={{
          color: isField ? colors.mutedForeground : colors.foreground,
          fontWeight: "700",
          fontSize: isField ? 12 : compact ? 11 : 15,
          textAlign,
        }}
      >
        {label}
      </Text>
      {hint ? (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: compact ? 10 : 12,
            textAlign,
          }}
        >
          {hint}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputRow,
          isField && styles.inputRowField,
          {
            flexDirection: flexRow(isRTL),
            borderColor,
            backgroundColor: isField ? colors.muted : colors.background,
          },
          Platform.OS === "web"
            ? ({ transition: "border-color 150ms ease" } as TextStyle)
            : null,
        ]}
      >
        <AppTextInput
          focusBorder={false}
          value={text}
          onChangeText={(next) => setText(next.replace(/\D/g, ""))}
          onFocus={onFocus}
          onBlur={() => {
            onBlur();
            commit(text);
          }}
          keyboardType="number-pad"
          placeholder={t.credits.amountPlaceholder}
          style={[
            isField ? styles.inputField : styles.input,
            compact && !isField && styles.inputCompact,
            { color: colors.foreground, textAlign },
          ]}
        />
        <Text
          style={[
            styles.suffix,
            isField && styles.suffixField,
            compact && !isField && styles.suffixCompact,
            { color: colors.mutedForeground },
          ]}
        >
          {currencySuffix(t)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputRowField: {
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 12,
    minHeight: 46,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    paddingVertical: 11,
  },
  inputCompact: {
    fontSize: 14,
    paddingVertical: 8,
    minHeight: 38,
  },
  suffix: {
    fontSize: 14,
    fontWeight: "700",
  },
  suffixField: {
    fontSize: 13,
    fontWeight: "600",
  },
  suffixCompact: {
    fontSize: 12,
  },
});
