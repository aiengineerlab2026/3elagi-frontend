import type { LinkedDiagnosisSummary, MedicalCategory, MedicalRecord } from "./types";

/** Record types that may reference one or more diagnoses. */
export const RECORD_CATEGORIES_WITH_LINKED_DIAGNOSES: MedicalCategory[] = [
  "lab",
  "xray",
  "prescription",
  "intake",
];

export function recordShowsLinkedDiagnoses(category: MedicalCategory): boolean {
  return RECORD_CATEGORIES_WITH_LINKED_DIAGNOSES.includes(category);
}

export function linkedDiagnosesForRecord(record: MedicalRecord): LinkedDiagnosisSummary[] {
  return record.linkedDiagnoses ?? [];
}
