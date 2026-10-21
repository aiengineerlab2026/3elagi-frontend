import { API_BASE } from "@/constants/api";
import type { MedicalRecord } from "@/domains/medical/types";
import type {
  IntakeExamInstance,
  IntakeExamRecurrence,
  IntakeQuestion,
  IntakeTestTemplate,
} from "./types";

async function authJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

function mapInstance(raw: IntakeExamInstance): MedicalRecord {
  const deadline = new Date(raw.deadline_at);
  const statusLabel =
    raw.status === "completed"
      ? "Completed"
      : raw.status === "in_progress"
        ? "In progress"
        : "Pending";
  const linkedDiagnoses = (raw.linked_diagnoses ?? []).map((item) => ({
    id: item.id,
    title: item.desc,
  }));
  return {
    id: raw.id,
    ownerId: raw.patient_user_id,
    category: "intake",
    title: raw.exam_name,
    notes: `#${raw.instance_number} · ${statusLabel} · Due ${deadline.toLocaleString()}`,
    date: raw.deadline_at,
    createdAt: raw.created_at,
    doctorName: raw.doctor_name,
    doctorId: raw.doctor_id,
    linkedDiagnoses,
    diagnosisId: linkedDiagnoses[0]?.id ?? raw.diagnosis_id ?? null,
    intakeExam: {
      instanceId: raw.id,
      assignmentId: raw.assignment_id,
      intakeTestId: raw.intake_test_id,
      deadlineAt: raw.deadline_at,
      status: raw.status,
      questions: raw.questions ?? [],
      answers: raw.answers ?? {},
      instanceNumber: raw.instance_number,
      recurrenceType: raw.recurrence_type,
      recurrenceInterval: raw.recurrence_interval,
      completedAt: raw.completed_at,
    },
  };
}

export async function fetchIntakeTests(token: string): Promise<IntakeTestTemplate[]> {
  const data = await authJson<IntakeTestTemplate[]>("/intake-tests", token);
  return Array.isArray(data) ? data : [];
}

export async function createIntakeTest(
  payload: {
    name: string;
    description?: string;
    is_active?: boolean;
    questions: IntakeQuestion[];
  },
  token: string,
): Promise<IntakeTestTemplate> {
  return authJson<IntakeTestTemplate>("/intake-tests", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIntakeTest(
  id: string,
  payload: {
    name: string;
    description?: string;
    is_active?: boolean;
    questions: IntakeQuestion[];
  },
  token: string,
): Promise<IntakeTestTemplate> {
  return authJson<IntakeTestTemplate>(`/intake-tests/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteIntakeTest(id: string, token: string): Promise<void> {
  await authJson(`/intake-tests/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}

export async function assignIntakeExam(
  payload: {
    patient_user_id: string;
    intake_test_id: string;
    deadline_at: string;
    recurrence_type?: IntakeExamRecurrence;
    recurrence_interval?: number;
  },
  token: string,
): Promise<IntakeExamInstance> {
  return authJson<IntakeExamInstance>("/intake-exams/assign", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchIntakeExamsForPatient(
  patientUserId: string,
  token: string,
): Promise<MedicalRecord[]> {
  const data = await authJson<IntakeExamInstance[]>(
    `/intake-exams/patient/${encodeURIComponent(patientUserId)}`,
    token,
  );
  return (Array.isArray(data) ? data : []).map(mapInstance);
}

export async function fetchIntakeExamInstance(
  id: string,
  token: string,
): Promise<IntakeExamInstance> {
  return authJson<IntakeExamInstance>(
    `/intake-exams/instances/${encodeURIComponent(id)}`,
    token,
  );
}

export async function saveIntakeExamAnswers(
  id: string,
  payload: { answers: Record<string, string[]>; complete?: boolean },
  token: string,
): Promise<IntakeExamInstance> {
  return authJson<IntakeExamInstance>(
    `/intake-exams/instances/${encodeURIComponent(id)}/answers`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function resetIntakeExamAnswers(
  id: string,
  token: string,
): Promise<IntakeExamInstance> {
  return authJson<IntakeExamInstance>(
    `/intake-exams/instances/${encodeURIComponent(id)}/reset`,
    token,
    { method: "POST" },
  );
}

export async function deleteIntakeExamInstance(id: string, token: string): Promise<void> {
  await authJson(`/intake-exams/instances/${encodeURIComponent(id)}`, token, {
    method: "DELETE",
  });
}

export { mapInstance };
