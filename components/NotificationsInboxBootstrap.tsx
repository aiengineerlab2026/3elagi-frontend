import { useEffect } from "react";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { useNotificationsStore } from "@/domains/notifications/store";
import type { AppNotification } from "@/domains/notifications/api";
import {
  getPresenceSocket,
  onInboxNotification,
} from "@/domains/presence/socket";
import { on } from "@/utils/eventBus";

/** Keeps unread badge + list in sync (REST + live socket). */
export function NotificationsInboxBootstrap() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const signedIn = isSignedIn(profile, accessToken);
  const refreshUnread = useNotificationsStore((s) => s.refreshUnread);
  const prepend = useNotificationsStore((s) => s.prepend);
  const clear = useNotificationsStore((s) => s.clear);

  useEffect(() => {
    if (!hydrated) return;
    if (!signedIn || !accessToken) {
      clear();
      return;
    }
    void refreshUnread(accessToken);
  }, [hydrated, signedIn, accessToken, refreshUnread, clear]);

  useEffect(() => {
    if (!signedIn) return;

    onInboxNotification((payload) => {
      prepend(payload as AppNotification);
    });

    const socket = getPresenceSocket();
    // Re-bind if socket reconnects after this mount.
    const onConnect = () => {
      /* listeners already bound in socket module */
    };
    socket?.on("connect", onConnect);

    return () => {
      onInboxNotification(null);
      socket?.off("connect", onConnect);
    };
  }, [signedIn, prepend]);

  useEffect(() => {
    return on(AUTH_EVENTS.LOGOUT, () => {
      clear();
    });
  }, [clear]);

  return null;
}
