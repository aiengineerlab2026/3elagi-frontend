import { API_BASE } from "@/constants/api";

export interface AppReviewRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_role: string | null;
  rating: number;
  comment?: string | null;
  comment_preview?: string;
  improvement_tags: string[];
  read_at: string | null;
  created_at: string;
  updated_at: string;
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

export async function fetchMyAppReview(
  token: string,
): Promise<AppReviewRow | null> {
  const data = await authJson<AppReviewRow | null>("/app-reviews/mine", token);
  return data ?? null;
}

export async function submitAppReview(
  token: string,
  input: {
    rating: number;
    comment?: string;
    improvementTags: string[];
  },
): Promise<AppReviewRow> {
  return authJson<AppReviewRow>("/app-reviews", token, {
    method: "POST",
    body: JSON.stringify({
      rating: input.rating,
      comment: input.comment?.trim() || undefined,
      improvement_tags: input.improvementTags,
    }),
  });
}
