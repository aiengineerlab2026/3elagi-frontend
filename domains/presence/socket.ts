import { io, type Socket } from "socket.io-client";
import { SOCKET_BASE } from "@/constants/api";
import { on } from "@/utils/eventBus";
import { AUTH_EVENTS } from "@/domains/auth/events";
import type { AuthLogoutPayload } from "@/domains/auth/events";
import type { DoctorPatientAccessStatus, MessageRow } from "@/domains/chat";
import { usePresenceStore } from "./store";
import type { LoggedInUser } from "./types";

let socket: Socket | null = null;

type IncomingMessageHandler = (payload: {
  message: MessageRow;
  peer_id: string;
  peer_name?: string;
  peer_photo_url?: string | null;
  peer_role?: string | null;
}) => void;

let onMessageNew: IncomingMessageHandler | null = null;
let onMessageDeletedHandler:
  | ((payload: { message_id: string; peer_id: string }) => void)
  | null = null;
let onConsultationRemovedHandler:
  | ((payload: {
      consultation_id: string;
      peer_id: string;
      message_ids?: string[];
    }) => void)
  | null = null;
let onMessageUpdatedHandler:
  | ((payload: { message: MessageRow; peer_id: string }) => void)
  | null = null;
let onTypingHandler: ((payload: { peer_id: string }) => void) | null = null;
let onStopTypingHandler: ((payload: { peer_id: string }) => void) | null = null;
let onAccessUpdatedHandler:
  | ((payload: { status: DoctorPatientAccessStatus; peer_id: string }) => void)
  | null = null;
let onMessageEmotionUpdatedHandler:
  | ((payload: {
      message_id: string;
      message_source: "chat" | "ai";
      emotions: Array<{ user_id: string; emotion: import("@/domains/emotions/types").MessageEmotionType }>;
    }) => void)
  | null = null;
let onMessagesReadHandler:
  | ((payload: { peer_id: string; read_at: string }) => void)
  | null = null;
let onDoctorRegisteredHandler:
  | ((payload: import("@/domains/home/api").SpecialityDoctorRow) => void)
  | null = null;
let onAppointmentReminderHandler:
  | ((payload: {
      appointment_id: string;
      session_id?: string;
      meeting_link?: string;
      when: string;
      other_participant_name?: string;
    }) => void)
  | null = null;
let onIntakeExamReminderHandler:
  | ((payload: {
      instanceId: string;
      examName: string;
      doctorName: string;
      deadlineAt: string;
      title: string;
      body: string;
    }) => void)
  | null = null;
let onAppointmentUpdatedHandler:
  | ((payload: {
      appointment_id?: string;
      peer_id?: string;
      actor_id?: string;
      actor_name?: string;
      action?: "confirm" | "reject" | "cancel";
      date?: string;
      time?: string;
      status?: string;
    }) => void)
  | null = null;
let onIncomingVideoCallHandler:
  | ((payload: {
      session_id: string;
      caller_id?: string;
      caller_name?: string;
    }) => void)
  | null = null;
export type VideoCallStatusPayload = {
  session_id: string;
  status: "accepted" | "declined" | "ended" | "missed";
  room_url?: string;
  doctor_name?: string;
  duration_minutes?: number;
};
let onVideoCallStatusHandler:
  | ((payload: VideoCallStatusPayload) => void)
  | null = null;
let onSystemNotificationHandler:
  | ((payload: {
      title?: string;
      body: string;
    }) => void)
  | null = null;
let onInboxNotificationHandler:
  | ((payload: {
      id: string;
      type: string;
      title: string;
      body: string;
      data: Record<string, string>;
      read_at: string | null;
      created_at: string;
    }) => void)
  | null = null;

export function onChatMessageNew(handler: IncomingMessageHandler | null) {
  onMessageNew = handler;
}

export function onChatMessageDeleted(
  handler: ((payload: { message_id: string; peer_id: string }) => void) | null,
) {
  onMessageDeletedHandler = handler;
}

