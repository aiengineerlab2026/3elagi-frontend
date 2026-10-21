import { API_BASE } from "@/constants/api";

export type ComplaintStatus = "pending" | "accepted" | "rejected";

export interface AdminComplaint {
  id: string;
  consultation_id: string;
  patient_id: string;
  doctor_id: string;
  patient_name: string;
  doctor_name: string;
  points: number;
  reason: string;
  status: ComplaintStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface ComplaintMessage {
  id: string;
  type: string;
  content: string;
  attachment_url?: string | null;
  attachment_meta?: unknown;
  datetime: string;
  from: "patient" | "doctor";
  sender_name: string;
}

async function authJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray((data as { message?: string[] })?.message)
        ? ((data as { message: string[] }).message).join(", ")
        : (data as { message?: string })?.message) ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export async function fileComplaint(
  token: string,
  consultationId: string,
  reason: string,
): Promise<{ id: string; status: ComplaintStatus }> {
  return authJson(`/complaints`, token, {
    method: "POST",
    body: JSON.stringify({ consultation_id: consultationId, reason }),
  });
}

export async function fetchComplaintStatus(
  token: string,
  consultationId: string,
): Promise<{ exists: boolean; status?: ComplaintStatus }> {
  return authJson(
    `/complaints/status?consultation_id=${encodeURIComponent(consultationId)}`,
    token,
  );
}

export async function fetchComplaints(token: string): Promise<AdminComplaint[]> {
  const list = await authJson<AdminComplaint[]>(`/complaints`, token);
  return Array.isArray(list) ? list : [];
}

export async function fetchComplaintMessages(
  token: string,
  id: string,
): Promise<ComplaintMessage[]> {
  const list = await authJson<ComplaintMessage[]>(`/complaints/${id}/messages`, token);
  return Array.isArray(list) ? list : [];
}

export async function resolveComplaint(
  token: string,
  id: string,
  action: "accept" | "reject",
): Promise<{ id: string; status: ComplaintStatus }> {
  return authJson(`/complaints/${id}/resolve`, token, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
