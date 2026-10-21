export type PatientRecentVitals = {
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRateBpm?: number | null;
  weightKg?: number | null;
  updatedAt?: string | null;
};

export type PatientVitalsUpdate = {
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRateBpm?: number | null;
  weightKg?: number | null;
};

export const EMPTY_PATIENT_VITALS: PatientRecentVitals = {};
