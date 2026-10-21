import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  MARKET_COUNTRY_CODES,
  patientCountryLabel,
  type PatientCountryCode,
} from "@/constants/patientCountries";
import { useColors } from "@/hooks/useColors";
import { flexRow } from "@/utils/rtl";

type Props = {
  label: string;
  value: PatientCountryCode;
  onChange: (code: PatientCountryCode) => void;
  error?: string;
  isRTL: boolean;
  disabled?: boolean;
  /** Defaults to Egypt & Jordan (doctor / live markets). Pass PATIENT_COUNTRY_CODES for patients. */
  codes?: readonly PatientCountryCode[];
};

export function CountryChipsField({
  label,
  value,
  onChange,
  error,
  isRTL,
  disabled,
  codes = MARKET_COUNTRY_CODES,
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
      <View style={[styles.row, { flexDirection: dir }]}>
        {codes.map((code) => {
          const active = value === code;
          return (
            <Pressable
              key={code}
              disabled={disabled}
              onPress={() => onChange(code)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${colors.primary}18` : colors.muted,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: disabled ? 0.6 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.foreground,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {patientCountryLabel(code, isRTL)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: "600" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: "700" },
  row: { flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
