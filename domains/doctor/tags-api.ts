import { API_BASE } from "@/constants/api";
import type { Locale } from "@/domains/i18n/store";

export type DoctorTagSuggestion = {
  id: string;
  label: string;
  labelEn: string;
  specialityId: string | null;
  source: "subspecialty" | "common";
};

export type ResolvedDoctorTagLabel = {
  canonical: string;
  display: string;
};

type RawDoctorTagSuggestion = {
  id: string;
  label: string;
  label_en: string;
  speciality_id: string | null;
  source: "subspecialty" | "common";
};

type RawResolvedDoctorTagLabel = {
  canonical: string;
  display: string;
};

export async function fetchDoctorTagSuggestions(params: {
  primarySpecialityId?: string;
  locale: Locale;
  q?: string;
  limit?: number;
}): Promise<DoctorTagSuggestion[]> {
  const search = new URLSearchParams();
  search.set("locale", params.locale);
  if (params.primarySpecialityId) {
    search.set("speciality_ids", params.primarySpecialityId);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.limit != null) {
    search.set("limit", String(params.limit));
  }

  const qs = search.toString();
  const res = await fetch(`${API_BASE}/doctor-tags?${qs}`);
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        `Request failed (${res.status})`,
    );
  }

  if (!Array.isArray(data)) return [];
  return data.map((row: RawDoctorTagSuggestion) => ({
    id: row.id,
    label: row.label,
    labelEn: row.label_en,
    specialityId: row.speciality_id,
    source: row.source === "speciality" ? "subspecialty" : row.source,
  }));
}

export async function resolveDoctorTagLabels(
  labels: string[],
  locale: Locale,
): Promise<ResolvedDoctorTagLabel[]> {
  if (!labels.length) return [];
  const search = new URLSearchParams();
  search.set("locale", locale);
  search.set("labels", labels.join("|"));

  const res = await fetch(`${API_BASE}/doctor-tags/resolve?${search.toString()}`);
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        `Request failed (${res.status})`,
    );
  }

  if (!Array.isArray(data)) return labels.map((canonical) => ({ canonical, display: canonical }));
  return data.map((row: RawResolvedDoctorTagLabel) => ({
    canonical: row.canonical,
    display: row.display,
  }));
}
