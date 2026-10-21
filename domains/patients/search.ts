import type { DoctorPatientListItem } from "@/domains/medical";

export interface PatientSearchFilters {
  text: string;
}

export const EMPTY_PATIENT_FILTERS: PatientSearchFilters = { text: "" };

export function hasActivePatientFilters(filters: PatientSearchFilters): boolean {
  return filters.text.trim().length > 0;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s\-()+]/g, "");
}

export function filterPatients(
  patients: DoctorPatientListItem[],
  filters: PatientSearchFilters,
): DoctorPatientListItem[] {
  const q = filters.text.trim();
  if (!q) return patients;

  const qNorm = normalize(q);
  const qLower = q.toLowerCase();

  return patients.filter((patient) => {
    const name = patient.name ?? "";
    const email = patient.email ?? "";
    const phone = patient.phone ?? "";

    return (
      name.toLowerCase().includes(qLower) ||
      email.toLowerCase().includes(qLower) ||
      phone.toLowerCase().includes(qLower) ||
      normalize(name).includes(qNorm) ||
      normalize(email).includes(qNorm) ||
      normalize(phone).includes(qNorm)
    );
  });
}
