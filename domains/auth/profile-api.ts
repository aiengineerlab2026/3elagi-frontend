import { API_BASE } from "@/constants/api";
import { withAuthRequestInit } from "@/domains/auth/http";
import {
  isAuthHttpStatus,
  logoutOnAuthFailure,
} from "@/domains/auth/sessionFailure";
import type { PatientProfile } from "./types";

async function authJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(
    `${API_BASE}${path}`,
    withAuthRequestInit(token, {
      ...init,
      headers: {
        ...init?.headers,
      },
    }),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthHttpStatus(res.status)) {
      logoutOnAuthFailure();
    }
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

interface RawUser {
  id: string;
  email: string;
  role: string;
  photo_url: string | null;
}

interface RawPatientDetail {
  id: string;
  email: string;
  name: string;
  phone: string;
  country?: string | null;
  birth_date?: string | null;
  photo_url?: string | null;
}

interface RawDoctor {
  id: string;
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  photo_url?: string | null;
  professional_title?: string | null;
  description?: string | null;
  personal_clinic_location?: string | null;
  certification_urls?: DoctorCertification[] | null;
  speciality_id?: string | null;
  speciality_ids?: string[] | null;
  speciality_name_en?: string | null;
  speciality_name_ar?: string | null;
  consultation_price?: number | null;
  video_consultation_price?: number | null;
  video_consultation_minutes?: number | null;
  immediate_call_enabled?: boolean | null;
  digital_signature_url?: string | null;
  iban?: string | null;
  account_holder_full_name?: string | null;
  national_id?: string | null;
  text_price_local?: string | number | null;
  text_price_usd?: string | number | null;
  video_price_local?: string | number | null;
  video_price_usd?: string | number | null;
  payment_link?: string | null;
  patient_payment_method?: "bank" | "wallet" | null;
  tags?: string[] | null;
  pending_speciality_change?: PendingSpecialityChange | null;
}

export interface PendingSpecialityChange {
  id: string;
  status: "pending";
  current_speciality_id: string | null;
  current_speciality_name_en: string | null;
  current_speciality_name_ar: string | null;
  requested_speciality_id: string;
  requested_speciality_ids: string[];
  requested_speciality_name_en: string;
  requested_speciality_name_ar: string;
  created_at: string;
}

export interface DoctorCertification {
  url: string;
  description: string;
}

export interface AccountProfile {
  userId: string;
  /** Doctors only: the doctor row id, needed for schedule/slot lookups. */
  doctorEntityId?: string;
  email: string;
  name: string;
  phone: string;
  country?: string;
  birthDate?: string;
  professionalTitle?: string;
  info?: string;
  location?: string;
  certifications?: DoctorCertification[];
  specialityId?: string;
  /** Every speciality the doctor practises; the first one is the primary. */
  specialityIds?: string[];
  specialityNameEn?: string;
  specialityNameAr?: string;
  consultationPrice?: number;
  videoConsultationPrice?: number;
  videoConsultationMinutes?: number;
  immediateCallEnabled?: boolean;
  digitalSignatureUrl?: string;
  iban?: string;
  accountHolderFullName?: string;
  nationalId?: string;
  /** Cash fees: home currency for patients in the doctor's country, USD abroad. */
  textPriceLocal?: number | null;
  textPriceUsd?: number | null;
  videoPriceLocal?: number | null;
  videoPriceUsd?: number | null;
  /** Wallet URL when patientPaymentMethod is wallet. */
  paymentLink?: string;
  patientPaymentMethod?: "bank" | "wallet";
  tags?: string[];
  photoUrl?: string;
  role: string;
  pendingSpecialityChange?: PendingSpecialityChange | null;
}

