import { API_BASE } from "@/constants/api";

export interface TestPatientChatStatus {
  is_test_patient: boolean;
  questions_asked: number;
  max_questions: number;
  display_name?: string;
  chat_open?: boolean;
}

export interface DemoPatientInfo {
  patient_user_id: string | null;
  chat_open: boolean;
  display_name?: string;
}

export async function fetchDemoPatient(token: string): Promise<DemoPatientInfo> {
  const res = await fetch(`${API_BASE}/doctors/me/demo-patient`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? `Request failed (${res.status})`);
  }
  return data as DemoPatientInfo;
}

export async function fetchTestPatientChatStatus(
  token: string,
  patientUserId: string,
): Promise<TestPatientChatStatus> {
  const res = await fetch(
    `${API_BASE}/doctors/me/test-patient-chat/${encodeURIComponent(patientUserId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? `Request failed (${res.status})`);
  }
  return data as TestPatientChatStatus;
}
