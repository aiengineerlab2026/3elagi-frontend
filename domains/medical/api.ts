import { Platform } from "react-native";
import { API_BASE } from "@/constants/api";
import type { Locale } from "@/domains/i18n/store";
import type {
  DiagnosisSymptom,
  LinkedConsultationSummary,
  MedicalAiInsight,
  MedicalRecord,
  PrescriptionMedication,
} from "./types";
import { parseBodyPart } from "./bodyParts";
import { fetchIntakeExamsForPatient } from "@/domains/intake-exams/api";

function mapAiInsight(raw: unknown): MedicalAiInsight | null | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const description = String(source.description ?? "").trim();
  const possible_diseases = String(
    source.possible_diseases ?? source.possibleDiseases ?? "",
  ).trim();
  if (!description && !possible_diseases) return undefined;
  return { description, possible_diseases };
}

interface RawPrescriptionMedication {
  id: string;
  medication_name: string;
  interval?: string | null;
  dose?: string | null;
  notes?: string | null;
}

interface RawLinkedConsultation {
  id: string;
  status: LinkedConsultationSummary["status"];
  created_at: string;
  closed_at: string | null;
  doctor_id: string;
  patient_id: string;
  diagnosis_id: string | null;
  doctor_name: string;
  patient_name: string;
}

interface RawPrescription {
  id: string;
  patient_user_id: string;
  doctor_id: string | null;
  doctor_name?: string | null;
  title: string;
  symptoms?: string | null;
  pdf_url?: string | null;
  image_url?: string | null;
  created_at: string;
  diagnosis_id?: string | null;
  linked_diagnoses?: Array<{ id: string; desc: string }>;
  medications?: RawPrescriptionMedication[];
  ai_insight?: MedicalAiInsight | null;
  body_part?: string | null;
  linked_consultations?: RawLinkedConsultation[];
}

function mapLinkedConsultations(
  raw: RawLinkedConsultation[] | undefined,
): LinkedConsultationSummary[] {
  return (raw ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at,
    doctorId: row.doctor_id,
    patientId: row.patient_id,
    diagnosisId: row.diagnosis_id,
    doctorName: row.doctor_name,
    patientName: row.patient_name,
  }));
}

function mapPrescriptionMedication(raw: RawPrescriptionMedication): PrescriptionMedication {
  return {
    id: raw.id,
    medication_name: raw.medication_name,
    interval: raw.interval ?? undefined,
    dose: raw.dose ?? undefined,
    notes: raw.notes ?? undefined,
  };
}

function mapPrescription(raw: RawPrescription): MedicalRecord {
  const meds = (raw.medications ?? []).map(mapPrescriptionMedication);
  const imageUrl = raw.image_url ?? undefined;
  const linkedDiagnoses = mapLinkedDiagnoses(raw.linked_diagnoses);
  return {
    id: raw.id,
    ownerId: raw.patient_user_id,
    category: "prescription",
    title: raw.title,
    notes: raw.symptoms ?? undefined,
    date: raw.created_at,
    createdAt: raw.created_at,
    doctorName: raw.doctor_name ?? null,
    doctorId: raw.doctor_id ?? null,
    medications: meds,
    pdfUrl: raw.pdf_url ?? null,
    imageUrl,
    fileUrl: imageUrl,
    fileName: imageUrl ? "prescription.jpg" : undefined,
    aiInsight: mapAiInsight(raw.ai_insight) ?? null,
    bodyPart: parseBodyPart(raw.body_part),
    linkedDiagnoses,
    diagnosisId: linkedDiagnoses[0]?.id ?? raw.diagnosis_id ?? null,
    linkedConsultations: mapLinkedConsultations(raw.linked_consultations),
  };
}

interface RawSymptom {
  id: string;
  desc: string;
  created_at: string;
  doctor_id?: string | null;
  doctor_name?: string | null;
}

interface RawDiagnosis {
  id: string;
  desc: string;
  patient_id: string;
  doctor_id: string | null;
  doctor_name?: string | null;
  created_at: string;
  symptoms?: RawSymptom[];
  documents?: RawDocument[];
  prescriptions?: RawPrescription[];
  ai_insight?: MedicalAiInsight | null;
  body_part?: string | null;
}

function mapSymptoms(raw: RawSymptom[] | undefined): DiagnosisSymptom[] {
  return (raw ?? []).map((s) => ({
    id: s.id,
    desc: s.desc,
    createdAt: s.created_at,
  }));
}

