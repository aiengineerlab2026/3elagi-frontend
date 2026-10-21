import { describe, expect, it } from "vitest";
import { formatPaidTotals, paidConsultationTotals } from "./paidTotals";

const row = (
  payment_status: "none" | "awaiting_payment" | "proof_submitted" | "paid",
  payment_amount: number | null,
  payment_currency: string | null,
) => ({ payment_status, payment_amount, payment_currency });

describe("paid consultation totals", () => {
  it("counts only payments the doctor approved", () => {
    const totals = paidConsultationTotals([
      row("paid", 200, "EGP"),
      row("proof_submitted", 500, "EGP"),
      row("awaiting_payment", 900, "EGP"),
      row("none", 10, "EGP"),
    ]);
    expect(totals).toEqual([{ currency: "EGP", total: 200 }]);
  });

  it("keeps currencies apart instead of adding them up", () => {
    const totals = paidConsultationTotals([
      row("paid", 200, "EGP"),
      row("paid", 50, "egp"),
      row("paid", 40, "USD"),
    ]);
    expect(totals).toEqual([
      { currency: "EGP", total: 250 },
      { currency: "USD", total: 40 },
    ]);
    expect(formatPaidTotals(totals)).toBe("250 EGP · 40 USD");
  });

  it("ignores missing or nonsense amounts", () => {
    expect(paidConsultationTotals([row("paid", null, "EGP"), row("paid", 0, "USD")])).toEqual([]);
    expect(formatPaidTotals([])).toBe("0");
  });
});
