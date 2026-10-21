import type { AiMessage } from "@/domains/ai/types";

export type VoiceDisplayContent = {
  role: "user" | "assistant";
  text: string;
};

function lastMessage(messages: AiMessage[]): AiMessage | null {
  return messages.length > 0 ? messages[messages.length - 1] : null;
}

function lastUserMessage(messages: AiMessage[]): AiMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message?.role === "user" && message.content?.trim()) {
      return message;
    }
  }
  return null;
}

/**
 * Voice mode shows one message at a time for the current turn.
 * Resets when the user starts a new recording (empty live transcript).
 */
export function resolveVoiceDisplayContent(
  messages: AiMessage[],
  liveTranscript: string,
  isRecording: boolean,
  isTranscribing: boolean,
  sending: boolean,
  streaming: boolean,
  isTalking: boolean,
): VoiceDisplayContent | null {
  const live = liveTranscript.trim();

  if (isRecording || isTranscribing) {
    return live ? { role: "user", text: live } : null;
  }

  const last = lastMessage(messages);
  const aiActive = sending || streaming || isTalking;

  if (aiActive) {
    if (last?.role === "assistant" && last.content?.trim()) {
      return { role: "assistant", text: last.content };
    }
    const user = lastUserMessage(messages);
    if (user) {
      return { role: "user", text: user.content };
    }
    return null;
  }

  if (last?.content?.trim()) {
    return { role: last.role, text: last.content };
  }

  return null;
}