interface RawDocument {
  id: string;
  patient_id: string;
  type: "lab" | "xray" | "prescription";
  title?: string;
  file_url: string;
  file_name: string;
  notes: string | null;
  created_at: string;
  diagnosis_id?: string | null;
  linked_diagnoses?: Array<{ id: string; desc: string }>;
  ai_insight?: MedicalAiInsight | null;
  body_part?: string | null;
}

function mapLinkedDiagnoses(
  raw: Array<{ id: string; desc: string }> | undefined,
): import("./types").LinkedDiagnosisSummary[] {
  return (raw ?? []).map((item) => ({ id: item.id, title: item.desc }));
}

function mapDocument(doc: RawDocument): MedicalRecord {
  const linkedDiagnoses = mapLinkedDiagnoses(doc.linked_diagnoses);
  return {
    id: doc.id,
    ownerId: doc.patient_id,
    category: doc.type,
    title: doc.title ?? doc.file_name,
    notes: doc.notes ?? undefined,
    fileUrl: doc.file_url,
    fileName: doc.file_name,
    date: doc.created_at,
    createdAt: doc.created_at,
    linkedDiagnoses,
    diagnosisId: linkedDiagnoses[0]?.id ?? doc.diagnosis_id ?? null,
    aiInsight: mapAiInsight(doc.ai_insight) ?? null,
    bodyPart: parseBodyPart(doc.body_part),
  };
}

function mapDiagnosis(d: RawDiagnosis): MedicalRecord {
  const linkedDocs = (d.documents ?? []).map(mapDocument);
  const linkedRx = (d.prescriptions ?? []).map(mapPrescription);
  return {
    id: d.id,
    ownerId: d.patient_id,
    category: "diagnosis",
    title: d.desc,
    date: d.created_at,
    createdAt: d.created_at,
    symptoms: mapSymptoms(d.symptoms),
    doctorName: d.doctor_name ?? null,
    doctorId: d.doctor_id ?? null,
    linkedDocuments: [...linkedDocs, ...linkedRx],
    aiInsight: mapAiInsight(d.ai_insight) ?? null,
    bodyPart: parseBodyPart(d.body_part),
  };
}

async function resolveWebUploadFile(
  uri: string,
  mimeType: string,
  fileName: string,
  webFile?: File | Blob,
): Promise<File> {
  let body: Blob | File | null = webFile ?? null;
  if (!body && (uri.startsWith("blob:") || uri.startsWith("data:"))) {
    const response = await fetch(uri);
    body = await response.blob();
  }
  if (!body) {
    throw new Error("Could not read the selected file on web.");
  }
  const resolvedType =
    mimeType ||
    (body instanceof File ? body.type : body.type) ||
    "application/octet-stream";
  if (body instanceof File && body.type === resolvedType) return body;
  return new File([body], fileName, { type: resolvedType });
}

