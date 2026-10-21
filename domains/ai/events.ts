export const AI_EVENTS = {
  MESSAGE_SENT: "ai:message_sent",
} as const;

export interface AiMessageSentPayload {
  token: string;
}
