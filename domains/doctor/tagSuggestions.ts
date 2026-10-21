export const MAX_DOCTOR_TAGS = 20;
export const MAX_DOCTOR_TAG_LENGTH = 40;

export function normalizeDoctorTag(raw: string): string {
  return raw.trim().slice(0, MAX_DOCTOR_TAG_LENGTH);
}

export function canCreateDoctorTag(
  query: string,
  selected: string[],
): string | null {
  const tag = normalizeDoctorTag(query);
  if (!tag) return null;
  if (selected.length >= MAX_DOCTOR_TAGS) return null;
  const key = tag.toLowerCase();
  if (selected.some((existing) => existing.toLowerCase() === key)) return null;
  return tag;
}
