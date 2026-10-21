import { API_BASE } from "@/constants/api";
import type { ConsultationCancelReasonType } from "@/domains/chat/types";
import { withAuthRequestInit } from "@/domains/auth/http";
import {
  isAuthHttpStatus,
  logoutOnAuthFailure,
} from "@/domains/auth/sessionFailure";
import { resolveConsultationGeoCountry } from "@/domains/patient/geo";
import { detectCountryFromIp } from "@/domains/points/detectCountry";

export interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: "pending" | "open" | "ended" | "cancelled" | "rejected";
  description: string;
  reserved_points: number;
  doctor_note: string | null;
  diagnosis_id: string | null;
  cancel_reason_type: ConsultationCancelReasonType | null;
  cancel_reason: string | null;
  payment_status?: "none" | "awaiting_payment" | "proof_submitted" | "paid";
  payment_amount?: number | null;
  payment_currency?: string | null;
  payment_proof_url?: string | null;
  payment_method?: "bank" | "wallet" | null;
  /** Wallet URL when payment_method is wallet. */
  payment_link?: string | null;
  doctor_iban?: string | null;
  doctor_account_holder?: string | null;
  doctor_national_id?: string | null;
  /** ISO country the patient consulted from (their IP at request time). */
  patient_country?: string | null;
  /** USD per credit for that country when the request was made (admin-set). */
  point_price_usd?: number | null;
}

export interface PointsSummary {
  message_points: number;
  points_reserved: number;
  points_spent_total: number;
  points_purchased_total: number;
  points_reimbursed_total?: number;
}

export type ComplaintStatus = "pending" | "accepted" | "rejected";

export interface DoctorConsultation extends Consultation {
  patient_name: string;
  created_at: string;
  closed_at: string | null;
  complaint_status: ComplaintStatus | null;
}

export interface PatientConsultation extends Consultation {
  doctor_name: string;
  created_at: string;
  closed_at: string | null;
}

const NETWORK_UNAVAILABLE_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

/** Avoid throwing from fetch — Expo LogBox treats thrown fetch errors as uncaught crashes. */
async function consultationFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(
      `${API_BASE}${path}`,
      withAuthRequestInit(token, {
        ...init,
        headers: {
          ...init?.headers,
        },
      }),
    );
  } catch {
    return new Response(
      JSON.stringify({ message: NETWORK_UNAVAILABLE_MESSAGE }),
      {
        status: 503,
        statusText: "Network Error",
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function authJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await consultationFetch(path, token, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (isAuthHttpStatus(res.status)) {
      logoutOnAuthFailure();
    }
    throw new Error(
      (Array.isArray((data as { message?: string[] })?.message)
        ? ((data as { message: string[] }).message).join(", ")
        : (data as { message?: string })?.message) ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export async function fetchActiveConsultation(
  peerId: string,
  token: string,
): Promise<Consultation | null> {
  return authJson<Consultation | null>(
    `/consultations/active?peer_id=${encodeURIComponent(peerId)}`,
    token,
  );
}

export async function fetchMyConsultations(
  token: string,
): Promise<DoctorConsultation[]> {
  const list = await authJson<DoctorConsultation[]>(`/consultations/mine`, token);
  return Array.isArray(list) ? list : [];
}

export async function fetchPatientConsultations(
  token: string,
): Promise<PatientConsultation[]> {
  const list = await authJson<PatientConsultation[]>(`/consultations/mine`, token);
  return Array.isArray(list) ? list : [];
}

export async function startConsultation(
  doctorId: string,
  description: string,
  token: string,
): Promise<{ consultation: Consultation; points: PointsSummary }> {
  const geo = await resolveConsultationGeoCountry();
  return authJson(`/consultations/start`, token, {
    method: "POST",
    headers: geo ? { "x-client-geo-country": geo } : undefined,
    body: JSON.stringify({ doctor_id: doctorId, description }),
  });
}

/** Doctor answers a pending request; `requirePayment` asks the patient to pay first. */
export async function acceptConsultation(
  consultationId: string,
  token: string,
  requirePayment = false,
): Promise<{ consultation: Consultation }> {
  const geo = await detectCountryFromIp().catch(() => null);
  return authJson(`/consultations/${consultationId}/accept`, token, {
    method: "POST",
    headers: geo ? { "x-client-geo-country": geo } : undefined,
    body: JSON.stringify({ require_payment: requirePayment }),
  });
}

/** Patient attaches the receipt for a consultation the doctor priced. */
export async function submitConsultationPaymentProof(
  consultationId: string,
  proofUrl: string,
  token: string,
): Promise<{ consultation: Consultation }> {
  return authJson(`/consultations/${consultationId}/payment-proof`, token, {
    method: "POST",
    body: JSON.stringify({ proof_url: proofUrl }),
  });
}

/** Doctor approves or rejects that receipt. */
export async function reviewConsultationPayment(
  consultationId: string,
  approve: boolean,
  token: string,
): Promise<{ consultation: Consultation }> {
  return authJson(`/consultations/${consultationId}/payment-review`, token, {
    method: "POST",
    body: JSON.stringify({ approve }),
  });
}

export async function rejectConsultation(
  consultationId: string,
  token: string,
  reason?: string,
): Promise<{ consultation: Consultation }> {
  return authJson(`/consultations/${consultationId}/reject`, token, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function endConsultation(
  consultationId: string,
  payload: {
    note?: string;
    /** @deprecated use diagnosis_details */
    diagnosis?: string;
    diagnosis_details?: {
      desc: string;
      body_part?: string | null;
      symptoms?: { desc: string }[];
      document_ids?: string[];
      prescription_id?: string;
      prescription?: {
        title: string;
        symptoms?: string;
        medications: {
          medication_name: string;
          dose?: string;
          interval?: string;
          notes?: string;
        }[];
        body_part?: string | null;
      };
      intake_exam_assignment_id?: string;
      intake_exam?: {
        intake_test_id: string;
        deadline_at: string;
        recurrence_type?: "none" | "daily" | "weekly" | "monthly" | "yearly";
        recurrence_interval?: number;
      };
    };
  },
  token: string,
): Promise<{ consultation: Consultation }> {
  return authJson(`/consultations/${consultationId}/end`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Either side answers a cancellation request. */
export async function reviewConsultationCancel(
  consultationId: string,
  approve: boolean,
  token: string,
): Promise<{ consultation: Consultation }> {
  return authJson(`/consultations/${consultationId}/cancel-review`, token, {
    method: "POST",
    body: JSON.stringify({ approve }),
  });
}

export async function cancelConsultation(
  consultationId: string,
  payload: { reason_type: ConsultationCancelReasonType; reason?: string },
  token: string,
): Promise<{ consultation: Consultation }> {
  return authJson(`/consultations/${consultationId}/cancel`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeConsultation(
  consultationId: string,
  token: string,
): Promise<{ ok: boolean; consultation_id: string; deleted_message_ids: string[] }> {
  return authJson(`/consultations/${consultationId}/remove`, token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
