import { API_BASE } from "@/constants/api";

/** Consistent default avatar when user has no photo_url. */
export function defaultAvatarUrl(userId: string, role?: "doctor" | "patient"): string {
  const style = "avataaars";
  return `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(userId)}`;
}

/** Turn API-relative upload paths into absolute URLs for web Image. */
export function resolveMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = API_BASE.replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path.startsWith(`${base}/`) || path === base) return path;
  if (path.startsWith("/3eyadahub-api/")) {
    const origin = base.replace(/\/3eyadahub-api\/?$/, "");
    return `${origin}${path}`;
  }
  return `${base}${path}`;
}

export function resolveAvatarUrl(
  photoUrl: string | null | undefined,
  userId: string,
  role?: "doctor" | "patient",
): string {
  const trimmed = photoUrl?.trim();
  return trimmed ? resolveMediaUrl(trimmed) : defaultAvatarUrl(userId, role);
}
