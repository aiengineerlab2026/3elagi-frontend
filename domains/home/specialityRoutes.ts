import type { Speciality } from "@/domains/home/api";
import { matchesSlug, toSlug } from "@/utils/slug";

/** Query key on `/doctors?specialty=cardiology`. */
export const SPECIALITY_QUERY_PARAM = "specialty";

export function specialitySlug(
  speciality: Pick<Speciality, "id" | "nameEn">,
): string {
  return toSlug(speciality.nameEn) || speciality.id;
}

export function findSpecialityBySlug(
  specialities: Speciality[],
  slug: string | null | undefined,
): Speciality | undefined {
  if (!slug?.trim()) return undefined;
  const key = slug.trim();
  return specialities.find(
    (s) => matchesSlug(key, s.nameEn, s.nameAr) || s.id === key,
  );
}

/** `/speciality/cardiology` — shareable roster deep link. */
export function buildSpecialityDoctorsHref(
  speciality: Pick<Speciality, "id" | "nameEn">,
): `/speciality/${string}` {
  return `/speciality/${encodeURIComponent(specialitySlug(speciality))}`;
}

/** `/doctors` or `/doctors?specialty=cardiology` — directory with optional filter. */
export function buildDoctorsDirectoryHref(
  speciality?: Pick<Speciality, "id" | "nameEn"> | string | null,
): `/doctors` | `/doctors?${string}` {
  if (!speciality) return "/doctors";
  const slug =
    typeof speciality === "string" ? speciality : specialitySlug(speciality);
  return `/doctors?${SPECIALITY_QUERY_PARAM}=${encodeURIComponent(slug)}`;
}
