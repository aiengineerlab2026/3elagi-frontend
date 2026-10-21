import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useAuthStore } from "@/domains/auth/store";
import { requestWebNotificationPermission } from "@/domains/push/webNotifications";

/** Requests browser notification permission for chat alerts on web. */
export function WebChatNotificationsBootstrap() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (Platform.OS !== "web" || !hydrated || !accessToken) return;
    void requestWebNotificationPermission();
  }, [hydrated, accessToken]);

  return null;
}
