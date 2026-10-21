import type { Consultation } from "@/domains/consultations/api";
import type { PaymentActionMeta } from "@/domains/chat/types";
import type { Translations } from "@/constants/translations";

export function consultationNeedsPaymentPanel(item: Consultation): boolean {
  const status = item.payment_status ?? "none";
  return (
    item.status === "pending" &&
    (status === "awaiting_payment" || status === "proof_submitted")
  );
}

export function toConsultationPaymentMeta(
  item: Consultation,
  paymentLink?: string | null,
): PaymentActionMeta {
  return {
    payment_status: item.payment_status ?? "none",
    payment_amount: item.payment_amount ?? null,
    payment_currency: item.payment_currency ?? null,
    payment_proof_url: item.payment_proof_url ?? null,
    payment_method: item.payment_method ?? null,
    payment_link: item.payment_link ?? paymentLink ?? null,
    doctor_iban: item.doctor_iban ?? null,
    doctor_account_holder: item.doctor_account_holder ?? null,
    doctor_national_id: item.doctor_national_id ?? null,
  };
}

export function consultationPaymentBadge(
  item: Consultation,
  isDoctor: boolean,
  t: Translations,
  colors: { primary: string; mutedForeground: string },
): { label: string; color: string; prominent: boolean; muted: boolean } | null {
  const payment = item.payment_status ?? "none";
  if (item.status !== "pending" || payment === "none" || payment === "paid") {
    return null;
  }
  if (payment === "awaiting_payment") {
    return {
      label: isDoctor
        ? t.consultations.awaitingPatientPayment
        : t.consultations.paymentRequired,
      color: "#dc2626",
      prominent: true,
      muted: false,
    };
  }
  if (payment === "proof_submitted") {
    return {
      label: isDoctor
        ? t.consultations.reviewReceipt
        : t.consultations.receiptPending,
      color: isDoctor ? colors.primary : "#f59e0b",
      prominent: true,
      muted: false,
    };
  }
  return null;
}