async function appendFileToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  mimeType: string,
  fileName: string,
  webFile?: File | Blob,
): Promise<void> {
  if (Platform.OS === "web") {
    const payload = await resolveWebUploadFile(uri, mimeType, fileName, webFile);
    formData.append(fieldName, payload, fileName);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData.append(fieldName, { uri, name: fileName, type: mimeType } as any);
}

const UPLOAD_CHUNK_BYTES = 2 * 1024 * 1024;
/** Single-request uploads over this size (or any video) use chunked upload on web. */
const DIRECT_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

async function uploadFileChunked(
  file: File,
  token: string,
): Promise<{ objectPath: string; url: string }> {
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
  const initRes = await fetch(`${API_BASE}/uploads/chunk/init`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      mime_type: file.type || "application/octet-stream",
      total_size: file.size,
      total_chunks: totalChunks,
    }),
  });
  const initData = await initRes.json().catch(() => ({}));
  if (!initRes.ok) {
    throw new Error(
      (Array.isArray(initData?.message) ? initData.message.join(", ") : initData?.message) ??
        initData?.error ??
        `Upload init failed (${initRes.status})`,
    );
  }
  const uploadId = initData.upload_id as string | undefined;
  if (!uploadId) throw new Error("Upload session was not created");

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * UPLOAD_CHUNK_BYTES;
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size);
    const formData = new FormData();
    formData.append("upload_id", uploadId);
    formData.append("chunk_index", String(chunkIndex));
    formData.append("chunk", file.slice(start, end), `${file.name}.part${chunkIndex}`);

    const chunkRes = await fetch(`${API_BASE}/uploads/chunk`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const chunkData = await chunkRes.json().catch(() => ({}));
    if (!chunkRes.ok) {
      throw new Error(
        (Array.isArray(chunkData?.message)
          ? chunkData.message.join(", ")
          : chunkData?.message) ??
          chunkData?.error ??
          `Chunk upload failed (${chunkRes.status})`,
      );
    }
  }

  const completeRes = await fetch(`${API_BASE}/uploads/chunk/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ upload_id: uploadId }),
  });
  const completeData = await completeRes.json().catch(() => ({}));
  if (!completeRes.ok) {
    throw new Error(
      (Array.isArray(completeData?.message)
        ? completeData.message.join(", ")
        : completeData?.message) ??
        completeData?.error ??
        `Upload complete failed (${completeRes.status})`,
    );
  }
  return completeData as { objectPath: string; url: string };
}

async function authJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
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
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export async function uploadFile(
  uri: string,
  mimeType: string,
  fileName: string,
  token: string,
  webFile?: File | Blob,
): Promise<{ objectPath: string; url: string }> {
  // Videos / larger files often fail as a single POST against Cloud Run ("Failed to fetch").
  if (Platform.OS === "web") {
    const file = await resolveWebUploadFile(uri, mimeType, fileName, webFile);
    const isVideo =
      mimeType.startsWith("video/") || file.type.startsWith("video/");
    if (isVideo || file.size > DIRECT_UPLOAD_MAX_BYTES) {
      try {
        return await uploadFileChunked(file, token);
      } catch (e) {
        const msg = (e as Error)?.message ?? "";
        // Older APIs only allowed PDF/DOCX for chunked uploads — fall back to direct.
        if (!/pdf|docx|not allowed/i.test(msg)) throw e;
      }
    }

    const formData = new FormData();
    formData.append("file", file, fileName);
    return postDirectUpload(formData, token);
  }

  const formData = new FormData();
  await appendFileToFormData(formData, "file", uri, mimeType, fileName, webFile);
  return postDirectUpload(formData, token);
}

async function postDirectUpload(
  formData: FormData,
  token: string,
): Promise<{ objectPath: string; url: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/uploads/file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch (e) {
    const msg = (e as Error)?.message ?? "Failed to fetch";
    if (msg === "Failed to fetch" || (e as Error)?.name === "TypeError") {
      throw new Error(
        "Could not reach the upload server. Try a smaller file or check your connection.",
      );
    }
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message)
        ? (data.message as string[]).join(", ")
        : (data?.message as string)) ??
        (data?.error as string) ??
        `Upload failed (${res.status})`,
    );
  }
  return data as { objectPath: string; url: string };
}

export async function fetchPatientDocuments(
  _patientId: string,
  token: string,
): Promise<MedicalRecord[]> {
  try {
    const data = await authJson<RawDocument[]>("/patient/medical-documents", token);
    return (Array.isArray(data) ? data : []).map(mapDocument);
  } catch {
    return [];
  }
}

export async function fetchDocumentsForPatientUser(
  patientUserId: string,
  token: string,
): Promise<MedicalRecord[]> {
  try {
    const data = await authJson<RawDocument[]>(
      `/medical-documents/patient/${patientUserId}`,
      token,
    );
    return (Array.isArray(data) ? data : []).map(mapDocument);
  } catch {
    return [];
  }
}

export interface DoctorPatientListItem {
  user_id: string;
  email: string;
  name: string;
  phone: string;
  photo_url?: string | null;
  last_date: string | null;
  future_count: number;
  past_count: number;
}

export async function fetchDoctorPatients(token: string): Promise<DoctorPatientListItem[]> {
  const data = await authJson<DoctorPatientListItem[]>("/patients/registered", token);
  return Array.isArray(data) ? data : [];
}

export async function fetchDiagnosesForPatientUser(
  patientUserId: string,
  token: string,
): Promise<MedicalRecord[]> {
  const data = await authJson<RawDiagnosis[]>(
    `/diagnosis?patient_id=${encodeURIComponent(patientUserId)}`,
    token,
  );
  return (Array.isArray(data) ? data : []).map(mapDiagnosis);
}

export async function fetchPatientMedicalHistoryAsDoctor(
  patientUserId: string,
  token: string,
): Promise<MedicalRecord[]> {
  // Match fetchAllMedicalHistory: one failing endpoint must not blank the whole page.
  const [documents, diagnoses, prescriptions, intakeExams] = await Promise.all([
    fetchDocumentsForPatientUser(patientUserId, token),
    fetchDiagnosesForPatientUser(patientUserId, token).catch(() => [] as MedicalRecord[]),
    fetchPrescriptionsForPatientUser(patientUserId, token),
    fetchIntakeExamsForPatient(patientUserId, token).catch(() => [] as MedicalRecord[]),
  ]);
  return [...diagnoses, ...prescriptions, ...documents, ...intakeExams];
}

export async function fetchDoctorDiagnosisById(
  id: string,
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDiagnosis>(`/diagnosis/${id}`, token);
  return mapDiagnosis(data);
}

/**
 * Resolve a document/prescription by id for a doctor when the URL carries no
 * patient context (a bare /medical/{id} link). The deployed backend has no
 * doctor-scoped "record by id" endpoint, so we scan the doctor's patients'
 * lists (existing endpoints) and match the id.
 * ponytail: O(patients) fan-out; only runs on cold bare-URL loads, not in-app
 * navigation (which passes patientUserId). Add a by-id endpoint if this gets hot.
 */
export async function findDoctorRecordById(
  id: string,
  token: string,
): Promise<MedicalRecord | null> {
  const patients = await fetchDoctorPatients(token).catch(() => []);
  const lists = await Promise.all(
    patients.map((p) =>
      Promise.all([
        fetchDocumentsForPatientUser(p.user_id, token),
        fetchPrescriptionsForPatientUser(p.user_id, token),
      ]).then(([docs, rx]) => [...docs, ...rx]),
    ),
  );
  for (const list of lists) {
    const hit = list.find((r) => r.id === id);
    if (hit) return hit;
  }
  return null;
}

export async function updateDiagnosis(
  id: string,
  payload: { desc: string },
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDiagnosis>(`/diagnosis/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapDiagnosis(data);
}

