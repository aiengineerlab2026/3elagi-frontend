import { API_BASE } from "@/constants/api";
import { assertAdminClientAccess } from "@/domains/admin/guard";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface AdminDoctorRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  photo_url?: string | null;
  graduation_cert_url?: string | null;
  work_permit_url?: string | null;
  digital_signature_url?: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  consultation_price?: number | null;
  message_price?: number | null;
  speciality?: { id: string; name_en: string; name_ar: string } | null;
  welcome_password?: string | null;
}

export interface AdminRagSourceRow {
  id: string;
  kind: "text" | "document";
  title: string;
  file_url?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  created_at: string;
  preview?: string;
}

async function authJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  assertAdminClientAccess();
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

export async function fetchAdminDoctors(token: string): Promise<AdminDoctorRow[]> {
  const data = await authJson<AdminDoctorRow[]>("/admin/doctors", token);
  return Array.isArray(data) ? data : [];
}

export interface AdminPatientRow {
  user_id: string;
  name: string;
  phone?: string | null;
  country?: string | null;
  photo_url?: string | null;
}

export async function fetchAdminPatients(
  token: string,
): Promise<AdminPatientRow[]> {
  const data = await authJson<AdminPatientRow[]>("/admin/patients", token);
  return Array.isArray(data) ? data : [];
}

