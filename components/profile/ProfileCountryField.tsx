import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CountrySelectField } from "@/components/auth/CountrySelectField";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import {
  MARKET_COUNTRY_CODES,
  type MarketCountryCode,
} from "@/constants/patientCountries";
import { useI18n } from "@/hooks/useI18n";

type Props = {
  value: MarketCountryCode;
  onChange: (code: MarketCountryCode) => void;
  disabled?: boolean;
  isRTL?: boolean;
};

/** Compact country dropdown for doctor market selection (EG / JO). */
export function ProfileCountryField({ value, onChange, disabled, isRTL }: Props) {
  const { t, isRTL: rtlFromHook } = useI18n();
  const rtl = isRTL ?? rtlFromHook;

  return (
    <View style={styles.wrap}>
      <Text
        style={[
          styles.label,
          { color: PROFILE_SETTINGS.text.section, textAlign: rtl ? "right" : "left" },
        ]}
      >
        {t.tabs.country}
      </Text>
      <CountrySelectField
        label=""
        value={value}
        codes={MARKET_COUNTRY_CODES}
        onChange={(code) => onChange(code as MarketCountryCode)}
        isRTL={rtl}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
});
