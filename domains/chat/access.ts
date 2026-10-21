import { API_BASE } from "@/constants/api";
import { withAuthRequestInit } from "@/domains/auth/http";
import type { AccessActionType } from "./types";

export interface DoctorPatientAccessStatus {
  patient_user_id: string;
  doctor_id: string;
  doctor_user_id: string;
  records_allowed: boolean;
  blocked_by_patient: boolean;
  blocked_by_doctor: boolean;
  is_blocked: boolean;
  records_allowed_at: string | null;
}

export async function fetchDoctorPatientAccess(
  token: string,
  peerId: string,
): Promise<DoctorPatientAccessStatus> {
  const res = await fetch(
    `${API_BASE}/doctor-patient-access/with/${peerId}`,
    withAuthRequestInit(token),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message ??
        `Failed to load access status (${res.status})`,
    );
  }
  return data as DoctorPatientAccessStatus;
}

export function canDoctorViewPatientRecords(
  status: DoctorPatientAccessStatus | null | undefined,
): boolean {
  return !!status?.records_allowed && !status?.is_blocked;
}

export function doctorAccessDeniedMessage(isRTL: boolean): string {
  return isRTL
    ? "المريض لم يمنحك صلاحية عرض السجل الطبي بعد. اطلب من المريض منح الصلاحية من المحادثة."
    : "The patient has not granted permission to view medical records yet. Ask the patient to grant access from the chat.";
}

export function accessActionLabel(action: AccessActionType, isRTL = false): string {
  const labels: Record<AccessActionType, { en: string; ar: string }> = {
    grant_records: {
      en: "Granted access to medical records",
      ar: "تم منح صلاحية الوصول للسجل الطبي",
    },
    revoke_records: {
      en: "Revoked access to medical records",
      ar: "تم إلغاء صلاحية الوصول للسجل الطبي",
    },
    patient_block: {
      en: "Patient blocked this chat",
      ar: "قام المريض بحظر هذه المحادثة",
    },
    doctor_block: {
      en: "Doctor blocked this chat",
      ar: "قام الطبيب بحظر هذه المحادثة",
    },
    patient_unblock: {
      en: "Patient unblocked this chat",
      ar: "أزال المريض الحظر عن هذه المحادثة",
    },
    doctor_unblock: {
      en: "Doctor unblocked this chat",
      ar: "أزال الطبيب الحظر عن هذه المحادثة",
    },
  };
  return isRTL ? labels[action].ar : labels[action].en;
}

/** Doctor↔patient messaging is restricted to these roles on the API. */
export function canUseChat(role: string | null | undefined): boolean {
  const r = role?.toLowerCase();
  return r === "doctor" || r === "patient" || r === "admin";
}
