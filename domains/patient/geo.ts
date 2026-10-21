import { useAuthStore } from "@/domains/auth/store";
import { detectCountryFromIp } from "@/domains/points/detectCountry";

/** Signed-in patient's declared residence country, if any. */
export function patientProfileCountry(): string | null {
  const { role, profile } = useAuthStore.getState();
  if (role?.toLowerCase() !== "patient") return null;
  const code = profile?.country?.trim().toUpperCase();
  return code || null;
}

/** Patient residence from profile; falls back to IP when unset or not a patient. */
export async function resolvePatientGeoCountry(): Promise<string | null> {
  const profile = patientProfileCountry();
  if (profile) return profile;
  return detectCountryFromIp().catch(() => null);
}

/** Consultation pricing country from the patient's current location (IP), then profile. */
export async function resolveConsultationGeoCountry(): Promise<string | null> {
  const fromIp = await detectCountryFromIp().catch(() => null);
  if (fromIp) return fromIp;
  return patientProfileCountry();
}
