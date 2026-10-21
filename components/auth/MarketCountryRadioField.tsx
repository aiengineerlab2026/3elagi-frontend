import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  MARKET_COUNTRY_CODES,
  patientCountryLabel,
  type MarketCountryCode,
} from "@/constants/patientCountries";
import { useColors } from "@/hooks/useColors";
import { flexRow } from "@/utils/rtl";

type Props = {
  label: string;
  value: MarketCountryCode;
  onChange: (code: MarketCountryCode) => void;
  isRTL: boolean;
  disabled?: boolean;
};

/** Egypt / Jordan market picker with circular radio controls. */
export function MarketCountryRadioField({
  label,
  value,
  onChange,
  isRTL,
  disabled,
}: Props) {
  const colors = useColors();
  const dir = flexRow(isRTL);

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.label,
          { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
        ]}
      >
        {label}
      </Text>
      <View style={[styles.row, { flexDirection: dir }]} accessibilityRole="radiogroup">
        {MARKET_COUNTRY_CODES.map((code) => {
          const active = value === code;
          return (
            <Pressable
              key={code}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: !!disabled }}
              accessibilityLabel={patientCountryLabel(code, isRTL)}
              onPress={() => onChange(code)}
              style={({ pressed }) => [
                styles.option,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active
                    ? `${colors.primary}12`
                    : colors.card,
                  opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
                  flexDirection: dir,
                },
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  {
                    borderColor: active ? colors.primary : colors.mutedForeground,
                  },
                ]}
              >
                {active ? (
                  <View
                    style={[styles.radioInner, { backgroundColor: colors.primary }]}
                  />
                ) : null}
              </View>
              <Text
                style={{
                  color: active ? colors.primary : colors.foreground,
                  fontWeight: active ? "800" : "600",
                  fontSize: 14,
                }}
              >
                {patientCountryLabel(code, isRTL)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700" },
  row: { gap: 10 },
  option: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
