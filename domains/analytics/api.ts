import { API_BASE } from "@/constants/api";

export async function recordAppVisit(token: string): Promise<void> {
  await fetch(`${API_BASE}/users/me/visit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}
