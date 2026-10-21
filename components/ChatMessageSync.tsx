import { useEffect } from "react";
import { mapEmotionRows } from "@/domains/emotions/types";
import { useAuthStore } from "@/domains/auth/store";
import { canUseChat } from "@/domains/chat/access";
import { useChatStore } from "@/domains/chat/store";
import {
  getPresenceSocket,
  onChatMessageDeleted,
  onChatMessageNew,
  onChatMessageUpdated,
  onConsultationRemoved,
  onChatMessagesRead,
  onChatStopTyping,
  onChatTyping,
  onMessageEmotionUpdated,
} from "@/domains/presence/socket";

export function ChatMessageSync() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const selfId = useAuthStore((s) => s.profile?.id ?? null);
  const activeChatPeerId = useChatStore((s) => s.activeChatPeerId);
  const handleIncomingMessage = useChatStore((s) => s.handleIncomingMessage);
  const handleIncomingMessageDelete = useChatStore((s) => s.handleIncomingMessageDelete);
  const handleConsultationRemoved = useChatStore((s) => s.handleConsultationRemoved);
  const handleIncomingMessageUpdate = useChatStore((s) => s.handleIncomingMessageUpdate);
  const updateMessageEmotions = useChatStore((s) => s.updateMessageEmotions);
  const setPeerTyping = useChatStore((s) => s.setPeerTyping);
  const markThreadReadByPeer = useChatStore((s) => s.markThreadReadByPeer);

  useEffect(() => {
    if (!accessToken || !selfId || !canUseChat(role)) return;

    const attachMessageHandlers = () => {
      onChatMessageNew((payload) => {
        handleIncomingMessage(payload, accessToken, selfId);
      });
      onChatMessageDeleted((payload) => {
        handleIncomingMessageDelete(payload, accessToken, selfId);
      });
      onConsultationRemoved((payload) => {
        handleConsultationRemoved(payload, accessToken, selfId, role);
      });
      onChatMessageUpdated((payload) => {
        handleIncomingMessageUpdate(payload, accessToken, selfId);
      });
    };

    attachMessageHandlers();

    const socket = getPresenceSocket();
    const onConnect = () => attachMessageHandlers();
    socket?.on("connect", onConnect);

    return () => {
      socket?.off("connect", onConnect);
    };
  }, [accessToken, selfId, role, handleIncomingMessage, handleIncomingMessageDelete, handleConsultationRemoved, handleIncomingMessageUpdate]);

  // Peer opened our thread — flip our sent messages to read straight away.
  useEffect(() => {
    onChatMessagesRead((payload) => {
      markThreadReadByPeer(payload.peer_id, payload.read_at);
    });
    return () => onChatMessagesRead(null);
  }, [markThreadReadByPeer]);

  useEffect(() => {
    onMessageEmotionUpdated((payload) => {
      if (payload.message_source !== "chat") return;
      updateMessageEmotions(
        payload.message_id,
        mapEmotionRows(payload.emotions),
      );
    });
    return () => onMessageEmotionUpdated(null);
  }, [updateMessageEmotions]);

  useEffect(() => {
    onChatTyping((payload) => {
      if (payload.peer_id === selfId) return;
      if (activeChatPeerId && payload.peer_id !== activeChatPeerId) return;
      setPeerTyping(payload.peer_id, true);
    });
    onChatStopTyping((payload) => {
      if (payload.peer_id === selfId) return;
      setPeerTyping(payload.peer_id, false);
    });
    return () => {
      onChatTyping(null);
      onChatStopTyping(null);
    };
  }, [selfId, activeChatPeerId, setPeerTyping]);

  return null;
}
