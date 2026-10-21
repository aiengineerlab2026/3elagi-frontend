import type { ChatMessage } from "@/domains/chat/types";

export function chatMessagePreview(message: Pick<ChatMessage, "text" | "type">): string {
  const text = message.text?.trim();
  if (text) return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  if (message.type === "image") return "Photo";
  if (message.type === "video") return "Video";
  if (message.type === "voice") return "Voice message";
  if (message.type === "medical_link") return "Medical record";
  return "New message";
}

export function chatNotificationTitle(senderName: string): string {
  return `${senderName} sends a new message`;
}
