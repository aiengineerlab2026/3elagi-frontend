import type { Socket } from "socket.io-client";
import { createSocket } from "@/domains/realtime/createSocket";
import { useChatStore } from "@/domains/chat/store";
import type { LoggedInUser } from "@/domains/presence/types";
import type { MessageRow } from "@/domains/chat/api";

/**
 * Each open doctor↔patient conversation runs on its own dedicated socket,
 * separate from the presence/main socket. It joins the user room (so the backend
 * delivers this user's chat events) and handles just this peer's realtime. The
 * presence socket stays the global source of truth for the conversation list;
 * overlap on the active peer is idempotent (dedup by id, no unread bump while
 * viewing), so nothing is double-counted.
 */
let convSocket: Socket | null = null;
let convPeerId: string | null = null;

interface ConnectOpts {
  peerId: string;
  selfId: string;
  user: LoggedInUser;
  accessToken: string;
}

export function connectConversationSocket({
  peerId,
  selfId,
  user,
  accessToken,
}: ConnectOpts): Socket {
  disconnectConversationSocket();

  const socket = createSocket(accessToken);
  convSocket = socket;
  convPeerId = peerId;

  const store = () => useChatStore.getState();
  const isThisPeer = (id?: string) => !!id && id === peerId;

  // Join the user room so chat events for this user reach this socket too.
  socket.on("connect", () => {
    socket.emit("user:loggedIn", user);
  });

  socket.on(
    "message:new",
    (payload: {
      message: MessageRow;
      peer_id: string;
      peer_name?: string;
      peer_photo_url?: string | null;
      peer_role?: string | null;
    }) => {
      if (!isThisPeer(payload?.peer_id)) return;
      store().handleIncomingMessage(payload, accessToken, selfId);
    },
  );

  socket.on(
    "message:updated",
    (payload: { message: MessageRow; peer_id: string }) => {
      if (!isThisPeer(payload?.peer_id) || !payload?.message?.id) return;
      store().handleIncomingMessageUpdate(payload, accessToken, selfId);
    },
  );

  socket.on(
    "message:deleted",
    (payload: { message_id: string; peer_id: string }) => {
      if (!isThisPeer(payload?.peer_id) || !payload?.message_id) return;
      store().handleIncomingMessageDelete(payload, accessToken, selfId);
    },
  );

  socket.on(
    "consultation:removed",
    (payload: {
      consultation_id?: string;
      peer_id?: string;
      message_ids?: string[];
    }) => {
      if (!isThisPeer(payload?.peer_id) || !payload?.consultation_id) return;
      store().handleConsultationRemoved(
        {
          consultation_id: payload.consultation_id,
          peer_id: payload.peer_id!,
          message_ids: payload.message_ids,
        },
        accessToken,
        selfId,
        null,
      );
    },
  );

  socket.on("chat:typing", (payload: { peer_id: string }) => {
    if (!isThisPeer(payload?.peer_id) || payload.peer_id === selfId) return;
    store().setPeerTyping(payload.peer_id, true);
  });

  socket.on("chat:stopTyping", (payload: { peer_id: string }) => {
    if (!isThisPeer(payload?.peer_id) || payload.peer_id === selfId) return;
    store().setPeerTyping(payload.peer_id, false);
  });

  return socket;
}

export function disconnectConversationSocket(): void {
  if (!convSocket) return;
  convSocket.removeAllListeners();
  convSocket.disconnect();
  convSocket = null;
  convPeerId = null;
}

/** Typing runs on the conversation's own socket (falls back to no-op if closed). */
export function emitConversationTyping(recipientId: string, userId: string) {
  if (convSocket?.connected && convPeerId === recipientId) {
    convSocket.emit("chat:typing", { recipient_id: recipientId, user_id: userId });
  }
}

export function emitConversationStopTyping(recipientId: string, userId: string) {
  if (convSocket?.connected && convPeerId === recipientId) {
    convSocket.emit("chat:stopTyping", { recipient_id: recipientId, user_id: userId });
  }
}
