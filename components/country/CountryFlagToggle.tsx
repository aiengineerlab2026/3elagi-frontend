import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  MARKET_COUNTRY_CODES,
  countryFlagEmoji,
  marketCurrencyCode,
  normalizeMarketCountry,
  patientCountryLabel,
  type MarketCountryCode,
} from "@/constants/patientCountries";
import { updateAccountProfile } from "@/domains/auth/profile-api";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";
import { showErrorToast } from "@/utils/toast";

type Props = {
  /** Controlled value — omit to read/write auth profile. */
  value?: MarketCountryCode;
  onChange?: (code: MarketCountryCode) => void;
  /** Persist to profile on select (sidebar). Default true when uncontrolled. */
  persist?: boolean;
  disabled?: boolean;
  /** Show country name under the flag. */
  showNames?: boolean;
  /** Smaller cards for tight layouts (side drawer). */
  compact?: boolean;
};

/**
 * Side-by-side Egypt / Jordan flag buttons. Selected market is highlighted.
 */
export function CountryFlagToggle({
  value,
  onChange,
  persist,
  disabled,
  showNames = true,
  compact = false,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setProfile = useAuthStore((s) => s.setProfile);
  const controlled = value !== undefined;
  const selected = normalizeMarketCountry(controlled ? value : profile?.country);
  const shouldPersist = persist ?? !controlled;
  const [saving, setSaving] = useState(false);
  const dir = flexRow(isRTL);

  const select = async (next: MarketCountryCode) => {
    if (disabled || saving) return;
    if (next === selected) {
      onChange?.(next);
      return;
    }
    onChange?.(next);
    if (!shouldPersist || !accessToken || !role || !profile) return;

    setSaving(true);
    try {
      const updated = await updateAccountProfile(accessToken, role, {
        name: profile.name,
        phone: profile.phone ?? "",
        country: next,
      });
      setProfile({ ...profile, ...updated, country: next });
    } catch (e) {
      showErrorToast(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : "Failed to update country",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.row, { flexDirection: dir }]}>
      {MARKET_COUNTRY_CODES.map((code) => {
        const active = selected === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={patientCountryLabel(code, isRTL)}
            disabled={disabled || saving}
            onPress={() => void select(code)}
            style={({ pressed }) => [
              styles.option,
              compact && styles.optionCompact,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? `${colors.primary}14` : colors.card,
                opacity: disabled || saving ? 0.7 : pressed ? 0.92 : 1,
              },
            ]}
          >
            {saving && active ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.flag, compact && styles.flagCompact]}>
                {countryFlagEmoji(code)}
              </Text>
            )}
            {showNames ? (
              <Text
                style={[
                  styles.name,
                  compact && styles.nameCompact,
                  { color: active ? colors.primary : colors.foreground },
                ]}
                numberOfLines={1}
              >
                {patientCountryLabel(code, isRTL)}
              </Text>
            ) : null}
            <Text
              style={[
                styles.currency,
                compact && styles.currencyCompact,
                { color: active ? colors.primary : colors.mutedForeground },
              ]}
            >
              {marketCurrencyCode(code)}
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
    gap: 10,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 88,
  },
  optionCompact: {
    gap: 2,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 64,
  },
  flag: {
    fontSize: 28,
    lineHeight: 34,
  },
  flagCompact: {
    fontSize: 22,
    lineHeight: 26,
  },
  name: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  nameCompact: {
    fontSize: 12,
  },
  currency: {
    fontSize: 11,
    fontWeight: "700",
  },
  currencyCompact: {
    fontSize: 10,
  },
});