export function onConsultationRemoved(
  handler:
    | ((payload: {
        consultation_id: string;
        peer_id: string;
        message_ids?: string[];
      }) => void)
    | null,
) {
  onConsultationRemovedHandler = handler;
}

export function onChatMessageUpdated(
  handler: ((payload: { message: MessageRow; peer_id: string }) => void) | null,
) {
  onMessageUpdatedHandler = handler;
}

/** Peer opened the thread and read everything we sent them. */
export function onChatMessagesRead(
  handler: ((payload: { peer_id: string; read_at: string }) => void) | null,
) {
  onMessagesReadHandler = handler;
}

export function onChatTyping(handler: ((payload: { peer_id: string }) => void) | null) {
  onTypingHandler = handler;
}

export function onChatStopTyping(handler: ((payload: { peer_id: string }) => void) | null) {
  onStopTypingHandler = handler;
}

export function onChatAccessUpdated(
  handler: ((payload: { status: DoctorPatientAccessStatus; peer_id: string }) => void) | null,
) {
  onAccessUpdatedHandler = handler;
}

export function onMessageEmotionUpdated(
  handler:
    | ((payload: {
        message_id: string;
        message_source: "chat" | "ai";
        emotions: Array<{ user_id: string; emotion: import("@/domains/emotions/types").MessageEmotionType }>;
      }) => void)
    | null,
) {
  onMessageEmotionUpdatedHandler = handler;
}

export function onDoctorRegistered(
  handler: ((payload: import("@/domains/home/api").SpecialityDoctorRow) => void) | null,
) {
  onDoctorRegisteredHandler = handler;
}

export function onAppointmentReminder(
  handler:
    | ((payload: {
        appointment_id: string;
        session_id?: string;
        meeting_link?: string;
        when: string;
        other_participant_name?: string;
      }) => void)
    | null,
) {
  onAppointmentReminderHandler = handler;
}

export function onIntakeExamReminder(
  handler:
    | ((payload: {
        instanceId: string;
        examName: string;
        doctorName: string;
        deadlineAt: string;
        title: string;
        body: string;
      }) => void)
    | null,
) {
  onIntakeExamReminderHandler = handler;
}

export function onAppointmentUpdated(
  handler:
    | ((payload: {
        appointment_id?: string;
        peer_id?: string;
        actor_id?: string;
        actor_name?: string;
        action?: "confirm" | "reject" | "cancel";
        date?: string;
        time?: string;
        status?: string;
      }) => void)
    | null,
) {
  onAppointmentUpdatedHandler = handler;
}

export function onIncomingVideoCall(
  handler:
    | ((payload: {
        session_id: string;
        caller_id?: string;
        caller_name?: string;
      }) => void)
    | null,
) {
  onIncomingVideoCallHandler = handler;
}

/** Caller side of a call: the doctor answered, declined, or hung up. */
export function onVideoCallStatus(
  handler: ((payload: VideoCallStatusPayload) => void) | null,
) {
  onVideoCallStatusHandler = handler;
}

export function onSystemNotification(
  handler:
    | ((payload: {
        title?: string;
        body: string;
      }) => void)
    | null,
) {
  onSystemNotificationHandler = handler;
}

export function onInboxNotification(
  handler:
    | ((payload: {
        id: string;
        type: string;
        title: string;
        body: string;
        data: Record<string, string>;
        read_at: string | null;
        created_at: string;
      }) => void)
    | null,
) {
  onInboxNotificationHandler = handler;
}

export function emitChatTyping(recipientId: string, userId: string) {
  socket?.emit("chat:typing", { recipient_id: recipientId, user_id: userId });
}

export function emitChatStopTyping(recipientId: string, userId: string) {
  socket?.emit("chat:stopTyping", { recipient_id: recipientId, user_id: userId });
}

export function getPresenceSocket() {
  return socket;
}

