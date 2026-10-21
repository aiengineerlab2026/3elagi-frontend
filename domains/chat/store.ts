import { create } from "zustand";
import {
  deleteChatMessage,
  editChatMedicalMessage,
  editChatMessage,
  fetchChatContacts,
  fetchConversations,
  fetchContactById,
  fetchMessagesWithPeer,
  mapMessageRow,
  markMessagesRead,
  sendChatMessage,
  type MessageRow,
} from "./api";
import {
  dropOrphanedAppointmentMessages,
  withoutAppointmentMessages,
} from "./appointmentMessages";
import { canUseChat } from "./access";
import { applyLivePresence } from "./presence";
import { applyPresenceToConversations } from "./presenceConversations";
import { emit, on } from "@/utils/eventBus";
import { CHAT_EVENTS, type ChatMessageReceivedPayload } from "./events";
import { chatMessagePreview, chatNotificationTitle } from "@/utils/chatNotifications";
import { AUTH_EVENTS } from "@/domains/auth/events";
import { dismissChatNotifications } from "@/domains/push/dismiss";
import { chatRepository } from "./repository";
import type { MessageEmotionItem } from "@/domains/emotions";
import type {
  ChatMessage,
  ChatUser,
  Conversation,
  MedicalLinkMeta,
  SendMessageInput,
} from "./types";

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  loading: boolean;
  messagesLoading: Record<string, boolean>;
  error: string | null;
  activeChatPeerId: string | null;
  selfId: string | null;
  peerTyping: Record<string, boolean>;
  peerCacheTick: number;
  loadConversations: (
    token: string | null,
    selfId: string | null,
    selfRole: string | null,
  ) => Promise<void>;
  syncPresence: () => void;
  ensureContacts: (token: string, selfRole?: string | null) => Promise<void>;
  ensurePeer: (peerId: string, token: string) => Promise<ChatUser | undefined>;
  resolvePeer: (peerId: string) => ChatUser | undefined;
  loadMessages: (
    peerId: string,
    token: string | null,
    selfId: string | null,
  ) => Promise<void>;
  removeAppointmentMessages: (peerId: string, appointmentId: string) => void;
  sendMessage: (
    peerId: string,
    input: SendMessageInput | string,
    token: string | null,
    selfId: string | null,
    selfRole: string | null,
    replaceTempId?: string,
  ) => Promise<void>;
  markRead: (peerId: string, token: string | null) => Promise<void>;
  handleIncomingMessage: (
    payload: {
      message: MessageRow;
      peer_id: string;
      peer_name?: string;
      peer_photo_url?: string | null;
      peer_role?: string | null;
    },
    token: string | null,
    selfId: string | null,
  ) => void;
  handleIncomingMessageDelete: (
    payload: { message_id: string; peer_id: string },
    token: string | null,
    selfId: string | null,
  ) => void;
  handleConsultationRemoved: (
    payload: {
      consultation_id: string;
      peer_id: string;
      message_ids?: string[];
    },
    token: string | null,
    selfId: string | null,
    selfRole: string | null,
  ) => void;
  removeMessage: (peerId: string, messageId: string) => void;
  deleteMessage: (
    peerId: string,
    messageId: string,
    token: string | null,
    selfId: string | null,
    selfRole: string | null,
  ) => Promise<void>;
  editMessage: (
    peerId: string,
    messageId: string,
    content: string,
    token: string | null,
    selfId: string | null,
    selfRole: string | null,
  ) => Promise<void>;
  editMedicalMessage: (
    peerId: string,
    messageId: string,
    medicalLink: MedicalLinkMeta,
    note: string | undefined,
    recordTitle: string,
    token: string | null,
    selfId: string | null,
    selfRole: string | null,
  ) => Promise<void>;
  handleIncomingMessageUpdate: (
    payload: { message: MessageRow; peer_id: string },
    token: string | null,
    selfId: string | null,
  ) => void;
  setActiveChatPeerId: (peerId: string | null) => void;
  setSelfId: (id: string | null) => void;
  setPeerTyping: (peerId: string, typing: boolean) => void;
  addPendingMessage: (peerId: string, message: ChatMessage) => void;
  resolvePendingMessage: (peerId: string, tempId: string, message: ChatMessage) => void;
  failPendingMessage: (peerId: string, tempId: string) => void;
  getPeer: (conversationId: string) => ChatUser | undefined;
  updateMessageEmotions: (messageId: string, emotions: MessageEmotionItem[]) => void;
  patchMessage: (messageId: string, patch: Partial<ChatMessage>) => void;
  /** Peer read the thread: stamp every message we sent them as read. */
  markThreadReadByPeer: (peerId: string, readAt: string) => void;
  clear: () => void;
}

