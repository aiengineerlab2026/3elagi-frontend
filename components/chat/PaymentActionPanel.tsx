import { ExternalLink, Receipt } from "lucide-react-native";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { PaymentActionMeta } from "@/domains/chat/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

function resolvePaymentMethod(meta: PaymentActionMeta): "bank" | "wallet" {
  if (meta.payment_method === "wallet" || meta.payment_method === "bank") {
    return meta.payment_method;
  }
  if (meta.payment_link?.trim()) return "wallet";
  return "bank";
}

function DoctorBankDetails({
  meta,
  textAlign,
}: {
  meta: PaymentActionMeta;
  textAlign: "left" | "right" | "center";
}) {
  const colors = useColors();
  const { t } = useI18n();
  const holder = meta.doctor_account_holder?.trim();
  const iban = meta.doctor_iban?.trim();
  const nationalId = meta.doctor_national_id?.trim();
  if (!holder && !iban && !nationalId) return null;

  return (
    <View
      style={[
        styles.bankCard,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.bankTitle, { color: colors.foreground, textAlign }]}>
        {t.payment.doctorBankTitle}
      </Text>
      {holder ? (
        <BankRow label={t.payment.accountHolder} value={holder} textAlign={textAlign} />
      ) : null}
      {iban ? <BankRow label={t.payment.iban} value={iban} textAlign={textAlign} mono /> : null}
      {nationalId ? (
        <BankRow label={t.payment.nationalId} value={nationalId} textAlign={textAlign} mono />
      ) : null}
      <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
        {t.payment.bankHint}
      </Text>
    </View>
  );
}

function DoctorWalletDetails({
  meta,
  textAlign,
}: {
  meta: PaymentActionMeta;
  textAlign: "left" | "right" | "center";
}) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const link = meta.payment_link?.trim();
  if (!link) return null;

  return (
    <View
      style={[
        styles.bankCard,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.bankTitle, { color: colors.foreground, textAlign }]}>
        {t.payment.doctorWalletTitle}
      </Text>
      <Pressable
        onPress={() => void Linking.openURL(link).catch(() => undefined)}
        accessibilityRole="link"
        accessibilityLabel={link}
      >
        <Text
          style={[styles.link, { color: colors.primary, textAlign }]}
          numberOfLines={3}
          selectable
        >
          {link}
        </Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
        {t.payment.walletHint}
      </Text>
      <LinkButton
        label={isRTL ? "ادفع الآن" : "Pay now"}
        url={link}
        color={colors.primary}
      />
    </View>
  );
}

