import type { Router } from "expo-router";
import { openAsk3elagiAiWithChat } from "@/domains/ai/widget-store";
import type { PushNotificationData } from "@/domains/push/types";

export function getPushNotificationPath(data: PushNotificationData): string {
  if (data.type === "incoming_video_call") {
    return `/video-call?sessionId=${encodeURIComponent(data.sessionId)}`;
  }
  if (data.type === "appointment_reminder") {
    return "/(tabs)/appointments";
  }
  if (data.type === "appointment_status") {
    return "/(tabs)/appointments";
  }
  if (data.type === "consultation_removed") {
    return `/chat/${data.chatId}`;
  }
  if (data.type === "system_notification") {
    return "/(tabs)";
  }
  if (data.type === "surgery") {
    return data.path;
  }
  if (data.type === "intake_exam_reminder") {
    return `/medical/${data.instanceId}`;
  }
  if (data.type === "appointment_request") {
    return `/chat/${data.chatId}`;
  }
  if (data.type === "chat") return `/chat/${data.chatId}`;
  if (data.type === "ai") return "/(tabs)";
  return "/(tabs)";
}

export function navigateFromPushNotification(
  router: Router,
  data: PushNotificationData,
): void {
  if (data.type === "incoming_video_call") {
    router.push({
      pathname: "/video-call",
      params: { sessionId: data.sessionId },
    });
    return;
  }

  if (data.type === "appointment_reminder") {
    router.push("/(tabs)/appointments");
    return;
  }

  if (data.type === "appointment_status") {
    router.push("/(tabs)/appointments");
    return;
  }

  if (data.type === "consultation_removed") {
    router.push(`/chat/${data.chatId}`);
    return;
  }

  if (data.type === "system_notification") {
    router.push("/(tabs)");
    return;
  }

  if (data.type === "surgery") {
    router.push(data.path);
    return;
  }

  if (data.type === "intake_exam_reminder") {
    router.push(`/medical/${data.instanceId}`);
    return;
  }

  if (data.type === "appointment_request") {
    router.push(`/chat/${data.chatId}`);
    return;
  }

  if (data.type === "chat") {
    router.push(`/chat/${data.chatId}`);
    return;
  }

  if (data.type === "ai") {
    router.push("/(tabs)");
    openAsk3elagiAiWithChat(data.chatId);
    return;
  }
}
