import { API_BASE } from "@/constants/api";
import { withAuthRequestInit } from "@/domains/auth/http";
import {
  isAuthHttpStatus,
  logoutOnAuthFailure,
} from "@/domains/auth/sessionFailure";
import type { PatientRecentVitals, PatientVitalsUpdate } from "./types";

interface RawVitals {
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  heart_rate_bpm?: number | null;
  weight_kg?: number | null;
  updated_at?: string | null;
}

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
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
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

function mapVitals(raw: RawVitals | null | undefined): PatientRecentVitals {
  if (!raw) return {};
  return {
    bloodPressureSystolic: raw.blood_pressure_systolic ?? null,
    bloodPressureDiastolic: raw.blood_pressure_diastolic ?? null,
    heartRateBpm: raw.heart_rate_bpm ?? null,
    weightKg: raw.weight_kg ?? null,
    updatedAt: raw.updated_at ?? null,
  };
}

function toRawUpdate(payload: PatientVitalsUpdate): RawVitals {
  return {
    blood_pressure_systolic: payload.bloodPressureSystolic ?? null,
    blood_pressure_diastolic: payload.bloodPressureDiastolic ?? null,
    heart_rate_bpm: payload.heartRateBpm ?? null,
    weight_kg: payload.weightKg ?? null,
  };
}

export async function fetchMyPatientVitals(token: string): Promise<PatientRecentVitals> {
  const data = await authJson<RawVitals>("/patient/vitals", token);
  return mapVitals(data);
}

export async function fetchPatientVitalsForUser(
  patientUserId: string,
  token: string,
): Promise<PatientRecentVitals> {
  const data = await authJson<RawVitals>(
    `/patients/${encodeURIComponent(patientUserId)}/vitals`,
    token,
  );
  return mapVitals(data);
}

export async function updateMyPatientVitals(
  token: string,
  payload: PatientVitalsUpdate,
): Promise<PatientRecentVitals> {
  const data = await authJson<RawVitals>("/patient/vitals", token, {
    method: "PATCH",
    body: JSON.stringify(toRawUpdate(payload)),
  });
  return mapVitals(data);
}
