import { API_BASE } from "@/constants/api";
import { withAuthRequestInit } from "@/domains/auth/http";
import type { MessageEmotionType } from "@/domains/emotions";
import { mapEmotionRows } from "@/domains/emotions";
import type {
  AccessActionMeta,
  AppointmentActionMeta,
  ChatMessage,
  ChatMessageType,
  ChatUser,
  ConsultationActionMeta,
  DocumentRequestMeta,
  MedicalLinkMeta,
  SendMessageInput,
} from "./types";

export interface ChatContactRow {
  id: string;
  email: string;
  role: "doctor" | "patient" | "admin" | "clinic_admin";
  name: string;
  photo_url?: string | null;
  specialty?: string | null;
  doctor_id?: string | null;
  consultation_price?: number | null;
  video_consultation_price?: number | null;
  immediate_call_enabled?: boolean | null;
  rating_average?: number | null;
  rating_total?: number | null;
  /** ISO 3166-1 alpha-2 residence country. */
  country?: string | null;
}

export interface MessageRow {
  id: string;
  type?: ChatMessageType;
  content: string;
  creator: string;
  recipient: string;
  datetime: string;
  attachment_url?: string | null;
  attachment_meta?:
    | MedicalLinkMeta
    | DocumentRequestMeta
    | AccessActionMeta
    | AppointmentActionMeta
    | ConsultationActionMeta
    | null;
  read_at?: string | null;
  edited_at?: string | null;
  points_balance?: number;
  emotions?: Array<{ user_id: string; emotion: MessageEmotionType }>;
}

export interface ConversationRow {
  peer_id: string;
  peer: ChatContactRow;
  last_message: MessageRow;
  unread_count?: number;
}

function mapContact(row: ChatContactRow): ChatUser {
  const role =
    row.role === "doctor"
      ? "doctor"
      : row.role === "patient"
        ? "patient"
        : row.role === "admin"
          ? "support"
          : undefined;
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url,
    presence: "offline",
    role,
    specialty: row.specialty?.trim() || undefined,
    country: row.country?.trim().toUpperCase() || undefined,
    rating: row.rating_average ?? undefined,
    ratingTotal: row.rating_total ?? undefined,
    consultationPrice: row.consultation_price ?? undefined,
    videoConsultationPrice: row.video_consultation_price ?? undefined,
    immediateCallEnabled: !!row.immediate_call_enabled,
    doctorEntityId: row.doctor_id ?? undefined,
  };
}

export function mapMessageRow(
  row: MessageRow,
  peerId: string,
  selfId: string,
): ChatMessage {
  return {
    id: row.id,
    conversationId: peerId,
    senderId: row.creator === selfId ? "me" : row.creator,
    text: row.content,
    createdAt: row.datetime,
    type: row.type ?? "text",
    attachmentUrl: row.attachment_url ?? null,
    medicalLink:
      row.type === "medical_link"
        ? (row.attachment_meta as MedicalLinkMeta | undefined) ?? null
        : null,
    documentRequest:
      row.type === "document_request"
        ? (row.attachment_meta as DocumentRequestMeta | undefined) ?? null
        : null,
    accessAction:
      row.type === "access_action"
        ? (row.attachment_meta as AccessActionMeta | undefined) ?? null
        : null,
    appointmentAction:
      row.type === "appointment_action"
        ? (row.attachment_meta as AppointmentActionMeta | undefined) ?? null
        : null,
    consultationAction:
      row.type === "consultation_action"
        ? (row.attachment_meta as ConsultationActionMeta | undefined) ?? null
        : null,
    editedAt: row.edited_at ?? null,
    readAt: row.read_at ?? null,
    pointsBalance: row.points_balance,
    emotions: mapEmotionRows(row.emotions),
  };
}

async function chatFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, withAuthRequestInit(token, init));
  } catch (err) {
    const raw = err instanceof Error ? err.message : "";
    if (err instanceof TypeError || raw === "Failed to fetch") {
      throw new Error("Could not reach the server. Check your connection and try again.");
    }
    throw err instanceof Error ? err : new Error("Network request failed");
  }
}