export async function setDoctorApproval(
  token: string,
  doctorId: string,
  status: ApprovalStatus,
): Promise<void> {
  await authJson(`/admin/doctors/${doctorId}/approval`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteDoctor(token: string, doctorId: string): Promise<void> {
  await authJson(`/admin/doctors/${doctorId}`, token, {
    method: "DELETE",
  });
}

export async function fetchAdminRagSources(token: string): Promise<AdminRagSourceRow[]> {
  const data = await authJson<AdminRagSourceRow[]>("/admin/rag-sources", token);
  return Array.isArray(data) ? data : [];
}

export async function createAdminRagText(
  token: string,
  payload: { title?: string; content: string },
): Promise<AdminRagSourceRow> {
  return authJson<AdminRagSourceRow>("/admin/rag-sources/text", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

const RAG_CHUNK_SIZE = 2 * 1024 * 1024;

async function uploadRagChunks(
  token: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  assertAdminClientAccess();
  const totalChunks = Math.max(1, Math.ceil(file.size / RAG_CHUNK_SIZE));

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

  const uploadId = initData.upload_id as string;
  if (!uploadId) {
    throw new Error("Upload session was not created");
  }

  let uploadedBytes = 0;
  onProgress?.(0);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * RAG_CHUNK_SIZE;
    const end = Math.min(start + RAG_CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);

    const formData = new FormData();
    formData.append("upload_id", uploadId);
    formData.append("chunk_index", String(chunkIndex));
    formData.append("chunk", blob, `${file.name}.part${chunkIndex}`);

    const chunkRes = await fetch(`${API_BASE}/uploads/chunk`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const chunkData = await chunkRes.json().catch(() => ({}));
    if (!chunkRes.ok) {
      throw new Error(
        (Array.isArray(chunkData?.message) ? chunkData.message.join(", ") : chunkData?.message) ??
          chunkData?.error ??
          `Chunk upload failed (${chunkRes.status})`,
      );
    }

    uploadedBytes += end - start;
    onProgress?.(Math.min(100, Math.round((uploadedBytes / file.size) * 100)));
  }

  return uploadId;
}

/** Train RAG from a PDF/DOCX without storing the file. */
export async function trainAdminRagDocument(
  token: string,
  file: File,
  options?: {
    title?: string;
    onProgress?: (progress: { phase: "uploading" | "processing"; percent: number }) => void;
  },
): Promise<AdminRagSourceRow> {
  assertAdminClientAccess();
  const title = options?.title;
  const onProgress = options?.onProgress;
  const useChunks = file.size > RAG_CHUNK_SIZE;

  if (!useChunks) {
    onProgress?.({ phase: "uploading", percent: 0 });
    const formData = new FormData();
    formData.append("file", file, file.name);
    if (title?.trim()) {
      formData.append("title", title.trim());
    }

    const res = await fetch(`${API_BASE}/admin/rag-sources/document/train`, {
      method: "PUT",
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
          `Training failed (${res.status})`,
      );
    }
    onProgress?.({ phase: "uploading", percent: 100 });
    return data as AdminRagSourceRow;
  }

  const uploadId = await uploadRagChunks(token, file, (percent) => {
    onProgress?.({ phase: "uploading", percent });
  });

  onProgress?.({ phase: "processing", percent: 100 });
  return authJson<AdminRagSourceRow>("/admin/rag-sources/document/train-chunk", token, {
    method: "PUT",
    body: JSON.stringify({
      upload_id: uploadId,
      title: title?.trim() || undefined,
      file_name: file.name,
      mime_type: file.type || undefined,
    }),
  });
}

export async function deleteAdminRagSource(
  token: string,
  id: string,
): Promise<void> {
  await authJson(`/admin/rag-sources/${id}`, token, {
    method: "DELETE",
  });
}

export interface AdminSpecialityRow {
  id: string;
  name_en: string;
  name_ar: string;
  image_url: string;
  visible_eg: boolean;
  visible_jo: boolean;
}

export async function fetchAdminSpecialities(
  token: string,
): Promise<AdminSpecialityRow[]> {
  const data = await authJson<AdminSpecialityRow[]>("/admin/specialities", token);
  return Array.isArray(data) ? data : [];
}

export async function updateSpecialityVisibility(
  token: string,
  specialityId: string,
  patch: { visible_eg?: boolean; visible_jo?: boolean },
): Promise<AdminSpecialityRow> {
  return authJson<AdminSpecialityRow>(
    `/admin/specialities/${specialityId}/visibility`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
}

export type AdminPointMarket = "EG" | "JO" | "INTL";

export interface AdminPointPricingRow {
  market: AdminPointMarket;
  currency: "EGP" | "JOD" | "USD";
  pricePerPoint: number;
}

export async function fetchAdminPointPricing(
  token: string,
): Promise<AdminPointPricingRow[]> {
  const data = await authJson<AdminPointPricingRow[]>("/admin/point-pricing", token);
  return Array.isArray(data) ? data : [];
}

export async function updatePointPrice(
  token: string,
  market: AdminPointMarket,
  pricePerPoint: number,
): Promise<AdminPointPricingRow> {
  return authJson<AdminPointPricingRow>(`/admin/point-pricing/${market}`, token, {
    method: "PATCH",
    body: JSON.stringify({ price_per_point: pricePerPoint }),
  });
}

export interface AdminContactAttachment {
  file_name: string;
  mime_type: string;
  url: string;
  object_path?: string | null;
}

export interface AdminContactMessageRow {
  id: string;
  user_id: string | null;
  sender_name: string;
  sender_email: string | null;
  sender_role: string | null;
  message?: string;
  message_preview: string;
  attachments: AdminContactAttachment[];
  read_at: string | null;
  created_at: string;
}

export async function fetchAdminContactMessages(
  token: string,
): Promise<AdminContactMessageRow[]> {
  const data = await authJson<AdminContactMessageRow[]>(
    "/admin/contact-messages",
    token,
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminContactMessage(
  token: string,
  id: string,
): Promise<AdminContactMessageRow> {
  return authJson<AdminContactMessageRow>(`/admin/contact-messages/${id}`, token);
}

export interface AdminDeletedAccountRow {
  id: string;
  user_id: string;
  account_type: "patient" | "doctor";
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  speciality_name: string | null;
  deleted_by: "self" | "admin";
  deleted_at: string;
}

export async function fetchAdminDeletedAccounts(
  token: string,
): Promise<AdminDeletedAccountRow[]> {
  const data = await authJson<AdminDeletedAccountRow[]>(
    "/admin/deleted-accounts",
    token,
  );
  return Array.isArray(data) ? data : [];
}

export interface AdminLoginStatRow {
  user_id: string;
  email: string;
  login_count: number;
  last_login_at: string | null;
  updated_at: string;
}

export async function fetchAdminLoginAnalytics(
  token: string,
): Promise<AdminLoginStatRow[]> {
  const data = await authJson<AdminLoginStatRow[]>("/admin/analytics/logins", token);
  return Array.isArray(data) ? data : [];
}

export interface AdminDoctorRegistrationRow {
  id: string;
  doctor_name: string;
  email: string;
  phone: string;
  country: string;
  clinic_location: string | null;
  photo_url: string | null;
  price_local: number | null;
  price_usd: number | null;
  speciality_id: string;
  speciality_name_en: string;
  speciality_name_ar: string;
  read_at: string | null;
  created_at: string;
}

export async function fetchAdminDoctorRegistrations(
  token: string,
): Promise<AdminDoctorRegistrationRow[]> {
  const data = await authJson<AdminDoctorRegistrationRow[]>(
    "/admin/doctor-registrations",
    token,
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminDoctorRegistration(
  token: string,
  id: string,
): Promise<AdminDoctorRegistrationRow> {
  return authJson<AdminDoctorRegistrationRow>(
    `/admin/doctor-registrations/${id}`,
    token,
  );
}

export async function deleteAdminDoctorRegistration(
  token: string,
  id: string,
): Promise<void> {
  await authJson<{ ok: boolean }>(`/admin/doctor-registrations/${id}`, token, {
    method: "DELETE",
  });
}

export interface CreateDoctorFromRegistrationResult {
  ok: boolean;
  doctor_id: string | null;
  user_id: string;
  email: string;
  password: string;
  name: string;
}

export async function createAdminDoctorFromRegistration(
  token: string,
  id: string,
  password?: string,
): Promise<CreateDoctorFromRegistrationResult> {
  return authJson<CreateDoctorFromRegistrationResult>(
    `/admin/doctor-registrations/${id}/create-doctor`,
    token,
    {
      method: "POST",
      body: JSON.stringify(password?.trim() ? { password: password.trim() } : {}),
    },
  );
}

export interface AdminDoctorSpecialityChangeRow {
  id: string;
  doctor_id: string;
  doctor_user_id: string;
  doctor_name: string;
  doctor_email: string | null;
  current_speciality_id: string | null;
  current_speciality_name_en: string | null;
  current_speciality_name_ar: string | null;
  requested_speciality_id: string;
  requested_speciality_ids: string[];
  requested_speciality_name_en: string;
  requested_speciality_name_ar: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export async function fetchAdminDoctorSpecialityChanges(
  token: string,
): Promise<AdminDoctorSpecialityChangeRow[]> {
  const data = await authJson<AdminDoctorSpecialityChangeRow[]>(
    "/admin/doctor-speciality-changes",
    token,
  );
  return Array.isArray(data) ? data : [];
}

export async function approveAdminDoctorSpecialityChange(
  token: string,
  id: string,
): Promise<AdminDoctorSpecialityChangeRow> {
  return authJson<AdminDoctorSpecialityChangeRow>(
    `/admin/doctor-speciality-changes/${id}/approve`,
    token,
    { method: "PATCH" },
  );
}

export async function rejectAdminDoctorSpecialityChange(
  token: string,
  id: string,
): Promise<AdminDoctorSpecialityChangeRow> {
  return authJson<AdminDoctorSpecialityChangeRow>(
    `/admin/doctor-speciality-changes/${id}/reject`,
    token,
    { method: "PATCH" },
  );
}

export interface AdminAppReviewRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_role: string | null;
  rating: number;
  comment?: string;
  comment_preview: string;
  improvement_tags: string[];
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchAdminAppReviews(
  token: string,
): Promise<AdminAppReviewRow[]> {
  const data = await authJson<AdminAppReviewRow[]>("/admin/app-reviews", token);
  return Array.isArray(data) ? data : [];
}

export async function fetchAdminAppReview(
  token: string,
  id: string,
): Promise<AdminAppReviewRow> {
  return authJson<AdminAppReviewRow>(`/admin/app-reviews/${id}`, token);
}

export type MarketingEmailLanguage = "en" | "ar" | "es" | "de";
export type MarketingEmailTheme = "blue" | "green" | "red";

import type { MarketingEmailSection } from "./marketingSections";
export type {
  MarketingEmailSection,
  MarketingSectionType,
  MarketingCalloutVariant,
} from "./marketingSections";

export interface SendMarketingEmailInput {
  email: string;
  name: string;
  language: MarketingEmailLanguage;
  bodyHtml?: string;
  themeColor?: MarketingEmailTheme;
}

export interface SendMarketingEmailResult {
  ok: boolean;
  to: string;
  language: MarketingEmailLanguage;
  themeColor?: MarketingEmailTheme;
  subject: string;
}

export async function sendAdminMarketingEmail(
  token: string,
  input: SendMarketingEmailInput,
): Promise<SendMarketingEmailResult> {
  return authJson<SendMarketingEmailResult>("/admin/marketing/send", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface MarketingEmailRecipient {
  name: string;
  email: string;
}

export interface SendMarketingEmailBatchInput {
  recipients: MarketingEmailRecipient[];
  language: MarketingEmailLanguage;
  bodyHtml?: string;
  sections?: MarketingEmailSection[];
  themeColor?: MarketingEmailTheme;
}

export interface SendMarketingEmailBatchResult {
  ok: boolean;
  sent: number;
  failed: number;
  total: number;
  language: MarketingEmailLanguage;
  themeColor?: MarketingEmailTheme;
  results: Array<{
    email: string;
    name: string;
    ok: boolean;
    error?: string;
  }>;
}

export async function sendAdminMarketingEmailBatch(
  token: string,
  input: SendMarketingEmailBatchInput,
): Promise<SendMarketingEmailBatchResult> {
  return authJson<SendMarketingEmailBatchResult>(
    "/admin/marketing/send-batch",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export interface AdminMarketingTemplate {
  language: MarketingEmailLanguage;
  themeColor: MarketingEmailTheme;
  dir: "ltr" | "rtl";
  subjectTemplate: string;
  preheader: string;
  sections: MarketingEmailSection[];
  bodyHtml: string;
}

export async function fetchAdminMarketingTemplate(
  token: string,
  language: MarketingEmailLanguage,
  themeColor: MarketingEmailTheme = "blue",
): Promise<AdminMarketingTemplate> {
  const themeQuery = encodeURIComponent(themeColor);
  return authJson<AdminMarketingTemplate>(
    `/admin/marketing/template/${language}?theme=${themeQuery}`,
    token,
  );
}

export interface AdminMarketingPreviewInput {
  sections: MarketingEmailSection[];
  language: MarketingEmailLanguage;
  themeColor?: MarketingEmailTheme;
  previewName?: string;
}

export interface AdminMarketingPreview {
  subject: string;
  html: string;
  dir: "ltr" | "rtl";
  themeColor: MarketingEmailTheme;
}

export async function fetchAdminDoctorWelcomeTemplate(
  token: string,
  language: MarketingEmailLanguage,
  themeColor: MarketingEmailTheme = "blue",
): Promise<AdminMarketingTemplate> {
  const themeQuery = encodeURIComponent(themeColor);
  return authJson<AdminMarketingTemplate>(
    `/admin/doctor-welcome/template/${language}?theme=${themeQuery}`,
    token,
  );
}

export interface AdminDoctorWelcomePreviewInput {
  sections: MarketingEmailSection[];
  language: MarketingEmailLanguage;
  themeColor?: MarketingEmailTheme;
  previewName?: string;
  previewEmail?: string;
  previewPassword?: string;
}

export async function fetchAdminDoctorWelcomePreview(
  token: string,
  input: AdminDoctorWelcomePreviewInput,
): Promise<AdminMarketingPreview> {
  return authJson<AdminMarketingPreview>("/admin/doctor-welcome/preview", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface AdminDoctorWelcomeEmailInput {
  name: string;
  email: string;
  password: string;
  sections: MarketingEmailSection[];
  language: MarketingEmailLanguage;
  themeColor?: MarketingEmailTheme;
}

export async function sendAdminDoctorWelcomeEmail(
  token: string,
  input: AdminDoctorWelcomeEmailInput,
): Promise<{ ok: boolean; email: string }> {
  return authJson<{ ok: boolean; email: string }>(
    "/admin/doctor-welcome/send",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export interface SendDoctorWelcomeEmailBatchResult {
  ok: boolean;
  sent: number;
  failed: number;
  total: number;
  results: Array<{ email: string; ok: boolean; error?: string }>;
}

export async function sendAdminDoctorWelcomeEmailBatch(
  token: string,
  input: Omit<AdminDoctorWelcomeEmailInput, "email"> & { emails: string[] },
): Promise<SendDoctorWelcomeEmailBatchResult> {
  return authJson<SendDoctorWelcomeEmailBatchResult>(
    "/admin/doctor-welcome/send-batch",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function fetchAdminInvitedDoctorTemplate(
  token: string,
  language: MarketingEmailLanguage,
  themeColor: MarketingEmailTheme = "blue",
): Promise<AdminMarketingTemplate> {
  const themeQuery = encodeURIComponent(themeColor);
  return authJson<AdminMarketingTemplate>(
    `/admin/invited-doctors/template/${language}?theme=${themeQuery}`,
    token,
  );
}

export interface AdminInvitedDoctorEmailInput {
  name: string;
  email: string;
  password: string;
  sections: MarketingEmailSection[];
  language: MarketingEmailLanguage;
  themeColor?: MarketingEmailTheme;
}

export async function fetchAdminInvitedDoctorPreview(
  token: string,
  input: AdminInvitedDoctorEmailInput,
): Promise<AdminMarketingPreview> {
  return authJson<AdminMarketingPreview>("/admin/invited-doctors/preview", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendAdminInvitedDoctorEmail(
  token: string,
  input: AdminInvitedDoctorEmailInput,
): Promise<{ ok: boolean; email: string }> {
  return authJson<{ ok: boolean; email: string }>(
    "/admin/invited-doctors/send",
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function fetchAdminMarketingPreview(
  token: string,
  input: AdminMarketingPreviewInput,
): Promise<AdminMarketingPreview> {
  return authJson<AdminMarketingPreview>("/admin/marketing/preview", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
