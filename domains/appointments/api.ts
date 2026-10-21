import { API_BASE } from "@/constants/api";
import type { MessageRow } from "@/domains/chat/api";
import type { AppointmentActionMeta } from "@/domains/chat/types";
import { resolveConsultationGeoCountry } from "@/domains/patient/geo";

async function consultationGeoHeaders(): Promise<Record<string, string> | undefined> {
  const geo = await resolveConsultationGeoCountry();
  return geo ? { "x-client-geo-country": geo } : undefined;
}

export interface UpcomingAppointment {
  id: string;
  date: string;
  time: string | null;
  status: string;
  meeting_link: string | null;
  /** Doctor-configured video consultation length in minutes. */
  duration_minutes?: number;
  other_name: string;
  /** Counterpart's user id (patient for a doctor, doctor for a patient). */
  other_user_id: string | null;
  /** AI-written, doctor-facing insight (only returned to the doctor). */
  ai_patient_insight?: string | null;
  booked_via_app: boolean;
  payment_status?: "none" | "awaiting_payment" | "proof_submitted" | "paid";
  payment_amount?: number | null;
  payment_currency?: string | null;
  payment_proof_url?: string | null;
  payment_method?: "bank" | "wallet" | null;
  payment_link?: string | null;
  doctor_iban?: string | null;
  doctor_account_holder?: string | null;
  doctor_national_id?: string | null;
}

export async function fetchMyAppointments(
  token: string,
): Promise<UpcomingAppointment[]> {
  const res = await fetch(`${API_BASE}/appointments/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load appointments (${res.status})`);
  return res.json();
}

/** Video consultations for the consultations tab (includes payment phase). */
export async function fetchMyVideoConsultations(
  token: string,
): Promise<UpcomingAppointment[]> {
  const res = await fetch(`${API_BASE}/appointments/video-consultations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load video consultations (${res.status})`);
  }
  return res.json();
}

export async function cancelAppointment(
  token: string,
  appointmentId: string,
): Promise<MessageRow> {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = (await res.json().catch(() => ({}))) as MessageRow & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to cancel appointment (${res.status})`);
  }
  return data;
}

export interface ChatBookResult {
  appointment: { id: string; status: string; date: string; time: string | null };
  message: MessageRow;
}

export async function bookChatAppointment(
  token: string,
  doctorUserId: string,
  date: string,
  time: string,
  extra?: { reason?: string; patientInsight?: string },
): Promise<ChatBookResult> {
  const geoHeaders = await consultationGeoHeaders();
  const res = await fetch(`${API_BASE}/appointments/chat-book`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...geoHeaders,
    },
    body: JSON.stringify({
      doctor_user_id: doctorUserId,
      date,
      time,
      ...(extra?.reason ? { reason: extra.reason } : {}),
      ...(extra?.patientInsight ? { patient_insight: extra.patientInsight } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as ChatBookResult & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to book appointment (${res.status})`);
  }
  return data;
}

export async function sendAppointmentAction(
  token: string,
  recipientId: string,
  meta: AppointmentActionMeta,
): Promise<MessageRow> {
  const geoHeaders = await consultationGeoHeaders();
  const res = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...geoHeaders,
    },
    body: JSON.stringify({
      recipient_id: recipientId,
      type: "appointment_action",
      attachment_meta: meta,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as MessageRow & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to update appointment (${res.status})`);
  }
  return data;
}
