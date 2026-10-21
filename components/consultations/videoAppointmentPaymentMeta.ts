import type { UpcomingAppointment } from "@/domains/appointments/api";
import type { PaymentActionMeta } from "@/domains/chat/types";
import type { Translations } from "@/constants/translations";

export function videoAppointmentNeedsPaymentPanel(
  item: UpcomingAppointment,
): boolean {
  const status = item.payment_status ?? "none";
  return status === "awaiting_payment" || status === "proof_submitted";
}

export function toVideoAppointmentPaymentMeta(
  item: UpcomingAppointment,
): PaymentActionMeta {
  return {
    payment_status: item.payment_status ?? "none",
    payment_amount: item.payment_amount ?? null,
    payment_currency: item.payment_currency ?? null,
    payment_proof_url: item.payment_proof_url ?? null,
    payment_method: item.payment_method ?? null,
    payment_link: item.payment_link ?? null,
    doctor_iban: item.doctor_iban ?? null,
    doctor_account_holder: item.doctor_account_holder ?? null,
    doctor_national_id: item.doctor_national_id ?? null,
  };
}

export function videoAppointmentPaymentBadge(
  item: UpcomingAppointment,
  isDoctor: boolean,
  t: Translations,
  colors: { primary: string },
): { label: string; color: string } | null {
  const payment = item.payment_status ?? "none";
  if (payment === "none" || payment === "paid") return null;
  if (payment === "awaiting_payment") {
    return {
      label: isDoctor
        ? t.consultations.awaitingPatientPayment
        : t.consultations.paymentRequired,
      color: "#dc2626",
    };
  }
  if (payment === "proof_submitted") {
    return {
      label: isDoctor
        ? t.consultations.reviewReceipt
        : t.consultations.receiptPending,
      color: isDoctor ? colors.primary : "#f59e0b",
    };
  }
  return null;
}
