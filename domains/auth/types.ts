export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** ISO 3166-1 alpha-2 residence country (patients). */
  country?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export type SignupRole = "patient" | "doctor" | "hospital";

export interface SignupFile {
  uri: string;
  mimeType: string;
  fileName: string;
}

export interface SignupInput extends Credentials {
  role: SignupRole;
  name: string;
  phone?: string;
  photo?: SignupFile;
  graduationCert?: SignupFile;
  workPermit?: SignupFile;
  specialityId?: string;
  /** Cash fees: home currency for patients in the doctor's country, USD abroad. */
  textPriceLocal?: number | null;
  textPriceUsd?: number | null;
  videoPriceLocal?: number | null;
  videoPriceUsd?: number | null;
  paymentLink?: string;
  /** @deprecated Legacy points price — defaults on the server when omitted. */
  consultationPrice?: number;
  /** ISO country code — patients: residence; doctors: practice country. */
  country?: string;
  /** Optional clinic address when signing up as a doctor. */
  clinicLocation?: string;
  medicalRecordsStorageConsent?: boolean;
  /** Hospital signup only. */
  location?: string;
  description?: string;
}

export type DoctorApprovalStatus = "pending" | "approved" | "rejected";

export type PreferredLocale = "ar" | "en" | "de" | "es";

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  role: string;
  userId: string;
  profile: PatientProfile;
  preferredLocale?: PreferredLocale | null;
  /** False until the user confirms the email verification code. */
  emailVerified?: boolean;
  /** Set when role is doctor */
  doctorId?: string;
  /** Set when role is doctor */
  specialty?: string;
  /** Doctor speciality catalog id */
  specialityId?: string;
  /** Doctor approval status from API */
  doctorApprovalStatus?: DoctorApprovalStatus | null;
}
