import { API_BASE } from "@/constants/api";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read_at: string | null;
  created_at: string;
};

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
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message ?? `Request failed (${res.status})`,
    );
  }
  return data;
}

/** The inbox only lists what the user has not handled yet. */
export async function fetchNotifications(
  token: string,
  limit = 50,
  unreadOnly = true,
): Promise<AppNotification[]> {
  const data = await authJson<AppNotification[]>(
    `/notifications?limit=${limit}${unreadOnly ? "&unread=1" : ""}`,
    token,
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadNotificationCount(
  token: string,
): Promise<number> {
  const data = await authJson<{ count: number }>(
    "/notifications/unread-count",
    token,
  );
  return typeof data?.count === "number" ? data.count : 0;
}

export async function markNotificationRead(
  token: string,
  id: string,
): Promise<AppNotification> {
  return authJson<AppNotification>(`/notifications/${id}/read`, token, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(
  token: string,
): Promise<{ updated: number }> {
  return authJson<{ updated: number }>("/notifications/read-all", token, {
    method: "POST",
  });
}
