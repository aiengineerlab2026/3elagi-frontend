import { describe, expect, it, vi } from "vitest";
import type { AppNotification } from "./api";

const fetchNotifications = vi.fn();
const fetchUnreadNotificationCount = vi.fn().mockResolvedValue(1);

vi.mock("./api", () => ({
  fetchNotifications: (...a: unknown[]) => fetchNotifications(...a),
  fetchUnreadNotificationCount: () => fetchUnreadNotificationCount(),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/domains/push/dismiss", () => ({
  dismissAllNotifications: vi.fn(),
  dismissChatNotifications: vi.fn(),
}));

const { useNotificationsStore } = await import("./store");

function note(id: string, read: boolean): AppNotification {
  return {
    id,
    type: "chat",
    title: "t",
    body: "b",
    data: {},
    read_at: read ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
  };
}

describe("notifications inbox", () => {
  it("shows only what the user has not opened yet", async () => {
    // An API build without the `unread` filter returns handled rows too.
    fetchNotifications.mockResolvedValueOnce([
      note("a", false),
      note("b", true),
      note("c", false),
    ]);
    await useNotificationsStore.getState().load("token");
    expect(useNotificationsStore.getState().items.map((n) => n.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("drops a notification once it is opened", async () => {
    fetchNotifications.mockResolvedValueOnce([note("a", false), note("c", false)]);
    await useNotificationsStore.getState().load("token");
    await useNotificationsStore.getState().markRead("token", "a");
    expect(useNotificationsStore.getState().items.map((n) => n.id)).toEqual(["c"]);
  });

  it("empties the list on mark-all-read", async () => {
    fetchNotifications.mockResolvedValueOnce([note("a", false)]);
    await useNotificationsStore.getState().load("token");
    await useNotificationsStore.getState().markAllRead("token");
    expect(useNotificationsStore.getState().items).toEqual([]);
    expect(useNotificationsStore.getState().unreadCount).toBe(0);
  });
});
