export type AiMessageRole = "user" | "assistant";

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
  pending?: boolean;
  error?: boolean;
  /** Local preview URI while uploading (user messages). */
  imageUri?: string;
  /** Remote image URL after upload (user messages). */
  imageUrl?: string;
  /** Non-image attachment (e.g. PDF) filename, shown as a chip. */
  fileName?: string;
  /** Remote attachment URL when reloaded from server history. */
  attachmentUrl?: string;
  attachmentMimeType?: string;
  emotions?: import("@/domains/emotions/types").MessageEmotionItem[];
}

export interface AiConversation {
  id: string;
  title: string;
  patientContextId?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
}

export interface AiChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  cacheHit: boolean;
}

export type AiStreamEvent =
  | { type: "ack"; conversationId?: string }
  | { type: "token"; content?: string }
  | {
      type: "done";
      conversationId?: string;
      messageId?: string;
      cacheHit?: boolean;
      content?: string;
    }
  | { type: "error"; error?: string; code?: string };
