import type { PatientRecentVitals, PatientVitalsUpdate } from "./types";

export function formatBloodPressure(vitals: PatientRecentVitals, empty = "—"): string {
  const sys = vitals.bloodPressureSystolic;
  const dia = vitals.bloodPressureDiastolic;
  if (sys != null && dia != null) return `${sys}/${dia}`;
  if (sys != null) return String(sys);
  if (dia != null) return String(dia);
  return empty;
}

export function formatHeartRate(vitals: PatientRecentVitals, empty = "—"): string {
  if (vitals.heartRateBpm == null) return empty;
  return `${vitals.heartRateBpm} bpm`;
}

export function formatWeight(vitals: PatientRecentVitals, empty = "—"): string {
  if (vitals.weightKg == null) return empty;
  return `${vitals.weightKg} kg`;
}

export function parseBloodPressureInput(raw: string): {
  systolic: number | null;
  diastolic: number | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { systolic: null, diastolic: null };
  const match = trimmed.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!match) return { systolic: null, diastolic: null };
  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

export function bloodPressureInputFromVitals(vitals: PatientRecentVitals): string {
  const sys = vitals.bloodPressureSystolic;
  const dia = vitals.bloodPressureDiastolic;
  if (sys != null && dia != null) return `${sys}/${dia}`;
  return "";
}

export function vitalsHasAnyValue(vitals: PatientRecentVitals): boolean {
  return (
    vitals.bloodPressureSystolic != null ||
    vitals.bloodPressureDiastolic != null ||
    vitals.heartRateBpm != null ||
    vitals.weightKg != null
  );
}

export function vitalsToUpdatePayload(
  bloodPressure: string,
  heartRate: string,
  weight: string,
): PatientVitalsUpdate {
  const bp = parseBloodPressureInput(bloodPressure);
  const hr = heartRate.trim();
  const wt = weight.trim();
  return {
    bloodPressureSystolic: bp.systolic,
    bloodPressureDiastolic: bp.diastolic,
    heartRateBpm: hr ? Number(hr) : null,
    weightKg: wt ? Number(wt) : null,
  };
}
