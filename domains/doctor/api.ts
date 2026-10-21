import { API_BASE } from "@/constants/api";
import { resolveMediaUrl } from "@/domains/chat";

export interface PublicDoctorClinic {
  id: string;
  name: string;
  location: string;
  phone?: string | null;
  logoUrl?: string | null;
}

export interface PublicDoctorProfile {
  id: string;
  userId: string;
  name: string;
  photoUrl?: string | null;
  phone?: string | null;
  professionalTitle?: string | null;
  description?: string | null;
  experienceYears?: number | null;
  consultationFeeEgp?: number | null;
  consultationPrice: number;
  /** Doctor's own country + cash fees, for pricing by the viewer's country. */
  country?: string | null;
  textPriceLocal?: number | null;
  textPriceUsd?: number | null;
  videoPriceLocal?: number | null;
  videoPriceUsd?: number | null;
  specialty?: string | null;
  specialtyAr?: string | null;
  ratingAverage: number;
  ratingTotal: number;
  tags: string[];
  /** Doctor profile page — personal clinic address for maps. */
  location?: string | null;
  clinic: PublicDoctorClinic | null;
}

export interface DoctorReviewItem {
  id: string;
  patientName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface DoctorReviewsPayload {
  total: number;
  average: number;
  items: DoctorReviewItem[];
}

export interface DoctorReviewStatus {
  canReview: boolean;
  hasExistingReview: boolean;
  existingReview?: {
    rating: number;
    comment?: string | null;
  } | null;
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
      (Array.isArray((data as { message?: unknown }).message)
        ? (data as { message: string[] }).message.join(", ")
        : (data as { message?: string }).message) ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}

/** Approved doctors, for resolving a /doctor/name/[name] link. */
export async function fetchPublicDoctors(): Promise<
  { id: string; userId: string; name: string }[]
> {
  const res = await fetch(`${API_BASE}/public/doctors`);
  const data = (await res.json().catch(() => [])) as Record<string, unknown>[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(`Failed to load doctors (${res.status})`);
  }
  return data.map((d) => ({
    id: String(d.id ?? ""),
    userId: String(d.user_id ?? ""),
    name: String(d.name ?? ""),
  }));
}

export async function fetchPublicDoctor(doctorId: string): Promise<PublicDoctorProfile> {
  const res = await fetch(`${API_BASE}/public/doctors/${doctorId}`);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { message?: string };
  if (!res.ok) throw new Error(data.message ?? `Failed to load doctor (${res.status})`);
  return {
    id: String(data.id),
    userId: String(data.user_id),
    name: String(data.name),
    photoUrl: (() => {
      const raw = data.photo_url;
      if (typeof raw !== "string" || !raw.trim()) return null;
      const trimmed = raw.trim();
      return /^https?:\/\//i.test(trimmed) ? trimmed : resolveMediaUrl(trimmed);
    })(),
    phone: (data.phone as string | null) ?? null,
    professionalTitle: (data.professional_title as string | null) ?? null,
    description: (data.description as string | null) ?? null,
    experienceYears: (data.experience_years as number | null) ?? null,
    consultationFeeEgp: (data.consultation_fee_egp as number | null) ?? null,
    consultationPrice: Number(data.consultation_price ?? 1),
    country: (data.country as string | null) ?? null,
    textPriceLocal: (data.text_price_local as number | null) ?? null,
    textPriceUsd: (data.text_price_usd as number | null) ?? null,
    videoPriceLocal: (data.video_price_local as number | null) ?? null,
    videoPriceUsd: (data.video_price_usd as number | null) ?? null,
    specialty: (data.specialty as string | null) ?? null,
    specialtyAr: (data.specialty_ar as string | null) ?? null,
    ratingAverage: Number(data.rating_average ?? 0),
    ratingTotal: Number(data.rating_total ?? 0),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    location: (() => {
      const raw = data.personal_clinic_location;
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      return trimmed || null;
    })(),
    clinic: (() => {
      const raw = data.clinic;
      if (!raw || typeof raw !== "object") return null;
      const c = raw as Record<string, unknown>;
      const name = typeof c.name === "string" ? c.name.trim() : "";
      const location = typeof c.location === "string" ? c.location.trim() : "";
      const id = typeof c.id === "string" ? c.id : "";
      if (!id || (!name && !location)) return null;
      return {
        id,
        name,
        location,
        phone: (c.phone as string | null) ?? null,
        logoUrl: (c.logo_url as string | null) ?? null,
      };
    })(),
  };
}

export async function fetchDoctorReviews(doctorId: string): Promise<DoctorReviewsPayload> {
  const res = await fetch(`${API_BASE}/public/doctors/${doctorId}/reviews`);
  const data = (await res.json().catch(() => ({}))) as {
    total?: number;
    average?: number;
    items?: Array<{
      id: string;
      patient_name: string;
      rating: number;
      comment?: string | null;
      created_at: string;
    }>;
    message?: string;
  };
  if (!res.ok) throw new Error(data.message ?? `Failed to load reviews (${res.status})`);
  return {
    total: data.total ?? 0,
    average: data.average ?? 0,
    items: (data.items ?? []).map((r) => ({
      id: r.id,
      patientName: r.patient_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    })),
  };
}

export async function fetchDoctorReviewStatus(
  doctorId: string,
  token: string,
): Promise<DoctorReviewStatus> {
  const data = await authJson<{
    can_review: boolean;
    has_existing_review: boolean;
    existing_review?: { rating: number; comment?: string | null } | null;
  }>(`/public/doctors/${doctorId}/reviews/status`, token);

  return {
    canReview: data.can_review,
    hasExistingReview: data.has_existing_review,
    existingReview: data.existing_review ?? null,
  };
}

export async function submitDoctorReview(
  doctorId: string,
  token: string,
  payload: { rating: number; comment?: string },
): Promise<void> {
  await authJson(`/public/doctors/${doctorId}/reviews`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface MyReviewItem {
  id: string;
  rating: number;
  comment: string;
  patientName: string;
  createdAt: string;
}

export interface MyReviewsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MyReviewsResponse {
  items: MyReviewItem[];
  pagination: MyReviewsPagination;
}

export async function fetchMyReviews(
  token: string,
  page: number,
  limit: number,
): Promise<MyReviewsResponse> {
  const data = await authJson<{
    data?: Array<{
      id: string;
      rating: number;
      comment?: string | null;
      patientName?: string | null;
      patient_name?: string | null;
      createdAt?: string | null;
      created_at?: string | null;
    }>;
    items?: Array<{
      id: string;
      rating: number;
      comment?: string | null;
      patientName?: string | null;
      patient_name?: string | null;
      createdAt?: string | null;
      created_at?: string | null;
    }>;
    pagination?: {
      page?: number;
      limit?: number;
      total?: number;
      totalPages?: number;
      total_pages?: number;
    };
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  }>(`/doctors/me/reviews?page=${page}&limit=${limit}`, token);

  const rawItems = data.items ?? data.data ?? [];
  const pg = data.pagination;

  return {
    items: rawItems.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment ?? "",
      patientName: r.patientName ?? r.patient_name ?? "",
      createdAt: r.createdAt ?? r.created_at ?? "",
    })),
    pagination: {
      page: pg?.page ?? data.page ?? page,
      limit: pg?.limit ?? data.limit ?? limit,
      total: pg?.total ?? data.total ?? 0,
      totalPages: pg?.totalPages ?? pg?.total_pages ?? data.totalPages ?? 1,
    },
  };
}