function BankRow({
  label,
  value,
  textAlign,
  mono,
}: {
  label: string;
  value: string;
  textAlign: "left" | "right" | "center";
  mono?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.bankRow}>
      <Text style={[styles.bankLabel, { color: colors.mutedForeground, textAlign }]}>{label}</Text>
      <Text
        style={[
          styles.bankValue,
          mono && styles.bankMono,
          { color: colors.foreground, textAlign },
        ]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

export type PaymentReply = "submit" | "approve" | "reject";

type Props = {
  meta: PaymentActionMeta;
  isDoctor: boolean;
  busy?: boolean;
  /** When true, hide pay / attach / approve controls (e.g. cancelled appointment). */
  inactive?: boolean;
  onReply?: (reply: PaymentReply) => void;
};

/**
 * The money half of an appointment / consultation card: what is owed, where to
 * pay it, and the receipt the doctor has to approve before anything opens.
 */
export function PaymentActionPanel({ meta, isDoctor, busy, inactive, onReply }: Props) {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const status = meta.payment_status ?? "none";
  if (status === "none") return null;

  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const paymentMethod = resolvePaymentMethod(meta);
  const walletLink = meta.payment_link?.trim();
  const hasBankDetails =
    !!meta.doctor_iban?.trim() ||
    !!meta.doctor_account_holder?.trim() ||
    !!meta.doctor_national_id?.trim();
  const hasPaymentInstructions =
    paymentMethod === "wallet" ? !!walletLink : hasBankDetails;

  const amount =
    typeof meta.payment_amount === "number" && meta.payment_amount > 0
      ? `${meta.payment_amount} ${meta.payment_currency ?? ""}`.trim()
      : null;

  const headline =
    inactive
      ? isRTL
        ? "تم إلغاء الموعد"
        : "This appointment was cancelled"
      : status === "paid"
      ? isRTL
        ? "تم تأكيد الدفع"
        : "Payment confirmed"
      : status === "proof_submitted"
        ? isDoctor
          ? isRTL
            ? "المريض أرسل إيصال الدفع"
            : "The patient sent a payment receipt"
          : isRTL
            ? "بانتظار تأكيد الطبيب للدفع"
            : "Waiting for the doctor to confirm your payment"
        : isDoctor
          ? isRTL
            ? "بانتظار دفع المريض"
            : "Waiting for the patient to pay"
          : isRTL
            ? "مطلوب الدفع قبل التأكيد"
            : "Payment required before this is confirmed";

  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      <Text style={[styles.headline, { color: colors.foreground, textAlign }]}>
        {headline}
      </Text>
      {amount ? (
        <Text style={[styles.amount, { color: colors.primary, textAlign }]}>{amount}</Text>
      ) : null}

      {!inactive && status === "awaiting_payment" && !isDoctor ? (
        paymentMethod === "wallet" ? (
          <DoctorWalletDetails meta={meta} textAlign={textAlign} />
        ) : (
          <DoctorBankDetails meta={meta} textAlign={textAlign} />
        )
      ) : null}

      {!inactive && status === "awaiting_payment" && !hasPaymentInstructions ? (
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
          {isDoctor
            ? paymentMethod === "wallet"
              ? t.payment.doctorMissingWallet
              : t.payment.doctorMissingBank
            : paymentMethod === "wallet"
              ? t.payment.patientMissingWallet
              : t.payment.patientMissingBank}
        </Text>
      ) : null}

      <View style={[styles.actions, { flexDirection: dir }]}>
        {!inactive && !isDoctor && status === "awaiting_payment" ? (
          <ActionButton
            label={isRTL ? "إرفاق الإيصال" : "Attach receipt"}
            filled
            color={colors.primary}
            busy={busy}
            onPress={() => onReply?.("submit")}
          />
        ) : null}
        {meta.payment_proof_url ? (
          <LinkButton
            label={isRTL ? "عرض الإيصال" : "View receipt"}
            url={meta.payment_proof_url}
            color={colors.primary}
            icon="receipt"
          />
        ) : null}
        {!inactive && isDoctor && status === "proof_submitted" ? (
          <>
            <ActionButton
              label={isRTL ? "اعتماد" : "Approve"}
              filled
              color="#10b981"
              busy={busy}
              onPress={() => onReply?.("approve")}
            />
            <ActionButton
              label={isRTL ? "رفض" : "Reject"}
              color="#dc2626"
              busy={busy}
              onPress={() => onReply?.("reject")}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

function LinkButton({
  label,
  url,
  color,
  icon,
}: {
  label: string;
  url: string;
  color: string;
  icon?: "receipt";
}) {
  const Icon = icon === "receipt" ? Receipt : ExternalLink;
  return (
    <Pressable
      onPress={() => void Linking.openURL(url).catch(() => undefined)}
      style={({ pressed }) => [
        styles.btn,
        styles.btnOutline,
        { borderColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon size={14} color={color} />
      <Text style={[styles.btnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  color,
  filled,
  busy,
  onPress,
}: {
  label: string;
  color: string;
  filled?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={busy}
      onPress={(event) => {
        event?.stopPropagation?.();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        filled ? { backgroundColor: color } : [styles.btnOutline, { borderColor: color }],
        { opacity: busy ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.btnText, { color: filled ? "#fff" : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  headline: { fontSize: 13, fontWeight: "700" },
  link: {
    fontSize: 12.5,
    fontWeight: "600",
    textDecorationLine: "underline",
    lineHeight: 17,
  },
  hint: { fontSize: 12, lineHeight: 16 },
  bankCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 2,
  },
  bankTitle: { fontSize: 13, fontWeight: "800" },
  bankRow: { gap: 2 },
  bankLabel: { fontSize: 11, fontWeight: "600" },
  bankValue: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  bankMono: { fontFamily: "monospace" },
  amount: { fontSize: 15, fontWeight: "800" },
  actions: { gap: 8, flexWrap: "wrap", marginTop: 2 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnOutline: { borderWidth: 1 },
  btnText: { fontSize: 13, fontWeight: "700" },
});
