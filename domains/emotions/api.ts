import { API_BASE } from "@/constants/api";
import type {
  MessageEmotionSource,
  MessageEmotionType,
  MessageEmotionsPayload,
} from "./types";

async function authJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message ?? `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export async function setMessageEmotion(
  token: string,
  messageId: string,
  source: MessageEmotionSource,
  emotion: MessageEmotionType,
): Promise<MessageEmotionsPayload> {
  return authJson<MessageEmotionsPayload>("/message-emotions", token, {
    method: "POST",
    body: JSON.stringify({
      message_id: messageId,
      message_source: source,
      emotion,
    }),
  });
}

export async function removeMessageEmotion(
  token: string,
  messageId: string,
  source: MessageEmotionSource,
): Promise<MessageEmotionsPayload> {
  return authJson<MessageEmotionsPayload>("/message-emotions", token, {
    method: "DELETE",
    body: JSON.stringify({
      message_id: messageId,
      message_source: source,
    }),
  });
}
