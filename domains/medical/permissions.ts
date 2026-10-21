import type { MedicalRecord } from "./types";

export interface MedicalRecordPermissionContext {
  userId: string;
  userRole: string;
  doctorId?: string | null;
  /** Viewing a patient's record as a doctor (doctorView route param). */
  isDoctorView?: boolean;
}

function isDoctorContext(ctx: MedicalRecordPermissionContext): boolean {
  return ctx.isDoctorView === true || ctx.userRole.toLowerCase() === "doctor";
}

/** Patients cannot edit diagnoses. Doctors may edit only diagnoses they created. */
export function canEditDiagnosis(
  record: MedicalRecord,
  ctx: MedicalRecordPermissionContext,
): boolean {
  if (record.category !== "diagnosis") return false;
  if (!isDoctorContext(ctx)) return false;
  if (!ctx.doctorId) return false;
  return record.doctorId === ctx.doctorId;
}

/** Same rules as diagnosis edit — adding symptoms modifies the diagnosis. */
export function canAddDiagnosisSymptom(
  record: MedicalRecord,
  ctx: MedicalRecordPermissionContext,
): boolean {
  return canEditDiagnosis(record, ctx);
}

/**
 * Patients may delete their own lab/x-ray records and local intake entries.
 * Doctors cannot delete or edit patient lab/imaging results.
 */
export function canDeleteMedicalRecord(
  record: MedicalRecord,
  ctx: MedicalRecordPermissionContext,
): boolean {
  if (record.category === "diagnosis") return false;

  if (record.category === "intake") {
    if (ctx.isDoctorView && isDoctorContext(ctx)) return true;
    return !isDoctorContext(ctx) && record.ownerId === ctx.userId;
  }

  if (isDoctorContext(ctx)) return false;

  if (record.category === "lab" || record.category === "xray") {
    return record.ownerId === ctx.userId;
  }

  return false;
}
