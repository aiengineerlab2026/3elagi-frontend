export type PushNotificationType =
  | "chat"
  | "ai"
  | "incoming_video_call"
  | "appointment_request"
  | "appointment_status"
  | "appointment_reminder"
  | "intake_exam_reminder"
  | "system_notification"
  | "consultation_removed";

export type ChatPushData = {
  type: "chat";
  chatId: string;
  messageId: string;
  senderId: string;
};

export type AiPushData = {
  type: "ai";
  chatId: string;
  messageId: string;
};

export type IncomingVideoCallPushData = {
  type: "incoming_video_call";
  sessionId: string;
  callerId?: string;
  callerName?: string;
};

export type AppointmentRequestPushData = {
  type: "appointment_request";
  appointmentId?: string;
  chatId: string;
};

export type AppointmentReminderPushData = {
  type: "appointment_reminder";
  sessionId: string;
  appointmentId?: string;
  meetingLink?: string;
  otherParticipantName?: string;
};

export type AppointmentStatusPushData = {
  type: "appointment_status";
  appointmentId?: string;
  action?: "confirm" | "reject" | "cancel";
};

export type SystemNotificationPushData = {
  type: "system_notification";
};

export type ConsultationRemovedPushData = {
  type: "consultation_removed";
  chatId: string;
  consultationId?: string;
  removedBy?: string;
};

/** Screens a surgery notification may open — anything else is ignored. */
export const SURGERY_PUSH_PATHS = [
  "/(tabs)/reservations",
  "/(tabs)/surgeries",
  "/(tabs)/hospitals",
  "/hospital",
  "/hospital/doctors",
  "/hospital/availability",
] as const;

export type SurgeryPushData = {
  type: "surgery";
  path: (typeof SURGERY_PUSH_PATHS)[number];
};

export type IntakeExamReminderPushData = {
  type: "intake_exam_reminder";
  instanceId: string;
};

export type PushNotificationData =
  | ChatPushData
  | AiPushData
  | IncomingVideoCallPushData
  | AppointmentRequestPushData
  | AppointmentReminderPushData
  | AppointmentStatusPushData
  | IntakeExamReminderPushData
  | SystemNotificationPushData
  | SurgeryPushData
  | ConsultationRemovedPushData;

function readString(
  data: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

/** Normalize Expo notification `data` — Android may nest or stringify payloads. */
export function extractPushNotificationData(
  raw: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;

  if (typeof raw.body === "string") {
    try {
      const nested = JSON.parse(raw.body) as Record<string, unknown>;
      if (nested && typeof nested === "object") {
        return { ...nested, ...raw };
      }
    } catch {
      // ignore
    }
  }

  return raw;
}

export function parsePushNotificationData(
  raw: Record<string, unknown> | undefined,
): PushNotificationData | null {
  const data = extractPushNotificationData(raw);
  if (!data) return null;

  const type = readString(data, "type");

  if (type === "incoming_video_call") {
    const sessionId = readString(data, "sessionId", "session_id");
    if (!sessionId) return null;
    return {
      type: "incoming_video_call",
      sessionId,
      callerId: readString(data, "callerId", "caller_id") || undefined,
      callerName: readString(data, "callerName", "caller_name") || undefined,
    };
  }

  if (type === "appointment_reminder") {
    const sessionId = readString(data, "sessionId", "session_id");
    const meetingLink = readString(data, "meetingLink", "meeting_link") || undefined;
    if (!sessionId && !meetingLink) return null;
    return {
      type: "appointment_reminder",
      sessionId: sessionId || "direct",
      appointmentId: readString(data, "appointmentId", "appointment_id") || undefined,
      meetingLink,
      otherParticipantName:
        readString(data, "otherParticipantName", "other_participant_name") || undefined,
    };
  }

  if (type === "appointment_status") {
    return {
      type: "appointment_status",
      appointmentId: readString(data, "appointmentId", "appointment_id") || undefined,
      action: (readString(data, "action") as "confirm" | "reject" | "cancel") || undefined,
    };
  }

  if (type === "consultation_removed") {
    const chatId = readString(data, "chatId", "chat_id");
    if (!chatId) return null;
    return {
      type: "consultation_removed",
      chatId,
      consultationId:
        readString(data, "consultationId", "consultation_id") || undefined,
      removedBy: readString(data, "removedBy", "removed_by") || undefined,
    };
  }

  if (type === "system_notification") {
    return {
      type: "system_notification",
    };
  }

  if (type === "surgery") {
    const path = SURGERY_PUSH_PATHS.find((p) => p === readString(data, "path"));
    return path ? { type: "surgery", path } : { type: "system_notification" };
  }

  if (type === "intake_exam_reminder") {
    const instanceId = readString(data, "instanceId", "instance_id");
    if (!instanceId) return null;
    return { type: "intake_exam_reminder", instanceId };
  }

  const chatId = readString(data, "chatId", "chat_id", "threadId", "thread_id");
  const messageId = readString(data, "messageId", "message_id");

  if (type === "appointment_request") {
    if (!chatId) return null;
    return {
      type: "appointment_request",
      appointmentId: readString(data, "appointmentId", "appointment_id") || undefined,
      chatId,
    };
  }

  if (!chatId) return null;

  const senderId = readString(data, "senderId", "sender_id") || chatId;

  if (type === "ai") {
    return { type: "ai", chatId, messageId };
  }

  if (type === "chat" || senderId) {
    return { type: "chat", chatId, messageId, senderId };
  }

  return null;
}
