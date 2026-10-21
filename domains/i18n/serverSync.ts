import { API_BASE } from "@/constants/api";
import type { Locale } from "./store";

export async function patchUserLocale(
  token: string,
  locale: Locale,
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preferred_locale: locale }),
    });
    if (!res.ok) return;
  } catch {
    // best-effort sync
  }
}