function bindListeners(client: Socket) {
  client.on("newlogin", (user: LoggedInUser) => {
    if (user?.id) usePresenceStore.getState().addUser(user);
  });

  client.on("newlogout", (user: LoggedInUser) => {
    if (user?.id) usePresenceStore.getState().removeUser(user.id);
  });

  client.on("loggedIn:users", (users: LoggedInUser[]) => {
    if (Array.isArray(users)) usePresenceStore.getState().setUsers(users);
  });

  client.on("presence:sync", (payload: { users?: LoggedInUser[] }) => {
    if (Array.isArray(payload?.users)) {
      usePresenceStore.getState().setUsers(payload.users);
    }
  });

  client.on(
    "appointment:reminder",
    (payload: {
      appointment_id?: string;
      session_id?: string;
      meeting_link?: string;
      when?: string;
      other_participant_name?: string;
    }) => {
      if (payload?.appointment_id && payload?.when) {
        onAppointmentReminderHandler?.({
          appointment_id: payload.appointment_id,
          session_id: payload.session_id,
          meeting_link: payload.meeting_link,
          when: payload.when,
          other_participant_name: payload.other_participant_name,
        });
      }
    },
  );

  client.on(
    "intake-exam:reminder",
    (payload: {
      instanceId?: string;
      examName?: string;
      doctorName?: string;
      deadlineAt?: string;
      title?: string;
      body?: string;
    }) => {
      if (payload?.instanceId && payload?.deadlineAt) {
        onIntakeExamReminderHandler?.({
          instanceId: payload.instanceId,
          examName: payload.examName ?? "Intake exam",
          doctorName: payload.doctorName ?? "Doctor",
          deadlineAt: payload.deadlineAt,
          title: payload.title ?? "Intake exam reminder",
          body: payload.body ?? "",
        });
      }
    },
  );

  client.on(
    "message:new",
    (payload: {
      message: MessageRow;
      peer_id: string;
      peer_name?: string;
      peer_photo_url?: string | null;
      peer_role?: string | null;
    }) => {
      onMessageNew?.(payload);
    },
  );

  client.on("message:deleted", (payload: { message_id: string; peer_id: string }) => {
    if (payload?.message_id && payload?.peer_id) onMessageDeletedHandler?.(payload);
  });

  client.on(
    "consultation:removed",
    (payload: {
      consultation_id?: string;
      peer_id?: string;
      message_ids?: string[];
    }) => {
      if (!payload?.consultation_id || !payload?.peer_id) return;
      onConsultationRemovedHandler?.({
        consultation_id: payload.consultation_id,
        peer_id: payload.peer_id,
        message_ids: payload.message_ids,
      });
    },
  );

  client.on(
    "messages:read",
    (payload: { peer_id?: string; read_at?: string }) => {
      if (!payload?.peer_id) return;
      onMessagesReadHandler?.({
        peer_id: payload.peer_id,
        read_at: payload.read_at ?? new Date().toISOString(),
      });
    },
  );

  client.on("message:updated", (payload: { message: MessageRow; peer_id: string }) => {
    if (payload?.message?.id && payload?.peer_id) onMessageUpdatedHandler?.(payload);
  });

  client.on("chat:typing", (payload: { peer_id: string }) => {
    if (payload?.peer_id) onTypingHandler?.(payload);
  });

  client.on("chat:stopTyping", (payload: { peer_id: string }) => {
    if (payload?.peer_id) onStopTypingHandler?.(payload);
  });

  client.on("access:updated", (payload: { status: DoctorPatientAccessStatus; peer_id: string }) => {
    if (payload?.status && payload?.peer_id) onAccessUpdatedHandler?.(payload);
  });

  client.on(
    "message:emotion:updated",
    (payload: {
      message_id?: string;
      message_source?: "chat" | "ai";
      emotions?: Array<{ user_id: string; emotion: import("@/domains/emotions/types").MessageEmotionType }>;
    }) => {
      if (payload?.message_id && payload?.message_source && Array.isArray(payload.emotions)) {
        onMessageEmotionUpdatedHandler?.({
          message_id: payload.message_id,
          message_source: payload.message_source,
          emotions: payload.emotions,
        });
      }
    },
  );

  client.on(
    "doctor:call-state",
    (payload: { doctor_user_id?: string; busy?: boolean }) => {
      if (payload?.doctor_user_id) {
        usePresenceStore
          .getState()
          .setDoctorBusy(payload.doctor_user_id, !!payload.busy);
      }
    },
  );

  client.on("doctor:registered", (payload: import("@/domains/home/api").SpecialityDoctorRow) => {
    if (payload?.id && payload?.doctor_id && payload?.speciality_id) {
      onDoctorRegisteredHandler?.(payload);
    }
  });

  client.on(
    "appointment:updated",
    (payload: {
      appointment_id?: string;
      peer_id?: string;
      actor_id?: string;
      actor_name?: string;
      action?: "confirm" | "reject" | "cancel";
      date?: string;
      time?: string;
      status?: string;
    }) => {
      onAppointmentUpdatedHandler?.(payload);
    },
  );

  client.on(
    "video-call:incoming",
    (payload: {
      session_id?: string;
      caller_id?: string;
      caller_name?: string;
    }) => {
      if (payload?.session_id) {
        onIncomingVideoCallHandler?.({
          session_id: payload.session_id,
          caller_id: payload.caller_id,
          caller_name: payload.caller_name,
        });
      }
    },
  );

  client.on("video-call:status", (payload: Partial<VideoCallStatusPayload>) => {
    if (payload?.session_id && payload.status) {
      onVideoCallStatusHandler?.(payload as VideoCallStatusPayload);
    }
  });

  client.on(
    "system:notification",
    (payload: {
      title?: string;
      body?: string;
    }) => {
      if (payload?.body) {
        onSystemNotificationHandler?.({
          title: payload.title,
          body: payload.body,
        });
      }
    },
  );

  client.on(
    "notification:new",
    (payload: {
      id?: string;
      type?: string;
      title?: string;
      body?: string;
      data?: Record<string, string>;
      read_at?: string | null;
      created_at?: string;
    }) => {
      if (!payload?.id || !payload.type) return;
      onInboxNotificationHandler?.({
        id: payload.id,
        type: payload.type,
        title: payload.title ?? "",
        body: payload.body ?? "",
        data: payload.data ?? {},
        read_at: payload.read_at ?? null,
        created_at: payload.created_at ?? new Date().toISOString(),
      });
    },
  );
}

