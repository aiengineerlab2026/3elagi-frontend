import type { Consultation } from "@/domains/consultations/api";

/**
 * What the patient actually paid for consultations, per currency.
 * Doctors price in EGP, JOD or USD, so a single number would be a lie —
 * amounts are grouped and shown side by side.
 */
export function paidConsultationTotals(
  list: Pick<Consultation, "payment_status" | "payment_amount" | "payment_currency">[],
): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const c of list) {
    if (c.payment_status !== "paid") continue;
    const amount = Number(c.payment_amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const currency = (c.payment_currency ?? "USD").toUpperCase();
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }
  return [...totals.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);
}

/** "1,250 EGP · 40 USD", or "0" when nothing has been paid yet. */
export function formatPaidTotals(
  totals: { currency: string; total: number }[],
): string {
  if (!totals.length) return "0";
  return totals
    .map(
      ({ currency, total }) =>
        `${total.toLocaleString("en-US", {
          maximumFractionDigits: total % 1 === 0 ? 0 : 2,
        })} ${currency}`,
    )
    .join(" · ");
}