export async function fetchChatContacts(token: string): Promise<ChatUser[]> {
  const res = await chatFetch(token, "/users/contacts");
  const data = (await res.json().catch(() => [])) as ChatContactRow[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to load contacts (${res.status})`,
    );
  }
  return data.map(mapContact);
}

export async function fetchContactById(
  token: string,
  userId: string,
): Promise<ChatUser> {
  const res = await chatFetch(token, `/users/contacts/${userId}`);
  const data = (await res.json().catch(() => ({}))) as ChatContactRow & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to load contact (${res.status})`);
  }
  return mapContact(data);
}

export async function fetchConversations(
  token: string,
  selfId: string,
): Promise<{ peerId: string; user: ChatUser; lastMessage: ChatMessage; unreadCount: number }[]> {
  const res = await chatFetch(token, "/messages/conversations");
  const data = (await res.json().catch(() => [])) as ConversationRow[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to load conversations (${res.status})`,
    );
  }
  return data.map((row) => ({
    peerId: row.peer_id,
    user: mapContact(row.peer),
    lastMessage: mapMessageRow(row.last_message, row.peer_id, selfId),
    unreadCount: row.unread_count ?? 0,
  }));
}

export async function fetchMessagesWithPeer(
  token: string,
  peerId: string,
  selfId: string,
): Promise<ChatMessage[]> {
  const res = await chatFetch(token, `/messages/with/${peerId}`);
  const data = (await res.json().catch(() => [])) as MessageRow[];
  if (!res.ok || !Array.isArray(data)) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to load messages (${res.status})`,
    );
  }
  return data.map((row) => mapMessageRow(row, peerId, selfId));
}

export async function sendChatMessage(
  token: string,
  input: SendMessageInput,
  selfId: string,
): Promise<ChatMessage> {
  const res = await chatFetch(token, "/messages", {
    method: "POST",
    body: JSON.stringify({
      recipient_id: input.recipientId,
      type: input.type ?? "text",
      content: input.content,
      attachment_url: input.attachmentUrl,
      attachment_meta:
        input.accessAction ??
        input.appointmentAction ??
        input.medicalLink ??
        input.documentRequest,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as MessageRow & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to send message (${res.status})`);
  }
  return mapMessageRow(data, input.recipientId, selfId);
}

export async function markMessagesRead(
  token: string,
  peerId: string,
): Promise<void> {
  const res = await chatFetch(token, `/messages/with/${peerId}/read`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? `Failed to mark read (${res.status})`);
  }
}

export async function markChatMessageRead(
  token: string,
  messageId: string,
  peerId: string,
  selfId: string,
): Promise<ChatMessage> {
  const res = await chatFetch(token, `/messages/${messageId}/read`, {
    method: "POST",
  });
  const data = (await res.json().catch(() => ({}))) as MessageRow & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to mark read (${res.status})`);
  }
  return mapMessageRow(data, peerId, selfId);
}

export async function markChatMessageUnread(
  token: string,
  messageId: string,
  peerId: string,
  selfId: string,
): Promise<ChatMessage> {
  const res = await chatFetch(token, `/messages/${messageId}/unread`, {
    method: "POST",
  });
  const data = (await res.json().catch(() => ({}))) as MessageRow & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to mark unread (${res.status})`);
  }
  return mapMessageRow(data, peerId, selfId);
}

export async function deleteChatMessage(
  token: string,
  messageId: string,
): Promise<void> {
  const res = await chatFetch(token, `/messages/${messageId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? `Failed to delete message (${res.status})`);
  }
}

export async function editChatMessage(
  token: string,
  messageId: string,
  content: string,
  peerId: string,
  selfId: string,
): Promise<ChatMessage> {
  const res = await chatFetch(token, `/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
  const data = (await res.json().catch(() => ({}))) as MessageRow & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to edit message (${res.status})`);
  }
  return mapMessageRow(data, peerId, selfId);
}

export async function editChatMedicalMessage(
  token: string,
  messageId: string,
  peerId: string,
  selfId: string,
  input: { content: string; medicalLink: MedicalLinkMeta },
): Promise<ChatMessage> {
  const res = await chatFetch(token, `/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      content: input.content,
      attachment_meta: input.medicalLink,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as MessageRow & { message?: string };
  if (!res.ok) {
    throw new Error(data.message ?? `Failed to update medical record (${res.status})`);
  }
  return mapMessageRow(data, peerId, selfId);
}
