import { API_BASE } from "@/constants/api";

export async function registerPushToken(
  token: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/users/me/push-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    throw new Error(`Failed to register push token (${res.status})`);
  }
}

export async function unregisterPushToken(
  token: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/users/me/push-token`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to unregister push token (${res.status})`);
  }
}
