import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { PROFILE_SETTINGS } from "@/constants/profileSettingsDesign";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

export type PatientPaymentMethod = "bank" | "wallet";

type Props = {
  method: PatientPaymentMethod;
  onMethodChange: (method: PatientPaymentMethod) => void;
  paymentLink: string;
  onPaymentLinkChange: (value: string) => void;
  iban: string;
  onIbanChange: (value: string) => void;
  accountHolderFullName: string;
  onAccountHolderFullNameChange: (value: string) => void;
  nationalId: string;
  onNationalIdChange: (value: string) => void;
  disabled?: boolean;
};

export function DoctorPaymentMethodFields({
  method,
  onMethodChange,
  paymentLink,
  onPaymentLinkChange,
  iban,
  onIbanChange,
  accountHolderFullName,
  onAccountHolderFullNameChange,
  nationalId,
  onNationalIdChange,
  disabled,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const textAlign = isRTL ? "right" : "left";
  const dir = isRTL ? "row-reverse" : "row";

  const options: { id: PatientPaymentMethod; en: string; ar: string }[] = [
    { id: "bank", en: "Bank transfer", ar: "تحويل بنكي" },
    { id: "wallet", en: "Mobile wallet", ar: "محفظة إلكترونية" },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: PROFILE_SETTINGS.text.section, textAlign }]}>
        {isRTL ? "طريقة الدفع للمريض" : "How patients pay you"}
      </Text>
      <View style={[styles.methodRow, { flexDirection: dir }]}>
        {options.map((opt) => {
          const on = method === opt.id;
          return (
            <Pressable
              key={opt.id}
              disabled={disabled}
              onPress={() => onMethodChange(opt.id)}
              style={[
                styles.methodChip,
                {
                  borderColor: on ? PROFILE_SETTINGS.brand : PROFILE_SETTINGS.border,
                  backgroundColor: on ? `${PROFILE_SETTINGS.brand}14` : PROFILE_SETTINGS.bg.app,
                },
              ]}
            >
              <Text
                style={{
                  color: on ? PROFILE_SETTINGS.brand : colors.foreground,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                {isRTL ? opt.ar : opt.en}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {method === "wallet" ? (
        <>
          <Field
            label={isRTL ? "رابط المحفظة" : "Wallet URL"}
            value={paymentLink}
            onChangeText={onPaymentLinkChange}
            placeholder="https://…"
            keyboardType="default"
            autoCapitalize="none"
            disabled={disabled}
            textAlign={textAlign}
            colors={colors}
          />
          <Text style={[styles.hint, { color: PROFILE_SETTINGS.text.secondary, textAlign }]}>
            {isRTL
              ? "يظهر هذا الرابط للمريض عند طلب الدفع — Vodafone Cash أو InstaPay أو أي محفظة."
              : "Patients see this link when payment is requested — Vodafone Cash, InstaPay, or any wallet."}
          </Text>
        </>
      ) : (
        <>
          <Field
            label={isRTL ? "الاسم الكامل لصاحب الحساب" : "Account holder full name"}
            value={accountHolderFullName}
            onChangeText={onAccountHolderFullNameChange}
            placeholder={isRTL ? "كما هو مسجل في البنك" : "As registered at the bank"}
            disabled={disabled}
            textAlign={textAlign}
            colors={colors}
          />
          <Field
            label={isRTL ? "رقم الحساب / IBAN" : "IBAN"}
            value={iban}
            onChangeText={onIbanChange}
            placeholder="EGxxxxxxxxxxxxxxxxxxxxxxxxxx"
            autoCapitalize="characters"
            disabled={disabled}
            textAlign={textAlign}
            colors={colors}
          />
          <Field
            label={isRTL ? "الرقم القومي" : "National ID"}
            value={nationalId}
            onChangeText={onNationalIdChange}
            placeholder={isRTL ? "14 رقمًا" : "14-digit national ID"}
            keyboardType="number-pad"
            disabled={disabled}
            textAlign={textAlign}
            colors={colors}
          />
          <Text style={[styles.hint, { color: PROFILE_SETTINGS.text.secondary, textAlign }]}>
            {isRTL
              ? "تظهر بيانات الحساب للمريض عند طلب الدفع، ثم يرفق إيصال التحويل."
              : "Patients see these bank details when payment is requested, then attach the transfer receipt."}
          </Text>
        </>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize,
  disabled,
  textAlign,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
  autoCapitalize?: "none" | "characters";
  disabled?: boolean;
  textAlign: "left" | "right";
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: PROFILE_SETTINGS.text.section, textAlign }]}>{label}</Text>
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
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
  wrap: { gap: 12 },
  methodRow: { flexWrap: "wrap", gap: 8 },
  methodChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
