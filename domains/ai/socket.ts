import type { Socket } from "socket.io-client";
import type { AiConversation, AiStreamEvent } from "./types";
import { createSocket } from "@/domains/realtime/createSocket";

// AI chat runs on its own dedicated socket, separate from the presence/main
// socket that carries online users and normal-chat traffic.
let aiSocket: Socket | null = null;

export function connectAiSocket(accessToken?: string): Socket {
  if (aiSocket?.connected) return aiSocket;
  if (aiSocket) {
    aiSocket.removeAllListeners();
    aiSocket.disconnect();
  }
  aiSocket = createSocket(accessToken);
  return aiSocket;
}

export function disconnectAiSocket(): void {
  if (!aiSocket) return;
  aiSocket.removeAllListeners();
  aiSocket.disconnect();
  aiSocket = null;
}

export function getAiSocket(): Socket | null {
  return aiSocket;
}

export function requestAiHistory(): Promise<AiConversation[]> {
  const socket = aiSocket;
  if (!socket?.connected) {
    return Promise.reject(new Error("Not connected to server"));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("History request timed out"));
    }, 30_000);

    const onHistory = (payload: { conversations?: AiConversation[] }) => {
      cleanup();
      resolve(payload.conversations ?? []);
    };
    const onError = (payload: { error?: string }) => {
      cleanup();
      reject(new Error(payload.error ?? "Could not load history"));
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("ai:chat:history", onHistory);
      socket.off("ai:message:error", onError);
    };

    socket.on("ai:chat:history", onHistory);
    socket.on("ai:message:error", onError);
    socket.emit("ai:chat:history");
  });
}

export function sendAiMessageViaSocket(
  input: {
    message: string;
    chatId?: string;
    patientUserId?: string;
    attachment?: { data: string; mimeType: string };
    attachmentUrl?: string;
    fileName?: string;
  },
  onEvent: (event: AiStreamEvent) => void,
): Promise<void> {
  const socket = aiSocket;
  if (!socket?.connected) {
    return Promise.reject(new Error("Not connected to server"));
  }

  const hasAttachment = !!(input.attachment?.data || input.attachmentUrl);
  const timeoutMs = hasAttachment ? 120_000 : 60_000;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      const err = "AI request timed out";
      onEvent({ type: "error", error: err });
      reject(new Error(err));
    }, timeoutMs);

    const onAck = (payload: {
      conversationId?: string;
      userMessageId?: string;
    }) => {
      if (payload.conversationId) {
        onEvent({ type: "ack", conversationId: payload.conversationId });
      }
    };

    const onToken = (payload: { content?: string; chatId?: string }) => {
      onEvent({ type: "token", content: payload.content });
      if (payload.chatId) {
        onEvent({ type: "ack", conversationId: payload.chatId });
      }
    };

    const onDone = (payload: {
      chatId?: string;
      messageId?: string;
      cacheHit?: boolean;
      content?: string;
    }) => {
      cleanup();
      onEvent({
        type: "done",
        conversationId: payload.chatId,
        messageId: payload.messageId,
        cacheHit: payload.cacheHit,
        content: payload.content,
      });
      resolve();
    };

    const onError = (payload: { error?: string; code?: string }) => {
      cleanup();
      const err = payload.error ?? "AI request failed";
      onEvent({ type: "error", error: err, code: payload.code });
      const rejection = new Error(err) as Error & { code?: string };
      rejection.code = payload.code;
      reject(rejection);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("ai:message:ack", onAck);
      socket.off("ai:message:token", onToken);
      socket.off("ai:message:done", onDone);
      socket.off("ai:message:error", onError);
    };

    socket.on("ai:message:ack", onAck);
    socket.on("ai:message:token", onToken);
    socket.on("ai:message:done", onDone);
    socket.on("ai:message:error", onError);

    socket.emit("ai:message:send", {
      message: input.message,
      chatId: input.chatId,
      patientUserId: input.patientUserId,
      attachment: input.attachment,
      attachmentUrl: input.attachmentUrl,
      fileName: input.fileName,
    });
  });
}

export function joinAiChat(chatId: string): void {
  aiSocket?.emit("ai:chat:join", { chatId });
}
