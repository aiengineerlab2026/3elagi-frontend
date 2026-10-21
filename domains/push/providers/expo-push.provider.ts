import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { onAppResume } from "@/utils/appResume";
import { shouldSuppressAiPush } from "@/domains/ai/push-suppression";
import { extractPushNotificationData } from "@/domains/push/types";
import {
  clearPushTokenRegistrationCache,
  getCachedPushToken,
  registerPushToken,
} from "@/domains/push/registerPushToken";
import { unregisterPushToken } from "@/domains/push/api";
import { ensurePushChannels } from "@/domains/push/expoPush";
import { stopIncomingCallRing } from "@/domains/video-call/incomingCallRing";
import type { PushBootstrapContext, PushProvider } from "@/domains/push/providers/types";
import {
  VIDEO_CALL_EVENTS,
  type IncomingVideoCallPushPayload,
} from "@/domains/video-call/events";
import { emit } from "@/utils/eventBus";

function shouldSuppressForegroundAiPush(data: Record<string, unknown> | undefined): boolean {
  if (data?.type !== "ai") return false;
  const chatId = String(
    data.chatId ?? data.chat_id ?? data.threadId ?? data.thread_id ?? "",
  );
  return shouldSuppressAiPush(chatId);
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown>;
    if (shouldSuppressForegroundAiPush(data)) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    if (data?.type === "video_call_cancelled") {
      const sessionId = String(data.sessionId ?? data.session_id ?? "");
      if (sessionId) stopIncomingCallRing(sessionId);
      // Tray-only replacement for a call that stopped ringing — nothing to
      // show over an app that is already open.
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    if (data?.type === "incoming_video_call") {
      // The call push always fires now, so in the foreground it would ring on
      // top of the in-app call overlay. Show it, let the overlay's ringtone be
      // the only sound.
      return {
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }
    if (
      data?.type === "system_notification" ||
      data?.type === "consultation_removed" ||
      data?.type === "appointment_reminder" ||
      data?.type === "appointment_status"
    ) {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }
    return {
      // ponytail: suppress system popup in foreground; in-app banner handles chat instead
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    };
  },
});

// ponytail: module-level set prevents double-navigation when subscribe() re-runs
const handledInitialIds = new Set<string>();

export class ExpoPushProvider implements PushProvider {
  readonly id = "expo" as const;

  init(): void {
    if (Platform.OS === "web") return;
    void ensurePushChannels();
  }

  async register(accessToken: string): Promise<string | null> {
    if (Platform.OS === "web") return null;
    return registerPushToken(accessToken);
  }

  onLogout(accessToken?: string | null, token?: string | null): void {
    // The caller's ref only holds a token when this session did the registering
    // — after an app restart on a persisted login it is null. Fall back to the
    // install's cached token, or the device stays bound to the account that
    // just logged out and keeps receiving its notifications.
    const deviceToken = token ?? getCachedPushToken();
    clearPushTokenRegistrationCache();
    if (!deviceToken || !accessToken) return;
    void unregisterPushToken(deviceToken, accessToken).catch(() => {});
  }

  subscribe(
    ctx: PushBootstrapContext,
    onForegroundChat: (payload: {
      peerId: string;
      senderName: string;
      preview: string;
      messageId: string;
    }) => void,
    onOpen: (data: Record<string, unknown> | undefined) => void,
  ): () => void {
    if (Platform.OS === "web") return () => {};

    const tokenSub = Notifications.addPushTokenListener(() => {
      if (ctx.accessToken) {
        void registerPushToken(ctx.accessToken).catch(() => {});
      }
    });

    // Re-register on resume, but deferred off the resume frame (and skipped for
    // brief background flaps) so it never freezes the UI on foreground.
    const removeResumeTask = onAppResume(() => {
      if (ctx.accessToken) {
        void registerPushToken(ctx.accessToken).catch(() => {});
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const data = extractPushNotificationData(
        content.data as Record<string, unknown>,
      );
      if (shouldSuppressForegroundAiPush(data)) return;
      if (data?.type === "video_call_cancelled") {
        const sessionId = String(data.sessionId ?? data.session_id ?? "");
        if (sessionId) stopIncomingCallRing(sessionId);
        return;
      }
      // A call push in the foreground means the socket did not deliver it (or
      // has not yet) — raise the in-app overlay so the doctor still hears it.
      if (data?.type === "incoming_video_call") {
        const sessionId = String(data.sessionId ?? data.session_id ?? "");
        if (sessionId) {
          emit<IncomingVideoCallPushPayload>(VIDEO_CALL_EVENTS.INCOMING_PUSH, {
            sessionId,
            callerId: data.callerId ? String(data.callerId) : undefined,
            callerName: data.callerName ? String(data.callerName) : undefined,
          });
        }
        return;
      }
      if (data?.type !== "chat" && data?.type !== "appointment_request") return;
      onForegroundChat({
        peerId: String(
          data.chatId ?? data.chat_id ?? data.threadId ?? data.thread_id ?? "",
        ),
        senderName: typeof content.title === "string" ? content.title : "New message",
        preview: typeof content.body === "string" ? content.body : "New message",
        messageId: String(data.messageId ?? ""),
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      onOpen(
        extractPushNotificationData(
          response.notification.request.content.data as Record<string, unknown>,
        ),
      );
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledInitialIds.has(id)) return;
      handledInitialIds.add(id);
      onOpen(
        extractPushNotificationData(
          response.notification.request.content.data as Record<string, unknown>,
        ),
      );
    });

    return () => {
      tokenSub.remove();
      removeResumeTask();
      receivedSub.remove();
      responseSub.remove();
    };
  }
}
