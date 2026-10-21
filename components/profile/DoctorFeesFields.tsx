import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import { patientCountryLabel } from "@/constants/patientCountries";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

/** Home currency of the doctor's market; everyone abroad pays USD. */
export function localFeeCurrency(
  country?: string | null,
): "EGP" | "JOD" | "USD" | "GBP" {
  const code = country?.trim().toUpperCase();
  if (code === "EG") return "EGP";
  if (code === "JO") return "JOD";
  if (code === "GB") return "GBP";
  return "USD";
}

type Props = {
  country?: string | null;
  textLocal: string;
  onTextLocal: (v: string) => void;
  textUsd: string;
  onTextUsd: (v: string) => void;
  videoLocal: string;
  onVideoLocal: (v: string) => void;
  videoUsd: string;
  onVideoUsd: (v: string) => void;
  disabled?: boolean;
  /** Side-by-side local / USD cards with currency prefixes. */
  layout?: "stacked" | "comparative";
};

export function DoctorFeesFields({
  country,
  textLocal,
  onTextLocal,
  textUsd,
  onTextUsd,
  videoLocal,
  onVideoLocal,
  videoUsd,
  onVideoUsd,
  disabled,
  layout = "stacked",
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const home = patientCountryLabel(country, isRTL);
  const currency = localFeeCurrency(country);
  const localLabel = isRTL ? `محلي (${currency})` : `Local (${currency})`;
  const intlLabel = isRTL ? "دولي (USD)" : "International (USD)";

  if (layout === "comparative") {
    return (
      <View style={styles.wrap}>
        <FeePair
          title={isRTL ? "استشارة نصية" : "Text consultation"}
          localLabel={localLabel}
          intlLabel={intlLabel}
          localValue={textLocal}
          onLocalChange={onTextLocal}
          intlValue={textUsd}
          onIntlChange={onTextUsd}
          localCurrency={currency}
          intlCurrency="USD"
          disabled={disabled}
          isRTL={isRTL}
          isDesktop={isDesktop}
          localTestID="profile-local-price"
        />
        <FeePair
          title={isRTL ? "استشارة فيديو" : "Video consultation"}
          localLabel={localLabel}
          intlLabel={intlLabel}
          localValue={videoLocal}
          onLocalChange={onVideoLocal}
          intlValue={videoUsd}
          onIntlChange={onVideoUsd}
          localCurrency={currency}
          intlCurrency="USD"
          disabled={disabled}
          isRTL={isRTL}
          isDesktop={isDesktop}
        />
      </View>
    );
  }

  const inside = isRTL ? `داخل ${home} (${currency})` : `Inside ${home} (${currency})`;
  const outside = isRTL ? `خارج ${home} (دولار)` : `Outside ${home} (USD)`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.groupLabel, { color: colors.foreground }]}>
        {isRTL ? "استشارة نصية" : "Text consultation"}
      </Text>
      <FeeInput
        testID="profile-local-price"
        label={inside}
        value={textLocal}
        onChangeText={onTextLocal}
        disabled={disabled}
      />
      <FeeInput
        testID="profile-outside-price"
        label={outside}
        value={textUsd}
        onChangeText={onTextUsd}
        disabled={disabled}
      />
      <Text style={[styles.groupLabel, { color: colors.foreground }]}>
        {isRTL ? "استشارة فيديو" : "Video consultation"}
      </Text>
      <FeeInput label={inside} value={videoLocal} onChangeText={onVideoLocal} disabled={disabled} />
      <FeeInput label={outside} value={videoUsd} onChangeText={onVideoUsd} disabled={disabled} />
    </View>
  );
}

function FeePair({
  title,
  localLabel,
  intlLabel,
  localValue,
  onLocalChange,
  intlValue,
  onIntlChange,
  localCurrency,
  intlCurrency,
  disabled,
  isRTL,
  isDesktop,
  localTestID,
}: {
  title: string;
  localLabel: string;
  intlLabel: string;
  localValue: string;
  onLocalChange: (v: string) => void;
  intlValue: string;
  onIntlChange: (v: string) => void;
  localCurrency: string;
  intlCurrency: string;
  disabled?: boolean;
  isRTL: boolean;
  isDesktop: boolean;
  localTestID?: string;
}) {
  const rowStyle: ViewStyle = isDesktop
    ? ({ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 } as ViewStyle)
    : { flexDirection: "column", gap: 12 };

  return (
    <View style={styles.pairWrap}>
      <Text style={[styles.groupLabel, { color: PROFILE_SETTINGS.text.section }]}>{title}</Text>
      <View style={rowStyle}>
        <CurrencyFeeCard
          label={localLabel}
          currency={localCurrency}
          value={localValue}
          onChangeText={onLocalChange}
          disabled={disabled}
          isRTL={isRTL}
          testID={localTestID}
        />
        <CurrencyFeeCard
          label={intlLabel}
          currency={intlCurrency}
          value={intlValue}
          onChangeText={onIntlChange}
          disabled={disabled}
          isRTL={isRTL}
        />
      </View>
    </View>
  );
}

function CurrencyFeeCard({
  label,
  currency,
  value,
  onChangeText,
  disabled,
  isRTL,
  testID,
}: {
  label: string;
  currency: string;
  value: string;
  onChangeText: (v: string) => void;
  disabled?: boolean;
  isRTL: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const textAlign = isRTL ? "right" : "left";

  return (
    <View
      style={[
        styles.feeCard,
        { borderColor: PROFILE_SETTINGS.border, backgroundColor: PROFILE_SETTINGS.bg.app, flex: 1 },
      ]}
      testID={testID}
    >
      <Text style={[styles.cardLabel, { color: PROFILE_SETTINGS.text.section, textAlign }]}>{label}</Text>
      <View style={[styles.currencyInputRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.currencyPrefix, { backgroundColor: `${PROFILE_SETTINGS.brand}12` }]}>
          <Text style={{ color: PROFILE_SETTINGS.brand, fontWeight: "800", fontSize: 13 }}>{currency}</Text>
        </View>
        <AppTextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          placeholder="0"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          autoCapitalize="none"
          style={[
            styles.currencyInput,
            {
              color: colors.foreground,
              textAlign,
            },
          ]}
        />
      </View>
    </View>
  );
}

function FeeInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "decimal-pad",
  disabled,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "decimal-pad" | "default";
  disabled?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const textAlign = isRTL ? "right" : "left";

  return (
    <View style={styles.field} testID={testID}>
      <Text style={[styles.label, { color: PROFILE_SETTINGS.text.section, textAlign }]}>{label}</Text>
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: PROFILE_SETTINGS.border,
            backgroundColor: PROFILE_SETTINGS.bg.card,
            textAlign,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  pairWrap: { gap: 10 },
  groupLabel: { fontSize: 14, fontWeight: "800" },
  feeCard: {
    borderWidth: 1,
    borderRadius: PROFILE_SETTINGS.radius.card,
    padding: 14,
    gap: 8,
    minWidth: 0,
  },
  cardLabel: { fontSize: 12, fontWeight: "700" },
  currencyInputRow: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: PROFILE_SETTINGS.border,
    borderRadius: PROFILE_SETTINGS.radius.control,
    overflow: "hidden",
    backgroundColor: PROFILE_SETTINGS.bg.card,
  },
  currencyPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
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
  hint: { fontSize: 12, lineHeight: 17 },
});
