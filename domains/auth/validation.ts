import type { Translations } from "@/constants/translations";
import { isDoctorSignupCountryCode } from "@/constants/patientCountries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginFieldErrors {
  email?: string;
  password?: string;
}

export interface SignupFieldErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  country?: string;
  specialityId?: string;
  medicalRecordsConsent?: string;
}

export function hasFieldErrors<T extends object>(errors: T): boolean {
  return Object.values(errors as Record<string, string | undefined>).some(Boolean);
}

export function validateLoginFields(
  email: string,
  password: string,
  t: Translations["auth"],
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmedEmail = email.trim();
  const isAdminShortcut = trimmedEmail.toLowerCase() === "admin";

  if (!trimmedEmail) errors.email = t.fieldRequired;
  else if (!isAdminShortcut && !EMAIL_RE.test(trimmedEmail)) errors.email = t.invalidEmail;

  if (!password) errors.password = t.fieldRequired;

  return errors;
}

export function validateSignupFields(
  input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    isDoctor: boolean;
    /** Hospitals skip patient-only fields (country, medical consent). */
    isHospital?: boolean;
    specialityId: string;
    country?: string;
    medicalRecordsStorageConsent?: boolean;
  },
  t: Translations["auth"],
): SignupFieldErrors {
  const errors: SignupFieldErrors = {};

  if (!input.name.trim()) errors.name = t.fieldRequired;

  const trimmedEmail = input.email.trim();
  if (!trimmedEmail) errors.email = t.fieldRequired;
  else if (!EMAIL_RE.test(trimmedEmail)) errors.email = t.invalidEmail;

  if (!input.phone.trim()) errors.phone = t.fieldRequired;

  if (!input.password) errors.password = t.fieldRequired;
  else if (input.password.length < 6) errors.password = t.passwordTooShort;

  if (input.isDoctor && !input.specialityId) {
    errors.specialityId = t.specialityRequiredMsg;
  }

  if (input.isDoctor) {
    if (!input.country?.trim() || !isDoctorSignupCountryCode(input.country)) {
      errors.country = t.doctorMarketRequired;
    }
  } else if (!input.isHospital && !input.country?.trim()) {
    errors.country = t.countryRequired;
  }

  if (!input.isDoctor && !input.isHospital && !input.medicalRecordsStorageConsent) {
    errors.medicalRecordsConsent = t.medicalRecordsConsentRequired;
  }

  return errors;
}
