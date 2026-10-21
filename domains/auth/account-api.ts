import { API_BASE } from "@/constants/api";
import { withAuthRequestInit } from "@/domains/auth/http";

export async function deleteOwnAccount(
  accessToken: string,
  password: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/users/me/account`,
    withAuthRequestInit(accessToken, {
      method: "DELETE",
      body: JSON.stringify({ password }),
    }),
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
        data?.error ??
        `Request failed (${res.status})`,
    );
  }
}