/** Money columns arrive as numeric strings from Postgres. */
function toFee(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickPhoto(user: RawUser, roleRow: { photo_url?: string | null }) {
  return roleRow.photo_url ?? user.photo_url ?? undefined;
}

export async function fetchAccountProfile(
  token: string,
  role: string,
): Promise<AccountProfile> {
  const user = await authJson<RawUser>("/users/me", token);
  const isDoctor = role.toLowerCase() === "doctor";

  if (isDoctor) {
    const doctor = await authJson<RawDoctor>("/doctors/me", token);
    return {
      userId: user.id,
      doctorEntityId: doctor.id,
      email: doctor.email ?? user.email,
      name: doctor.name,
      phone: doctor.phone ?? "",
      country: doctor.country ? String(doctor.country).toUpperCase() : "EG",
      professionalTitle: doctor.professional_title ?? undefined,
      info: doctor.description ?? undefined,
      location: doctor.personal_clinic_location ?? undefined,
      certifications: Array.isArray(doctor.certification_urls)
        ? doctor.certification_urls
        : [],
      specialityId: doctor.speciality_id ?? undefined,
      specialityIds: Array.isArray(doctor.speciality_ids)
        ? doctor.speciality_ids
        : doctor.speciality_id
          ? [doctor.speciality_id]
          : [],
      specialityNameEn: doctor.speciality_name_en ?? undefined,
      specialityNameAr: doctor.speciality_name_ar ?? undefined,
      consultationPrice: Math.min(100_000, Math.max(1, doctor.consultation_price ?? 1)),
      videoConsultationPrice: Math.min(
        100_000,
        Math.max(1, doctor.video_consultation_price ?? 1),
      ),
      videoConsultationMinutes: doctor.video_consultation_minutes ?? 30,
      immediateCallEnabled: !!doctor.immediate_call_enabled,
      digitalSignatureUrl: doctor.digital_signature_url ?? undefined,
      iban: doctor.iban ?? undefined,
      accountHolderFullName: doctor.account_holder_full_name ?? undefined,
      nationalId: doctor.national_id ?? undefined,
      textPriceLocal: toFee(doctor.text_price_local),
      textPriceUsd: toFee(doctor.text_price_usd),
      videoPriceLocal: toFee(doctor.video_price_local),
      videoPriceUsd: toFee(doctor.video_price_usd),
      paymentLink: doctor.payment_link ?? undefined,
      patientPaymentMethod:
        doctor.patient_payment_method === "wallet" ? "wallet" : "bank",
      tags: Array.isArray(doctor.tags) ? doctor.tags : [],
      photoUrl: pickPhoto(user, doctor),
      role: user.role,
      pendingSpecialityChange: doctor.pending_speciality_change ?? null,
    };
  }

  const patient = await authJson<RawPatientDetail>("/patient", token);
  return {
    userId: user.id,
    email: patient.email ?? user.email,
    name: patient.name,
    phone: patient.phone ?? "",
    country: patient.country ? String(patient.country).toUpperCase() : "EG",
    birthDate: patient.birth_date ?? undefined,
    photoUrl: pickPhoto(user, patient),
    role: user.role,
  };
}

export async function updateAccountProfile(
  token: string,
  role: string,
  payload: {
    name: string;
    phone: string;
    country?: string;
    birthDate?: string;
    professionalTitle?: string;
    info?: string;
    location?: string;
    certifications?: DoctorCertification[];
    specialityId?: string;
    specialityIds?: string[];
    consultationPrice?: number;
    videoConsultationPrice?: number;
    videoConsultationMinutes?: number;
    immediateCallEnabled?: boolean;
    digitalSignatureUrl?: string | null;
    iban?: string;
    accountHolderFullName?: string;
    nationalId?: string;
    textPriceLocal?: number | null;
    textPriceUsd?: number | null;
    videoPriceLocal?: number | null;
    videoPriceUsd?: number | null;
    paymentLink?: string;
    patientPaymentMethod?: "bank" | "wallet";
    tags?: string[];
    photoUrl?: string | null;
  },
): Promise<PatientProfile> {
  const isDoctor = role.toLowerCase() === "doctor";

  if (payload.photoUrl !== undefined) {
    await authJson<RawUser>("/users/me", token, {
      method: "PATCH",
      body: JSON.stringify({ photo_url: payload.photoUrl }),
    });
  }

  if (isDoctor) {
    const doctor = await authJson<RawDoctor>("/doctors/me", token, {
      method: "PATCH",
      body: JSON.stringify({
        name: payload.name.trim(),
        phone: payload.phone.trim(),
        country: payload.country?.trim().toUpperCase() || undefined,
        photo_url: payload.photoUrl ?? undefined,
        professional_title: payload.professionalTitle?.trim() || null,
        description: payload.info?.trim() || null,
        personal_clinic_location: payload.location?.trim() || null,
        certification_urls: payload.certifications ?? undefined,
        speciality_id: payload.specialityId ?? undefined,
        speciality_ids: payload.specialityIds ?? undefined,
        consultation_price: payload.consultationPrice ?? undefined,
        video_consultation_price: payload.videoConsultationPrice ?? undefined,
        video_consultation_minutes: payload.videoConsultationMinutes ?? undefined,
        immediate_call_enabled: payload.immediateCallEnabled ?? undefined,
        digital_signature_url:
          payload.digitalSignatureUrl !== undefined
            ? payload.digitalSignatureUrl
            : undefined,
        iban: payload.iban ?? undefined,
        account_holder_full_name: payload.accountHolderFullName ?? undefined,
        national_id: payload.nationalId ?? undefined,
        // Left out of the payload when undefined, so a partial update (the
        // availability toggle, say) cannot wipe prices it never carried.
        text_price_local: payload.textPriceLocal,
        text_price_usd: payload.textPriceUsd,
        video_price_local: payload.videoPriceLocal,
        video_price_usd: payload.videoPriceUsd,
        payment_link: payload.paymentLink,
        patient_payment_method: payload.patientPaymentMethod,
        tags: payload.tags,
      }),
    });
    return {
      id: doctor.user_id,
      name: doctor.name,
      email: doctor.email ?? "",
      phone: doctor.phone ?? undefined,
      country: doctor.country
        ? String(doctor.country).toUpperCase()
        : payload.country?.toUpperCase(),
      avatarUrl: doctor.photo_url ?? payload.photoUrl ?? undefined,
      createdAt: new Date().toISOString(),
    };
  }

  const profile = await authJson<{
    user_id: string;
    name: string;
    phone: string;
    country?: string;
    photo_url?: string | null;
  }>("/patient", token, {
    method: "PATCH",
    body: JSON.stringify({
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      country: payload.country?.trim().toUpperCase() || undefined,
      birth_date: payload.birthDate || undefined,
      photo_url: payload.photoUrl ?? undefined,
    }),
  });

  const user = await authJson<RawUser>("/users/me", token);

  return {
    id: profile.user_id,
    name: profile.name,
    email: user.email,
    phone: profile.phone,
    country: profile.country
      ? String(profile.country).toUpperCase()
      : payload.country?.toUpperCase(),
    avatarUrl: profile.photo_url ?? payload.photoUrl ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

export { authJson };
