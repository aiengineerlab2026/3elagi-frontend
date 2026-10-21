import { API_BASE } from "@/constants/api";
import {
  isAuthHttpStatus,
  logoutOnAuthFailure,
} from "@/domains/auth/sessionFailure";
import type {
  AiChatResponse,
  AiConversation,
  AiStreamEvent,
} from "./types";

const CHAT_TIMEOUT_MS = 90_000;

async function parseError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return `Request failed (${res.status})`;
  try {
    const data = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };
    if (Array.isArray(data.message)) return data.message.join(", ");
    return data.message ?? data.error ?? text;
  } catch {
    return text;
  }
}

async function authFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAiHistory(token: string): Promise<AiConversation[]> {
  const res = await authFetch("/ai/history", token);
  if (!res.ok) {
    if (isAuthHttpStatus(res.status)) {
      logoutOnAuthFailure();
    }
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AiConversation[];
}

export async function deleteAiConversation(
  token: string,
  conversationId: string,
): Promise<void> {
  const res = await authFetch(`/ai/history/${conversationId}`, token, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
}

export async function sendAiChat(
  token: string,
  input: {
    message: string;
    conversationId?: string;
    patientUserId?: string;
  },
): Promise<AiChatResponse> {
  const res = await authFetch("/ai/chat", token, {
    method: "POST",
    body: JSON.stringify({ ...input, stream: false }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AiChatResponse;
}

/** JSON chat — avoids SSE hanging in browsers. */
export async function chatWithAi(
  token: string,
  input: {
    message: string;
    conversationId?: string;
    patientUserId?: string;
  },
  onEvent: (event: AiStreamEvent) => void,
): Promise<void> {
  const data = await sendAiChat(token, input);
  if (data.content) {
    onEvent({ type: "token", content: data.content });
  }
  onEvent({
    type: "done",
    conversationId: data.conversationId,
    messageId: data.messageId,
  });
}
