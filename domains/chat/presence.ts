import { usePresenceStore } from "@/domains/presence";
import type { ChatUser, Presence } from "./types";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Stable simulated presence per user — same user always gets the same status. */
export function simulatePresence(userId: string): Pick<ChatUser, "presence" | "lastSeenAt"> {
  const bucket = hashString(userId) % 100;
  const now = Date.now();

  if (bucket < 32) {
    return {
      presence: "online",
      lastSeenAt: new Date(now - 30_000).toISOString(),
    };
  }
  if (bucket < 45) {
    return {
      presence: "away",
      lastSeenAt: new Date(now - 15 * 60_000).toISOString(),
    };
  }
  if (bucket < 68) {
    return {
      presence: "offline",
      lastSeenAt: new Date(now - 3 * 3_600_000).toISOString(),
    };
  }
  if (bucket < 84) {
    return {
      presence: "offline",
      lastSeenAt: new Date(now - 8 * 3_600_000).toISOString(),
    };
  }
  return {
    presence: "offline",
    lastSeenAt: new Date(now - 26 * 3_600_000).toISOString(),
  };
}

export function applySimulatedPresence<T extends { id: string }>(
  user: T,
): T & Pick<ChatUser, "presence" | "lastSeenAt"> {
  return { ...user, ...simulatePresence(user.id) };
}

/** Real-time presence from the shared Socket.IO connection. */
export function applyLivePresence<T extends { id: string }>(
  user: T,
): T & Pick<ChatUser, "presence" | "lastSeenAt"> {
  const online = usePresenceStore.getState().isOnline(user.id);
  if (online) {
    return {
      ...user,
      presence: "online",
      lastSeenAt: new Date().toISOString(),
    };
  }
  return {
    ...user,
    presence: "offline",
    lastSeenAt: undefined,
  };
}

export function presenceSortWeight(presence: Presence): number {
  if (presence === "online") return 0;
  if (presence === "away") return 1;
  return 2;
}

function formatLastActive(iso: string | undefined, isRTL: boolean): string {
  if (!iso) return isRTL ? "غير متصل" : "Offline";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return isRTL ? "نشط الآن" : "Active now";
  if (minutes < 60) {
    return isRTL ? `نشط منذ ${minutes} د` : `Active ${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isRTL ? `نشط منذ ${hours} س` : `Active ${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return isRTL ? `نشط منذ ${days} ي` : `Active ${days}d ago`;
}

export function formatPresenceLabel(
  user: Pick<ChatUser, "presence" | "lastSeenAt" | "specialty">,
  isRTL: boolean,
): string {
  if (user.presence === "online") {
    return isRTL ? "متصل الآن" : "Active now";
  }
  if (user.presence === "away") {
    return isRTL ? "بعيد" : "Away";
  }
  return formatLastActive(user.lastSeenAt, isRTL);
}

export function presenceTextColor(
  presence: Presence,
  colors: { success: string; warning: string; mutedForeground: string },
): string {
  if (presence === "online") return colors.success;
  if (presence === "away") return colors.warning;
  return colors.mutedForeground;
}