/** Re-register presence on an existing socket (e.g. doctor returns to a browser tab). */
export function announcePresenceLogin(user: LoggedInUser, accessToken?: string) {
  if (!socket?.connected) {
    connectPresenceSocket(user, accessToken);
    return;
  }
  socket.emit("user:loggedIn", user);
  socket.emit("get:loggedIn:users");
}

/** Mark user offline without tearing down the socket (web tab hidden). */
export function announcePresenceLogout(userId: string) {
  if (socket?.connected) {
    socket.emit("user:loggedOut", { id: userId });
  }
}

export function connectPresenceSocket(user: LoggedInUser, accessToken?: string) {
  if (socket?.connected) {
    announcePresenceLogin(user, accessToken);
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_BASE, {
    transports: ["websocket"],
    autoConnect: true,
    auth: accessToken ? { token: accessToken } : undefined,
  });

  bindListeners(socket);

  socket.on("connect", () => {
    socket?.emit("user:loggedIn", user);
    socket?.emit("get:loggedIn:users");
  });

  socket.on("reconnect", () => {
    socket?.emit("user:loggedIn", user);
    socket?.emit("get:loggedIn:users");
  });

  return socket;
}

export function disconnectPresenceSocket(userId?: string) {
  if (!socket) return;

  if (userId && socket.connected) {
    socket.emit("user:loggedOut", { id: userId });
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  usePresenceStore.getState().clear();
}

// Cross-domain subscription: disconnect on logout
on<AuthLogoutPayload>(AUTH_EVENTS.LOGOUT, ({ userId }) => {
  disconnectPresenceSocket(userId);
});
