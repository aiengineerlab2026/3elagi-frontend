import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  DOCTOR_SIGNUP_COUNTRY_CODES,
  patientCountryLabel,
  type DoctorSignupCountryCode,
} from "@/constants/patientCountries";
import {
  getDoctorSignupMarket,
  setDoctorSignupMarketOverride,
} from "@/domains/market/doctorSignupMarket";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

type Props = {
  isRTL: boolean;
  disabled?: boolean;
  error?: string;
  /** Controlled value (EG / JO / US / GB). */
  value?: DoctorSignupCountryCode | null;
  /** Called when the user picks a market. */
  onChange?: (market: DoctorSignupCountryCode) => void;
  /** Called when market is resolved (URL default or explicit pick). */
  onMarketChange?: (market: DoctorSignupCountryCode | null) => void;
};

/** Doctors pick their practice country. */
export function DoctorSignupMarketField({
  isRTL,
  disabled,
  error,
  value,
  onChange,
  onMarketChange,
}: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const dir = flexRow(isRTL);
  const [internalMarket, setInternalMarket] = useState<DoctorSignupCountryCode | null>(() =>
    value ?? getDoctorSignupMarket(),
  );
  const market = value ?? internalMarket;

  const pick = (code: DoctorSignupCountryCode) => {
    if (value === undefined) {
      setDoctorSignupMarketOverride(code);
      setInternalMarket(code);
    }
    onChange?.(code);
    onMarketChange?.(code);
  };

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.label,
          { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
        ]}
      >
        {t.auth.countryOfPractice}
      </Text>
      <View style={[styles.row, { flexDirection: dir }]}>
        {DOCTOR_SIGNUP_COUNTRY_CODES.map((code) => {
          const active = market === code;
          return (
            <Pressable
              key={code}
              disabled={disabled}
              onPress={() => pick(code)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
