import React, { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/domains/auth/store";
import { useChatStore } from "@/domains/chat/store";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { CHAT_EVENTS } from "@/domains/chat/events";
import { navigateFromPushNotification } from "@/domains/push/navigation";
import { getNotificationsEnabled } from "@/domains/push/notificationsPreference";
import { getPushProvider } from "@/domains/push/push-provider.factory";
import { parsePushNotificationData } from "@/domains/push/types";
import { emit, on } from "@/utils/eventBus";

/**
 * Bootstraps the active push provider (Expo or OneSignal) via factory.
 */
export function PushNotificationsBootstrap() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const activeChatPeerId = useChatStore((s) => s.activeChatPeerId);
  const provider = getPushProvider();
  const tokenRef = useRef<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const activeChatPeerIdRef = useRef<string | null>(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    activeChatPeerIdRef.current = activeChatPeerId;
  }, [activeChatPeerId]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    provider.init();
  }, [provider]);

  useEffect(() => {
    if (Platform.OS === "web" || !hydrated || !accessToken) return;

    let cancelled = false;

    const attemptRegister = (label: string) => {
      void getNotificationsEnabled()
        .then((enabled) => {
          if (cancelled || !enabled) {
            if (!enabled) {
              console.log(`[push] Skipping registration — notifications disabled (${label})`);
            }
            return null;
          }
          return provider.register(accessToken);
        })
        .then((token) => {
          if (cancelled || !token) return;
          tokenRef.current = token;
          console.log(`[push] Expo push token registered (${label})`);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          console.warn(
            "[push] Token registration failed:",
            (err as Error)?.message ?? err,
          );
        });
    };

    attemptRegister("initial");
    const retryTimer = setTimeout(() => attemptRegister("retry"), 5000);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [hydrated, accessToken, provider]);

  const handleOpen = useCallback(
    (data: Record<string, unknown> | undefined) => {
      const parsed = parsePushNotificationData(data);
      if (!parsed) return;
      navigateFromPushNotification(router, parsed);
    },
    [router],
  );

  const handleForegroundChat = useCallback(
    (payload: {
      peerId: string;
      senderName: string;
      preview: string;
      messageId: string;
    }) => {
      if (activeChatPeerIdRef.current === payload.peerId) return;
      emit(CHAT_EVENTS.MESSAGE_RECEIVED, payload);
    },
    [],
  );

  useEffect(() => {
    if (Platform.OS === "web" || !accessToken) return;

    return provider.subscribe(
      {
        router,
        hydrated,
        accessToken,
        profileId: profile?.id,
        activeChatPeerId,
      },
      handleForegroundChat,
      handleOpen,
    );
  }, [
    accessToken,
    hydrated,
    profile?.id,
    activeChatPeerId,
    provider,
    router,
    handleForegroundChat,
    handleOpen,
  ]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const unsubscribe = on(AUTH_EVENTS.LOGOUT, () => {
      provider.onLogout(accessTokenRef.current, tokenRef.current);
      tokenRef.current = null;
      accessTokenRef.current = null;
    });

    return unsubscribe;
  }, [provider]);

  return null;
}
