import type { DoctorSignupCountryCode } from "@/constants/patientCountries";
import { getUrlMarketCountry } from "@/domains/market/resolveMarketCountry";

/**
 * In-app override for doctor signup when the runtime URL has no market hint
 * (typical on native shells). Cleared when leaving doctor signup if needed.
 */
let doctorSignupMarketOverride: DoctorSignupCountryCode | null = null;

export function setDoctorSignupMarketOverride(
  market: DoctorSignupCountryCode | null,
): void {
  doctorSignupMarketOverride = market;
}

export function getDoctorSignupMarketOverride(): DoctorSignupCountryCode | null {
  return doctorSignupMarketOverride;
}

/** An explicit pick wins; otherwise the market implied by the URL. */
export function getDoctorSignupMarket(): DoctorSignupCountryCode | null {
  return doctorSignupMarketOverride ?? getUrlMarketCountry();
}