export async function fetchPrescriptionsForPatientUser(
  patientUserId: string,
  token: string,
): Promise<MedicalRecord[]> {
  try {
    const data = await authJson<RawPrescription[]>(
      `/prescriptions/patient-user/${encodeURIComponent(patientUserId)}`,
      token,
    );
    return (Array.isArray(data) ? data : []).map(mapPrescription);
  } catch {
    return [];
  }
}

export async function fetchPrescriptionById(
  id: string,
  patientUserId: string,
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawPrescription>(
    `/prescriptions/patient-user/${encodeURIComponent(patientUserId)}/${encodeURIComponent(id)}`,
    token,
  );
  return mapPrescription(data);
}

export async function analyzePrescriptionImage(
  uri: string,
  mimeType: string,
  fileName: string,
  token: string,
  lang: Locale = "ar",
  webFile?: File | Blob,
): Promise<PrescriptionMedication[]> {
  const formData = new FormData();
  await appendFileToFormData(formData, "file", uri, mimeType, fileName, webFile);
  formData.append("lang", lang);

  const res = await fetch(`${API_BASE}/prescriptions/analyze-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }

  const rows = data as Array<{
    medication_name?: string;
    dose?: string;
    interval?: string;
    notes?: string;
  }>;

  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      medication_name: row.medication_name?.trim() ?? "",
      dose: row.dose?.trim() || undefined,
      interval: row.interval?.trim() || undefined,
      notes: row.notes?.trim() || undefined,
    }))
    .filter((row) => row.medication_name.length > 0);
}

export async function createPrescriptionForPatientUser(
  payload: {
    patient_user_id: string;
    title: string;
    symptoms?: string;
    medications: PrescriptionMedication[];
    image_url?: string;
    body_part?: string | null;
  },
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawPrescription>("/prescriptions/patient-user", token, {
    method: "POST",
    body: JSON.stringify({
      patient_user_id: payload.patient_user_id,
      title: payload.title,
      symptoms: payload.symptoms,
      image_url: payload.image_url,
      body_part: payload.body_part ?? null,
      medications: payload.medications.map((med) => ({
        medication_name: med.medication_name,
        interval: med.interval,
        dose: med.dose,
        notes: med.notes,
      })),
    }),
  });
  return mapPrescription(data);
}

/** Fetches diagnosis, lab results, and x-rays from the API (no local defaults). */
export async function fetchAllMedicalHistory(
  patientId: string,
  token: string,
  role?: string,
): Promise<MedicalRecord[]> {
  const isDoctor = role?.toLowerCase() === "doctor";
  if (isDoctor) {
    const [documents, diagnoses, prescriptions, intakeExams] = await Promise.all([
      fetchDocumentsForPatientUser(patientId, token),
      fetchDiagnosesForPatientUser(patientId, token).catch(() => [] as MedicalRecord[]),
      fetchPrescriptionsForPatientUser(patientId, token),
      fetchIntakeExamsForPatient(patientId, token).catch(() => [] as MedicalRecord[]),
    ]);
    return [...diagnoses, ...prescriptions, ...documents, ...intakeExams];
  }
  const [documents, diagnoses, prescriptions, intakeExams] = await Promise.all([
    fetchPatientDocuments(patientId, token),
    fetchPatientDiagnoses(token).catch(() => [] as MedicalRecord[]),
    fetchPrescriptionsForPatientUser(patientId, token),
    fetchIntakeExamsForPatient(patientId, token).catch(() => [] as MedicalRecord[]),
  ]);
  return [...diagnoses, ...prescriptions, ...documents, ...intakeExams];
}

export async function deletePatientMedicalDocument(
  id: string,
  token: string,
): Promise<void> {
  await authJson(`/patient/medical-documents/${id}`, token, { method: "DELETE" });
}

export async function createPatientMedicalDocument(
  payload: {
    type: "lab" | "xray" | "prescription";
    file_url: string;
    file_name: string;
    notes: string;
    title: string;
    patient_user_id?: string;
    body_part?: string | null;
    ai_insight?: MedicalAiInsight;
    generate_ai_insight?: boolean;
    lang?: Locale;
  },
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDocument>("/patient/medical-documents", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapDocument(data);
}

export async function createDoctorMedicalDocument(
  payload: {
    patient_id: string;
    type: "lab" | "xray";
    file_url: string;
    file_name: string;
    notes: string;
    title: string;
    body_part?: string | null;
  },
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDocument>("/medical-documents", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapDocument(data);
}

export async function fetchPatientDiagnoses(
  token: string,
): Promise<MedicalRecord[]> {
  const data = await authJson<RawDiagnosis[]>("/patient/diagnoses", token);
  return (Array.isArray(data) ? data : []).map(mapDiagnosis);
}

export async function fetchDiagnosisById(
  id: string,
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDiagnosis>(`/patient/diagnoses/${id}`, token);
  return mapDiagnosis(data);
}

export type DiagnosisPrescriptionAttach = {
  title: string;
  symptoms?: string;
  medications: PrescriptionMedication[];
  body_part?: string | null;
};

export type DiagnosisIntakeAttach = {
  intake_test_id: string;
  deadline_at: string;
  recurrence_type?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  recurrence_interval?: number;
};

export async function createDiagnosis(
  payload: {
    desc: string;
    patient_id: string;
    doctor_id: string;
    symptoms: { desc: string }[];
    document_ids?: string[];
    body_part?: string | null;
    prescription_id?: string;
    prescription?: DiagnosisPrescriptionAttach;
    intake_exam_assignment_id?: string;
    intake_exam?: DiagnosisIntakeAttach;
  },
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDiagnosis>("/diagnosis", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapDiagnosis(data);
}

/** Draft-only meds for the patient's country — doctor review only; does not save. */
export async function draftAiPrescriptionForDiagnosis(
  payload: {
    patient_user_id: string;
    diagnosis_title: string;
    consultation_id?: string;
    symptoms?: string[];
    lang?: Locale;
  },
  token: string,
): Promise<{
  title: string;
  symptoms: string;
  medications: PrescriptionMedication[];
}> {
  return authJson("/prescriptions/ai-draft", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeDiagnosisWithAi(
  payload: { patient_id: string; desc: string; lang?: Locale },
  token: string,
): Promise<{
  symptoms: { desc: string }[];
  document_ids: string[];
  body_part?: string;
}> {
  return authJson("/diagnosis/complete-with-ai", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type MedicalDocumentRequestType = "lab" | "xray";
export type MedicalDocumentRequestStatus = "pending" | "fulfilled" | "cancelled";

export interface MedicalDocumentRequest {
  id: string;
  doctor_id: string;
  patient_user_id: string;
  type: MedicalDocumentRequestType;
  title: string;
  description: string | null;
  status: MedicalDocumentRequestStatus;
  fulfilled_document_id: string | null;
  pdf_url: string | null;
  created_at: string;
  doctor_name?: string | null;
}

export async function createMedicalDocumentRequest(
  payload: {
    patient_user_id: string;
    type: MedicalDocumentRequestType;
    title: string;
    description?: string;
  },
  token: string,
): Promise<MedicalDocumentRequest> {
  return authJson("/medical-document-requests", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function draftMedicalDocumentRequestDescription(
  payload: {
    patient_user_id: string;
    type: MedicalDocumentRequestType;
    title: string;
    lang?: Locale;
  },
  token: string,
): Promise<{ description: string }> {
  return authJson("/medical-document-requests/ai-draft-description", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMedicalDocumentRequestsForPatientAsDoctor(
  patientUserId: string,
  token: string,
): Promise<MedicalDocumentRequest[]> {
  const data = await authJson<MedicalDocumentRequest[]>(
    `/medical-document-requests/patient/${encodeURIComponent(patientUserId)}`,
    token,
  );
  return Array.isArray(data) ? data : [];
}

export async function cancelMedicalDocumentRequest(
  id: string,
  token: string,
): Promise<MedicalDocumentRequest> {
  return authJson(`/medical-document-requests/${id}/cancel`, token, {
    method: "PATCH",
  });
}

export async function fetchMyMedicalDocumentRequests(
  token: string,
): Promise<MedicalDocumentRequest[]> {
  const data = await authJson<MedicalDocumentRequest[]>(
    "/patient/medical-document-requests",
    token,
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchMedicalDocumentRequestById(
  id: string,
  token: string,
  asDoctor = false,
): Promise<MedicalDocumentRequest> {
  const path = asDoctor
    ? `/medical-document-requests/${id}`
    : `/patient/medical-document-requests/${id}`;
  return authJson(path, token);
}

export async function fulfillMedicalDocumentRequest(
  id: string,
  documentId: string,
  token: string,
): Promise<MedicalDocumentRequest> {
  return authJson(`/patient/medical-document-requests/${id}/fulfill`, token, {
    method: "POST",
    body: JSON.stringify({ document_id: documentId }),
  });
}

export async function fetchMedicalDocumentRequestPdf(
  id: string,
  token: string,
  lang?: Locale,
  regenerate = false,
  asDoctor = false,
): Promise<{ pdf_url: string }> {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  if (regenerate) params.set("regenerate", "true");
  const qs = params.toString();
  const base = asDoctor
    ? `/medical-document-requests/${id}/pdf`
    : `/patient/medical-document-requests/${id}/pdf`;
  return authJson(`${base}${qs ? `?${qs}` : ""}`, token);
}

/** Open/print a doctor-issued prescription PDF (3elagi logo + signature). */
export async function fetchPrescriptionPdf(
  patientUserId: string,
  prescriptionId: string,
  token: string,
  lang?: Locale,
  regenerate = true,
): Promise<{ pdf_url: string }> {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  if (regenerate) params.set("regenerate", "true");
  const qs = params.toString();
  return authJson(
    `/prescriptions/patient-user/${encodeURIComponent(patientUserId)}/${encodeURIComponent(prescriptionId)}/pdf${qs ? `?${qs}` : ""}`,
    token,
  );
}

export async function createPatientDiagnosis(
  payload: {
    desc: string;
    symptoms: { desc: string }[];
    document_ids?: string[];
  },
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDiagnosis>("/patient/diagnoses", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapDiagnosis(data);
}

export async function addSymptomToDiagnosis(
  diagnosisId: string,
  desc: string,
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDiagnosis>(
    `/patient/diagnoses/${diagnosisId}/symptoms`,
    token,
    { method: "POST", body: JSON.stringify({ desc }) },
  );
  return mapDiagnosis(data);
}

export interface AnalyzedMedicalRecordImage {
  type: "lab" | "xray" | "prescription";
  title: string;
  notes: string;
  body_part?: string | null;
  ai_insight: MedicalAiInsight;
}

export async function analyzeMedicalRecordImage(
  uri: string,
  mimeType: string,
  fileName: string,
  token: string,
  lang: Locale,
  webFile?: File | Blob,
  options?: { title?: string },
): Promise<AnalyzedMedicalRecordImage> {
  const formData = new FormData();
  await appendFileToFormData(formData, "file", uri, mimeType, fileName, webFile);
  const title = options?.title?.trim();
  if (title) {
    formData.append("title", title);
  }
  const res = await fetch(
    `${API_BASE}/patient/medical-documents/analyze-image?lang=${lang}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        `Analyze failed (${res.status})`,
    );
  }
  return data as AnalyzedMedicalRecordImage;
}