let baseConversations: Conversation[] = [];

function dedupeMessagesById(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of messages) byId.set(message.id, message);
  return Array.from(byId.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

function isSameOutboundDraft(pending: ChatMessage, confirmed: ChatMessage): boolean {
  if (pending.senderId !== "me" || confirmed.senderId !== "me") return false;
  if (pending.type !== confirmed.type) return false;
  if (confirmed.type === "text") {
    return pending.text.trim() === confirmed.text.trim();
  }
  if (confirmed.type === "medical_link") {
    return pending.medicalLink?.record_id === confirmed.medicalLink?.record_id;
  }
  return !!pending.localAttachmentUrl || pending.text.trim() === confirmed.text.trim();
}

function applyConfirmedOutboundMessage(
  thread: ChatMessage[],
  confirmed: ChatMessage,
  replaceTempId?: string,
): ChatMessage[] {
  let next = [...thread];

  if (replaceTempId) {
    const tempIdx = next.findIndex((m) => m.id === replaceTempId);
    if (tempIdx >= 0) next[tempIdx] = confirmed;
  }

  if (!next.some((m) => m.id === confirmed.id)) {
    const pendingIdx = next.findIndex(
      (m) => m.pending && m.senderId === "me" && isSameOutboundDraft(m, confirmed),
    );
    if (pendingIdx >= 0) {
      next[pendingIdx] = confirmed;
    } else {
      next.push(confirmed);
    }
  }

  next = next.filter(
    (m) =>
      m.id === confirmed.id ||
      !(m.pending && m.senderId === "me" && isSameOutboundDraft(m, confirmed)),
  );

  return dedupeMessagesById(next);
}

function mergeMessagesById(
  live: ChatMessage[],
  fetched: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of fetched) byId.set(message.id, message);
  for (const message of live) {
    if (byId.has(message.id)) continue;
    if (message.pending && message.senderId === "me") {
      const confirmed = fetched.find(
        (row) => row.senderId === "me" && isSameOutboundDraft(message, row),
      );
      if (confirmed) continue;
    }
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

function mapPeerRole(role?: string | null): ChatUser["role"] {
  if (role === "doctor") return "doctor";
  if (role === "patient") return "patient";
  if (role === "admin" || role === "support") return "support";
  return undefined;
}

function peerFromHint(
  peerId: string,
  name?: string,
  photoUrl?: string | null,
  role?: string | null,
): ChatUser {
  const trimmed = name?.trim();
  return {
    id: peerId,
    name: trimmed || "…",
    photoUrl: photoUrl ?? undefined,
    presence: "offline",
    role: mapPeerRole(role),
  };
}

function mergePeerHint(
  peer: ChatUser | undefined,
  peerId: string,
  name?: string,
  photoUrl?: string | null,
  role?: string | null,
): ChatUser {
  const hinted = peerFromHint(peerId, name, photoUrl, role);
  if (!peer) return hinted;
  return {
    ...peer,
    name: hinted.name !== "…" ? hinted.name : peer.name,
    photoUrl: hinted.photoUrl ?? peer.photoUrl,
    role: hinted.role ?? peer.role,
  };
}

function upsertConversation(
  peerId: string,
  user: ChatUser | undefined,
  lastMessage: ChatMessage,
  incrementUnread: boolean,
  nameHint?: string,
  photoHint?: string | null,
  roleHint?: string | null,
) {
  const resolvedUser = mergePeerHint(user, peerId, nameHint, photoHint, roleHint);
  const idx = baseConversations.findIndex((c) => c.id === peerId);
  if (idx >= 0) {
    const existing = baseConversations[idx];
    baseConversations[idx] = {
      ...existing,
      user: user
        ? {
            ...existing.user,
            ...user,
            name: user.name || existing.user.name,
            photoUrl: user.photoUrl ?? existing.user.photoUrl,
          }
        : mergePeerHint(
            existing.user,
            peerId,
            nameHint,
            photoHint,
            roleHint,
          ),
      lastMessage,
      unreadCount: incrementUnread ? existing.unreadCount + 1 : existing.unreadCount,
    };
  } else {
    baseConversations.unshift({
      id: peerId,
      user: resolvedUser,
      lastMessage,
      unreadCount: incrementUnread ? 1 : 0,
    });
  }
  chatRepository.cacheUsers([baseConversations.find((c) => c.id === peerId)!.user]);
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  loading: false,
  messagesLoading: {},
  error: null,
  activeChatPeerId: null,
  selfId: null,
  peerTyping: {},
  peerCacheTick: 0,

  setActiveChatPeerId: (peerId) => set({ activeChatPeerId: peerId }),
  setSelfId: (id) => set({ selfId: id }),

  setPeerTyping: (peerId, typing) =>
    set((s) => ({
      peerTyping: typing
        ? { ...s.peerTyping, [peerId]: true }
        : Object.fromEntries(
            Object.entries(s.peerTyping).filter(([id]) => id !== peerId),
          ),
    })),

  addPendingMessage: (peerId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: [...(s.messages[peerId] || []), message],
      },
    })),

  resolvePendingMessage: (peerId, tempId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: applyConfirmedOutboundMessage(
          s.messages[peerId] || [],
          message,
          tempId,
        ),
      },
    })),

  failPendingMessage: (peerId, tempId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] || []).map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m,
        ),
      },
    })),

  loadConversations: async (token, selfId, selfRole) => {
    if (!token || !selfId) {
      baseConversations = [];
      chatRepository.clearUsers();
      set({
        conversations: [],
        messages: {},
        messagesLoading: {},
        loading: false,
        error: null,
        selfId: null,
      });
      return;
    }

    if (!canUseChat(selfRole)) {
      if (selfRole) {
        baseConversations = [];
        chatRepository.clearUsers();
        set({
          conversations: [],
          messages: {},
          messagesLoading: {},
          loading: false,
          error: null,
          selfId: null,
        });
      }
      return;
    }

    const switchedUser = get().selfId !== null && get().selfId !== selfId;
    set({
      loading: true,
      error: null,
      selfId,
      ...(switchedUser ? { messages: {}, messagesLoading: {} } : {}),
    });

    try {
      const rows = await fetchConversations(token, selfId);
      baseConversations = rows.map((row) => ({
        id: row.peerId,
        user: row.user,
        lastMessage: row.lastMessage,
        unreadCount: row.unreadCount,
      }));
      chatRepository.cacheUsers(baseConversations.map((c) => c.user));

      const allowedPeerIds = new Set(baseConversations.map((c) => c.id));
      const activePeer = get().activeChatPeerId;
      if (activePeer) allowedPeerIds.add(activePeer);

      set((s) => ({
        conversations: applyPresenceToConversations(baseConversations),
        messages: Object.fromEntries(
          Object.entries(s.messages).filter(([peerId]) => allowedPeerIds.has(peerId)),
        ),
        loading: false,
        error: null,
      }));
    } catch (e) {
      baseConversations = [];
      chatRepository.clearUsers();
      set({
        conversations: [],
        messages: {},
        messagesLoading: {},
        loading: false,
        error: (e as Error).message,
      });
    }
  },

  syncPresence: () => {
    set({ conversations: applyPresenceToConversations(baseConversations) });
    const cached = chatRepository.getAllUsers();
    if (cached.length > 0) {
      chatRepository.cacheUsers(
        cached.map((user) => applyLivePresence(user)),
      );
    }
  },

  ensureContacts: async (token, selfRole) => {
    // Admin picks peers from /admin/chats; the contacts endpoint is doctor/patient only.
    if (selfRole?.toLowerCase() === "admin") return;
    const users = await fetchChatContacts(token);
    chatRepository.cacheUsers(users);
  },

  ensurePeer: async (peerId, token) => {
    const existing = get().resolvePeer(peerId);
    if (existing?.name?.trim() && existing.name !== "…") {
      return existing;
    }
    try {
      const user = await fetchContactById(token, peerId);
      chatRepository.cacheUsers([user]);
      const merged = existing ? { ...existing, ...user } : user;
      const idx = baseConversations.findIndex((c) => c.id === peerId);
      if (idx >= 0) {
        baseConversations[idx] = {
          ...baseConversations[idx],
          user: { ...baseConversations[idx].user, ...merged },
        };
        set({
          conversations: applyPresenceToConversations(baseConversations),
          peerCacheTick: get().peerCacheTick + 1,
        });
      } else {
        set({ peerCacheTick: get().peerCacheTick + 1 });
      }
      return merged;
    } catch {
      return existing;
    }
  },

  resolvePeer: (peerId) => {
    const fromConversation = get().conversations.find((c) => c.id === peerId)?.user;
    const cached = chatRepository.getUser(peerId);
    const base = fromConversation ?? cached;
    if (!base) return undefined;

    const merged: ChatUser = {
      ...base,
      name: cached?.name?.trim() ? cached.name : base.name,
      photoUrl: cached?.photoUrl ?? base.photoUrl,
      role: cached?.role ?? base.role,
      specialty: cached?.specialty ?? base.specialty,
      doctorEntityId: cached?.doctorEntityId ?? base.doctorEntityId,
    };

    return { ...merged, ...applyLivePresence(merged) };
  },

  loadMessages: async (peerId, token, selfId) => {
    if (!token || !selfId) {
      set((s) => ({ messages: { ...s.messages, [peerId]: [] } }));
      return;
    }

    set((s) => ({
      messagesLoading: { ...s.messagesLoading, [peerId]: true },
    }));

    try {
      const msgs = await fetchMessagesWithPeer(token, peerId, selfId);
      set((s) => {
        const live = s.messages[peerId] ?? [];
        const cleanedLive = dropOrphanedAppointmentMessages(live, msgs);
        return {
          messages: {
            ...s.messages,
            [peerId]: mergeMessagesById(cleanedLive, msgs),
          },
          messagesLoading: { ...s.messagesLoading, [peerId]: false },
        };
      });
    } catch {
      set((s) => ({
        messages: { ...s.messages, [peerId]: [] },
        messagesLoading: { ...s.messagesLoading, [peerId]: false },
      }));
    }
  },

  removeAppointmentMessages: (peerId, appointmentId) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: withoutAppointmentMessages(
          s.messages[peerId] ?? [],
          appointmentId,
        ),
      },
    }));
  },

  sendMessage: async (peerId, input, token, selfId, selfRole, replaceTempId) => {
    if (!token || !selfId) return;

    const payload: SendMessageInput =
      typeof input === "string"
        ? { recipientId: peerId, content: input.trim(), type: "text" }
        : { ...input, recipientId: peerId };

    if (payload.type === "text" && !payload.content?.trim()) return;

    const msg = await sendChatMessage(token, payload, selfId);
    if (payload.type !== "access_action" && payload.type !== "appointment_action") {
      emit(CHAT_EVENTS.MESSAGE_SENT, { token });
    }
    const peer = get().resolvePeer(peerId);
    upsertConversation(peerId, peer, msg, false);

    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: applyConfirmedOutboundMessage(
          s.messages[peerId] || [],
          msg,
          replaceTempId,
        ),
      },
      conversations: applyPresenceToConversations(baseConversations),
      peerTyping: Object.fromEntries(
        Object.entries(s.peerTyping).filter(([id]) => id !== peerId),
      ),
    }));

    void get().loadConversations(token, selfId, selfRole);
  },

  markRead: async (peerId, token) => {
    if (token) {
      try {
        await markMessagesRead(token, peerId);
      } catch {
        // ignore
      }
    }
    // Handled: the user is looking at the thread, so drop its tray entries.
    void dismissChatNotifications(peerId);
    const idx = baseConversations.findIndex((c) => c.id === peerId);
    if (idx >= 0) {
      baseConversations[idx] = { ...baseConversations[idx], unreadCount: 0 };
    }
    const now = new Date().toISOString();
    set((s) => ({
      conversations: applyPresenceToConversations(baseConversations),
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] || []).map((m) =>
          m.senderId !== "me" && !m.readAt ? { ...m, readAt: now } : m,
        ),
      },
    }));
  },

  removeMessage: (peerId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] || []).filter((m) => m.id !== messageId),
      },
    })),

  deleteMessage: async (peerId, messageId, token, selfId, selfRole) => {
    if (!token || !selfId) return;

    const isLocalOnly = messageId.startsWith("pending-");
    if (isLocalOnly) {
      get().removeMessage(peerId, messageId);
      return;
    }

    const previous = get().messages[peerId] || [];
    get().removeMessage(peerId, messageId);

    try {
      await deleteChatMessage(token, messageId);
      await get().loadConversations(token, selfId, selfRole);
    } catch {
      set((s) => ({
        messages: {
          ...s.messages,
          [peerId]: previous,
        },
      }));
      throw new Error("Failed to delete message");
    }
  },

  handleIncomingMessageDelete: (payload, token, selfId) => {
    if (!selfId) return;
    const peerId = payload.peer_id;
    get().removeMessage(peerId, payload.message_id);
    if (token) {
      void get().loadConversations(token, selfId, null);
    }
  },

  handleConsultationRemoved: (payload, token, selfId, selfRole) => {
    if (!selfId) return;
    const peerId = payload.peer_id;
    const consultationId = payload.consultation_id;
    const idSet = new Set(payload.message_ids ?? []);
    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] || []).filter((m) => {
          if (idSet.size > 0 && idSet.has(m.id)) return false;
          if (m.consultationAction?.consultation_id === consultationId) {
            return false;
          }
          return true;
        }),
      },
    }));
    if (token) {
      void get().loadConversations(token, selfId, selfRole);
    }
  },

  editMedicalMessage: async (
    peerId,
    messageId,
    medicalLink,
    note,
    recordTitle,
    token,
    selfId,
    selfRole,
  ) => {
    if (!token || !selfId) return;

    const trimmedNote = note?.trim();
    const content = trimmedNote || recordTitle;
    const previous = get().messages[peerId] || [];

    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] || []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                text: content,
                medicalLink,
                editedAt: new Date().toISOString(),
              }
            : m,
        ),
      },
    }));

    try {
      const saved = await editChatMedicalMessage(token, messageId, peerId, selfId, {
        content,
        medicalLink,
      });
      set((s) => ({
        messages: {
          ...s.messages,
          [peerId]: (s.messages[peerId] || []).map((m) =>
            m.id === messageId ? saved : m,
          ),
        },
      }));
      const peer = get().resolvePeer(peerId);
      upsertConversation(peerId, peer, saved, false);
      set({ conversations: applyPresenceToConversations(baseConversations) });
      await get().loadConversations(token, selfId, selfRole);
    } catch {
      set((s) => ({
        messages: { ...s.messages, [peerId]: previous },
      }));
      throw new Error("Failed to update medical record");
    }
  },

  editMessage: async (peerId, messageId, content, token, selfId, selfRole) => {
    if (!token || !selfId) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const previous = get().messages[peerId] || [];
    const updated = previous.map((m) =>
      m.id === messageId ? { ...m, text: trimmed, editedAt: new Date().toISOString() } : m,
    );

    set((s) => ({
      messages: { ...s.messages, [peerId]: updated },
    }));

    try {
      const saved = await editChatMessage(token, messageId, trimmed, peerId, selfId);
      set((s) => ({
        messages: {
          ...s.messages,
          [peerId]: (s.messages[peerId] || []).map((m) =>
            m.id === messageId ? saved : m,
          ),
        },
      }));
      const peer = get().resolvePeer(peerId);
      upsertConversation(peerId, peer, saved, false);
      set({ conversations: applyPresenceToConversations(baseConversations) });
      await get().loadConversations(token, selfId, selfRole);
    } catch {
      set((s) => ({
        messages: { ...s.messages, [peerId]: previous },
      }));
      throw new Error("Failed to edit message");
    }
  },

  handleIncomingMessageUpdate: (payload, token, selfId) => {
    if (!selfId) return;
    const peerId = payload.peer_id;
    const msg = mapMessageRow(payload.message, peerId, selfId);

    set((s) => ({
      messages: {
        ...s.messages,
        [peerId]: (s.messages[peerId] || []).map((m) =>
          m.id === msg.id ? msg : m,
        ),
      },
    }));

    const peer = get().resolvePeer(peerId);
    upsertConversation(peerId, peer, msg, false);
    set({ conversations: applyPresenceToConversations(baseConversations) });
  },

  handleIncomingMessage: (payload, token, selfId) => {
    if (!selfId) return;
    const peerId = payload.peer_id;
    const peerNameHint =
      typeof payload.peer_name === "string" ? payload.peer_name : undefined;
    const peerPhotoHint = payload.peer_photo_url ?? undefined;
    const peerRoleHint = payload.peer_role ?? undefined;
    const msg = mapMessageRow(payload.message, peerId, selfId);
    const isOwnMessage = msg.senderId === "me";

    const active = get().activeChatPeerId;
    const isViewing = active === peerId;
    let peer = get().resolvePeer(peerId) ?? chatRepository.getUser(peerId);

    if (!peer && (peerNameHint || peerPhotoHint || peerRoleHint)) {
      peer = peerFromHint(peerId, peerNameHint, peerPhotoHint, peerRoleHint);
      chatRepository.cacheUsers([peer]);
      set({ peerCacheTick: get().peerCacheTick + 1 });
    } else if (peer && (peerNameHint || peerPhotoHint || peerRoleHint)) {
      peer = mergePeerHint(peer, peerId, peerNameHint, peerPhotoHint, peerRoleHint);
      chatRepository.cacheUsers([peer]);
      set({ peerCacheTick: get().peerCacheTick + 1 });
    }

    const appendMessage = () => {
      set((s) => {
        const thread = s.messages[peerId] || [];
        if (thread.some((m) => m.id === msg.id)) return s;
        return {
          messages: {
            ...s.messages,
            [peerId]: [...thread, msg],
          },
          peerTyping: isViewing
            ? Object.fromEntries(
                Object.entries(s.peerTyping).filter(([id]) => id !== peerId),
              )
            : s.peerTyping,
        };
      });
    };

    if (isOwnMessage) {
      set((s) => ({
        messages: {
          ...s.messages,
          [peerId]: applyConfirmedOutboundMessage(s.messages[peerId] || [], msg),
        },
      }));
      upsertConversation(
        peerId,
        peer,
        msg,
        false,
        peerNameHint,
        peerPhotoHint,
        peerRoleHint,
      );
      set({ conversations: applyPresenceToConversations(baseConversations) });
      return;
    }

    if (msg.type === "document_request" && msg.documentRequest) {
      emit(CHAT_EVENTS.DOCUMENT_REQUEST_RECEIVED, {
        peerId,
        requestId: msg.documentRequest.request_id,
        requestType: msg.documentRequest.request_type,
        title: msg.documentRequest.title,
        doctorName: peer?.name ?? peerNameHint ?? "",
      });
    }

    if (isViewing) {
      appendMessage();
      if (token) void get().markRead(peerId, token);
      if (peer) {
        upsertConversation(peerId, peer, msg, false, peerNameHint, peerPhotoHint, peerRoleHint);
        set({ conversations: applyPresenceToConversations(baseConversations) });
      }
    } else {
      appendMessage();
      upsertConversation(
        peerId,
        peer,
        msg,
        true,
        peerNameHint,
        peerPhotoHint,
        peerRoleHint,
      );
      set({ conversations: applyPresenceToConversations(baseConversations) });

      if ((!peer || peer.name === "…" || !peer.photoUrl) && token) {
        void get()
          .ensurePeer(peerId, token)
          .then((resolved) => {
            if (!resolved) return;
            upsertConversation(peerId, resolved, msg, false);
            set({ conversations: applyPresenceToConversations(baseConversations) });
          })
          .catch(() => undefined);
      }

      const senderName = peer?.name ?? peerNameHint ?? "…";
      const notice: ChatMessageReceivedPayload = {
        peerId,
        senderName,
        preview: chatMessagePreview(msg),
        messageId: msg.id,
      };
      emit(CHAT_EVENTS.MESSAGE_RECEIVED, notice);
    }
  },

  getPeer: (conversationId) => get().resolvePeer(conversationId),

  updateMessageEmotions: (messageId, emotions) => {
    set((state) => {
      const nextMessages: Record<string, ChatMessage[]> = {};
      for (const [peerId, rows] of Object.entries(state.messages)) {
        nextMessages[peerId] = rows.map((message) =>
          message.id === messageId ? { ...message, emotions } : message,
        );
      }
      return { messages: nextMessages };
    });
  },

  patchMessage: (messageId, patch) => {
    set((state) => {
      const nextMessages: Record<string, ChatMessage[]> = {};
      let peerForUnread: string | null = null;
      let unreadDelta = 0;
      for (const [peerId, rows] of Object.entries(state.messages)) {
        nextMessages[peerId] = rows.map((message) => {
          if (message.id !== messageId) return message;
          const next = { ...message, ...patch };
          if (
            message.senderId !== "me" &&
            "readAt" in patch &&
            Boolean(message.readAt) !== Boolean(next.readAt)
          ) {
            peerForUnread = peerId;
            unreadDelta = next.readAt ? -1 : 1;
          }
          return next;
        });
      }
      const conversations =
        peerForUnread && unreadDelta !== 0
          ? state.conversations.map((c) =>
              c.id === peerForUnread
                ? {
                    ...c,
                    unreadCount: Math.max(0, (c.unreadCount ?? 0) + unreadDelta),
                  }
                : c,
            )
          : state.conversations;
      return { messages: nextMessages, conversations };
    });
  },

  markThreadReadByPeer: (peerId, readAt) =>
    set((s) => {
      const thread = s.messages[peerId];
      if (!thread?.length) return s;
      let changed = false;
      const next = thread.map((m) => {
        if (m.senderId !== "me" || m.readAt) return m;
        changed = true;
        return { ...m, readAt };
      });
      return changed ? { messages: { ...s.messages, [peerId]: next } } : s;
    }),

  clear: () => {
    baseConversations = [];
    chatRepository.clearUsers();
    set({
      conversations: [],
      messages: {},
      messagesLoading: {},
      loading: false,
      error: null,
      activeChatPeerId: null,
      selfId: null,
      peerTyping: {},
    });
  },
}));

// Cross-domain subscription: clear on logout
on(AUTH_EVENTS.LOGOUT, () => {
  useChatStore.getState().clear();
});
