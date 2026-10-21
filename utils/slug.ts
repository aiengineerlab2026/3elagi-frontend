/**
 * URL-friendly names for the /speciality/[name] and /doctor/name/[name] routes.
 *
 * Letters of any script survive (`\p{L}`), so Arabic names stay Arabic in the
 * address bar. Combining marks are dropped on both sides — Latin accents and
 * the Arabic hamza alike — so "Pédiatrie" and "أمراض" slug to stable ASCII-ish
 * keys that still compare equal to what the user typed.
 */
export function toSlug(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    // Every combining mark, not just the Latin range: NFD splits أ into
    // alef + hamza, and a surviving hamza would slug to a stray separator.
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Doctors are stored as "Sarah" but shown as "Dr. Sarah" — match either. */
function withoutTitle(slug: string): string {
  return slug.replace(/^(dr|د)-/, "");
}

/** True when `slug` names any of `candidates`, ignoring case, title and script noise. */
export function matchesSlug(
  slug: string | null | undefined,
  ...candidates: (string | null | undefined)[]
): boolean {
  const wanted = toSlug(slug);
  if (!wanted) return false;
  return candidates.some((candidate) => {
    const actual = toSlug(candidate);
    if (!actual) return false;
    return actual === wanted || withoutTitle(actual) === withoutTitle(wanted);
  });
}