export async function createMedicalRecordFromImage(
  uri: string,
  mimeType: string,
  fileName: string,
  token: string,
  lang: Locale,
  webFile?: File | Blob,
  options?: { generateInsight?: boolean; title?: string },
): Promise<MedicalRecord> {
  const formData = new FormData();
  await appendFileToFormData(formData, "file", uri, mimeType, fileName, webFile);
  const title = options?.title?.trim();
  if (title) {
    formData.append("title", title);
  }
  const insightParam =
    options?.generateInsight === false ? "&generate_insight=false" : "";
  const res = await fetch(
    `${API_BASE}/patient/medical-documents/from-image?lang=${lang}${insightParam}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        `Create failed (${res.status})`,
    );
  }
  return mapDocument(data as RawDocument);
}

export async function updatePatientMedicalDocument(
  id: string,
  payload: { title?: string; notes?: string },
  token: string,
): Promise<MedicalRecord> {
  const data = await authJson<RawDocument>(
    `/patient/medical-documents/${id}/update`,
    token,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return mapDocument(data);
}

export async function generateMedicalRecordDetails(
  record: MedicalRecord,
  token: string,
  lang: Locale,
): Promise<MedicalRecord> {
  if (record.category !== "lab" && record.category !== "xray") {
    throw new Error("AI details are only supported for lab and imaging records");
  }
  const data = await authJson<RawDocument>(
    `/patient/medical-documents/${record.id}/generate-details?lang=${lang}`,
    token,
    { method: "POST" },
  );
  return mapDocument(data);
}

export async function createMedicalRecordFromChatImage(
  input: {
    uri: string;
    mimeType: string;
    fileName: string;
    webFile?: File | Blob;
    caption?: string;
    patientUserId?: string;
    generateInsight: boolean;
  },
  token: string,
  lang: Locale,
): Promise<MedicalRecord> {
  if (input.generateInsight) {
    return createMedicalRecordFromImage(
      input.uri,
      input.mimeType,
      input.fileName,
      token,
      lang,
      input.webFile,
      {
        generateInsight: true,
        title: input.caption?.trim() || undefined,
      },
    );
  }

  const uploaded = await uploadFile(
    input.uri,
    input.mimeType,
    input.fileName,
    token,
    input.webFile,
  );
  let type: "lab" | "xray" | "prescription" = "lab";
  let title = input.caption?.trim() || "Medical image";
  let notes = input.caption?.trim() || title;
  let bodyPart: string | null = null;

  try {
    const analyzed = await analyzeMedicalRecordImage(
      input.uri,
      input.mimeType,
      input.fileName,
      token,
      lang,
      input.webFile,
      input.caption?.trim() ? { title: input.caption.trim() } : undefined,
    );
    type = analyzed.type;
    title = input.caption?.trim() || analyzed.title;
    notes = analyzed.notes;
    bodyPart = analyzed.body_part ?? null;
  } catch {
    // keep caption-based defaults
  }

  return createPatientMedicalDocument(
    {
      type,
      file_url: uploaded.url || uploaded.objectPath,
      file_name: input.fileName,
      title,
      notes,
      body_part: bodyPart,
      patient_user_id: input.patientUserId,
    },
    token,
  );
}

export async function generateMedicalRecordAiInsight(
  record: MedicalRecord,
  token: string,
  lang: Locale,
): Promise<MedicalRecord> {
  if (record.category === "lab" || record.category === "xray") {
    const data = await authJson<RawDocument>(
      `/patient/medical-documents/${record.id}/generate-insight?lang=${lang}`,
      token,
      { method: "POST" },
    );
    return mapDocument(data);
  }
  if (record.category === "diagnosis") {
    const data = await authJson<RawDiagnosis>(
      `/patient/diagnoses/${record.id}/generate-insight?lang=${lang}`,
      token,
      { method: "POST" },
    );
    return mapDiagnosis(data);
  }
  if (record.category === "prescription") {
    const data = await authJson<RawPrescription>(
      `/prescriptions/patient-user/${record.ownerId}/${record.id}/generate-insight?lang=${lang}`,
      token,
      { method: "POST" },
    );
    return mapPrescription(data);
  }
  throw new Error("AI insight is not supported for this record type");
}
