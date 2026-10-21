import { useEffect } from "react";
import { emit } from "@/utils/eventBus";
import {
  SYSTEM_NOTIFICATION_EVENTS,
  type SystemNotificationPayload,
} from "@/domains/system-notifications/events";
import { getPresenceSocket, onSystemNotification } from "@/domains/presence/socket";

export function SystemNotificationSync() {
  useEffect(() => {
    const attach = () => {
      onSystemNotification((payload) => {
        const notice: SystemNotificationPayload = {
          title: payload.title,
          body: payload.body,
        };
        emit(SYSTEM_NOTIFICATION_EVENTS.RECEIVED, notice);
      });
    };

    attach();
    const socket = getPresenceSocket();
    const onConnect = () => attach();
    socket?.on("connect", onConnect);
    return () => {
      socket?.off("connect", onConnect);
      onSystemNotification(null);
    };
  }, []);

  return null;
}
