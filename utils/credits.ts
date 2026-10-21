import type { Translations } from "@/constants/translations";
import { marketCurrencyLabel, normalizeMarketCountry } from "@/constants/patientCountries";
import { getApiLang, getDict } from "@/domains/i18n/store";

function dict(t?: Translations): Translations {
  return t ?? getDict(getApiLang());
}

function preferArabic(): boolean {
  return getApiLang() === "ar";
}

function resolveCountry(country?: string | null): string {
  if (country != null && String(country).trim()) {
    return normalizeMarketCountry(country);
  }
  try {
    // Lazy import avoids circular init with auth store consumers.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require("@/domains/auth/store") as typeof import("@/domains/auth/store");
    return normalizeMarketCountry(useAuthStore.getState().profile?.country);
  } catch {
    return "EG";
  }
}

/** Format a credit balance / fee in points (not cash). */
export function formatEgp(amount: number, t?: Translations, _country?: string | null): string {
  return dict(t).credits.egp(Math.round(amount));
}

export function formatEgpPerUnit(
  amount: number,
  t?: Translations,
  _country?: string | null,
): string {
  return dict(t).credits.egpPerConsultation(Math.round(amount));
}

/** Suffix for point amounts ("points" / "نقطة"). */
export function currencySuffix(t?: Translations, _country?: string | null): string {
  return dict(t).credits.currencySuffix;
}

/** Format cash for checkout (always USD for credit purchase). */
export function formatMoney(
  amount: number,
  t?: Translations,
  _country?: string | null,
): string {
  const label = marketCurrencyLabel(null, preferArabic());
  return `${Math.round(amount)} ${label}`;
}

export function moneyCurrencySuffix(country?: string | null): string {
  return marketCurrencyLabel(resolveCountry(country), preferArabic());
}
