import { create } from "zustand";
import {
  dismissAllNotifications,
  dismissChatNotifications,
} from "@/domains/push/dismiss";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/domains/notifications/api";

type NotificationsState = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  load: (token: string) => Promise<void>;
  refreshUnread: (token: string) => Promise<void>;
  prepend: (item: AppNotification) => void;
  markRead: (token: string, id: string) => Promise<void>;
  markAllRead: (token: string) => Promise<void>;
  clear: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,

  load: async (token) => {
    set({ loading: true, error: null });
    try {
      const [items, unreadCount] = await Promise.all([
        fetchNotifications(token),
        fetchUnreadNotificationCount(token),
      ]);
      // The request already asks for unread only, but an API that predates that
      // filter returns everything — drop handled rows here so the inbox is
      // never wrong, whichever build is deployed.
      set({
        items: items.filter((n) => !n.read_at),
        unreadCount,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load notifications",
      });
    }
  },

  refreshUnread: async (token) => {
    try {
      const unreadCount = await fetchUnreadNotificationCount(token);
      set({ unreadCount });
    } catch {
      // ignore transient errors
    }
  },

  prepend: (item) => {
    const exists = get().items.some((n) => n.id === item.id);
    if (exists) return;
    // Already handled elsewhere (another device) — nothing to show here.
    if (item.read_at) return;
    set((s) => ({
      items: [item, ...s.items],
      unreadCount: s.unreadCount + 1,
    }));
  },

  // The inbox holds unhandled notifications only, so reading one drops it.
  markRead: async (token, id) => {
    const prev = get().items.find((n) => n.id === id);
    if (!prev) return;
    set((s) => ({
      items: s.items.filter((n) => n.id !== id),
      unreadCount: prev.read_at ? s.unreadCount : Math.max(0, s.unreadCount - 1),
    }));
    const chatId = prev.data?.chatId;
    if (chatId) void dismissChatNotifications(chatId);
    try {
      await markNotificationRead(token, id);
    } catch {
      // Put it back so a failed write doesn't silently lose the notification.
      set((s) => ({
        items: [prev, ...s.items].sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        ),
      }));
      await get().refreshUnread(token);
    }
  },

  markAllRead: async (token) => {
    const prev = get().items;
    set({ items: [], unreadCount: 0 });
    void dismissAllNotifications();
    try {
      await markAllNotificationsRead(token);
    } catch {
      set({ items: prev });
      await get().load(token);
    }
  },

  clear: () => set({ items: [], unreadCount: 0, loading: false, error: null }),
}));
