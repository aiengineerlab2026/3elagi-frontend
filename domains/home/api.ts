import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "@/constants/api";

export interface AdvertisementRow {
  id: string;
  title: string;
  description: string;
  banner_image_url: string;
  clinic_id?: string | null;
  clinic_name?: string | null;
}

export interface SpecialityRow {
  id: string;
  name_en: string;
  name_ar: string;
  image_url: string;
}

export interface SpecialityDoctorRow {
  id: string;
  doctor_id: string;
  name: string;
  photo_url?: string | null;
  country?: string | null;
  specialty?: string | null;
  speciality_id?: string;
  professional_title?: string | null;
  experience_years?: number | null;
  consultation_fee_egp?: number | null;
  rating_average?: number | null;
  rating_total?: number | null;
  consultation_price?: number | null;
  text_price_local?: number | null;
  text_price_usd?: number | null;
  video_price_local?: number | null;
  video_price_usd?: number | null;
  immediate_call_enabled?: boolean | null;
  on_call?: boolean | null;
  tags?: string[] | null;
  role: "doctor";
}

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  bannerImageUrl: string;
  clinicId?: string | null;
  clinicName?: string | null;
}

export interface Speciality {
  id: string;
  nameEn: string;
  nameAr: string;
  imageUrl: string;
}

export interface SpecialityDoctor {
  id: string;
  doctorId: string;
  name: string;
  photoUrl?: string | null;
  country?: string | null;
  specialty?: string | null;
  specialityId?: string;
  professionalTitle?: string | null;
  experienceYears?: number | null;
  consultationFeeEgp?: number | null;
  ratingAverage?: number | null;
  ratingTotal?: number | null;
  consultationPrice?: number | null;
  /** Cash fees the doctor set; which one applies depends on the viewer. */
  textPriceLocal?: number | null;
  textPriceUsd?: number | null;
  videoPriceLocal?: number | null;
  videoPriceUsd?: number | null;
  immediateCallEnabled?: boolean;
  onCall?: boolean;
  tags?: string[];
}

function mapAdvertisement(row: AdvertisementRow): Advertisement {
  const bannerUrl = resolveAssetUrl(row.banner_image_url);
  // Bust cache when campaign art is replaced under the same filename.
  const bannerImageUrl = bannerUrl
    ? `${bannerUrl}${bannerUrl.includes("?") ? "&" : "?"}v=app-ar-1200x320`
    : bannerUrl;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    bannerImageUrl,
    clinicId: row.clinic_id,
    clinicName: row.clinic_name,
  };
}

function resolveAssetUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE.replace(/\/$/, "");
  return `${base}/${url.replace(/^\//, "")}`;
}

function mapSpeciality(row: SpecialityRow): Speciality {
  return {
    id: row.id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    imageUrl: resolveAssetUrl(row.image_url),
  };
}

function mapDoctor(row: SpecialityDoctorRow): SpecialityDoctor {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    name: row.name,
    photoUrl: row.photo_url,
    country: row.country?.trim().toUpperCase() || "EG",
    specialty: row.specialty?.trim() || undefined,
    specialityId: row.speciality_id,
    professionalTitle: row.professional_title?.trim() || undefined,
    experienceYears: row.experience_years ?? undefined,
    consultationFeeEgp: row.consultation_fee_egp ?? undefined,
    ratingAverage: row.rating_average ?? undefined,
    ratingTotal: row.rating_total ?? undefined,
    consultationPrice: row.consultation_price ?? 1,
    textPriceLocal: row.text_price_local ?? null,
    textPriceUsd: row.text_price_usd ?? null,
    videoPriceLocal: row.video_price_local ?? null,
    videoPriceUsd: row.video_price_usd ?? null,
    immediateCallEnabled: !!row.immediate_call_enabled,
    onCall: !!row.on_call,
    tags: Array.isArray(row.tags)
      ? row.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
  };
}

export async function fetchAdvertisements(): Promise<Advertisement[]> {
  const res = await fetch(`${API_BASE}/advertisements`);
  const data = (await res.json().catch(() => [])) as AdvertisementRow[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(
      (data as { message?: string })?.message ??
        `Failed to load advertisements (${res.status})`,
    );
  }
  return data.map(mapAdvertisement);
}

const SPECIALITIES_CACHE_KEY = "3elagi-specialities-cache";
const SPECIALITIES_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let specialitiesRequest: Promise<SpecialityRow[]> | null = null;

async function readCachedSpecialities(): Promise<SpecialityRow[] | null> {
  try {
    const raw = await AsyncStorage.getItem(SPECIALITIES_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt: number; rows: SpecialityRow[] };
    if (!Array.isArray(cached.rows)) return null;
    if (Date.now() - cached.savedAt > SPECIALITIES_CACHE_TTL_MS) return null;
    return cached.rows;
  } catch {
    return null;
  }
}

async function loadSpecialityRows(): Promise<SpecialityRow[]> {
  const cached = await readCachedSpecialities();
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/specialities`);
  const data = (await res.json().catch(() => [])) as SpecialityRow[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(
      (data as { message?: string })?.message ??
        `Failed to load specialities (${res.status})`,
    );
  }
  void AsyncStorage.setItem(
    SPECIALITIES_CACHE_KEY,
    JSON.stringify({ savedAt: Date.now(), rows: data }),
  ).catch(() => {});
  return data;
}

/** Every speciality, all markets — country is a UI filter now, not a URL one. Cached for a week. */
export async function fetchSpecialities(): Promise<Speciality[]> {
  specialitiesRequest ??= loadSpecialityRows().finally(() => {
    specialitiesRequest = null;
  });
  return (await specialitiesRequest).map(mapSpeciality);
}

/** Doctors from every market; the roster filters by country in the UI. */
export async function fetchDoctorsBySpeciality(
  specialityId: string,
): Promise<SpecialityDoctor[]> {
  const res = await fetch(`${API_BASE}/specialities/${specialityId}/doctors`);
  const data = (await res.json().catch(() => [])) as SpecialityDoctorRow[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(
      (data as { message?: string })?.message ??
        `Failed to load doctors (${res.status})`,
    );
  }
  return data.map(mapDoctor);
}

/** Merge a realtime doctor payload into an existing speciality roster. */
export function mergeDoctorIntoRoster(
  doctors: SpecialityDoctor[],
  row: SpecialityDoctorRow,
  specialityId: string,
): SpecialityDoctor[] {
  const doctorSpecialityId = row.speciality_id?.trim();
  if (doctorSpecialityId && doctorSpecialityId !== specialityId) return doctors;
  const mapped = mapDoctor(row);
  if (doctors.some((d) => d.id === mapped.id)) return doctors;
  return [...doctors, mapped].sort((a, b) => a.name.localeCompare(b.name));
}
