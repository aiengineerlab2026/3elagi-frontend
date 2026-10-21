export type MessageEmotionSource = "chat" | "ai";

export type MessageEmotionType = "love" | "like" | "laugh" | "thumbsup" | "dislike";

export type AiFeedbackType = "like" | "dislike";

export interface MessageEmotionItem {
  userId: string;
  emotion: MessageEmotionType;
}

export interface MessageEmotionsPayload {
  message_id: string;
  message_source: MessageEmotionSource;
  emotions: Array<{ user_id: string; emotion: MessageEmotionType }>;
}

export const MESSAGE_EMOTION_OPTIONS: Array<{
  type: MessageEmotionType;
  emoji: string;
  labelEn: string;
  labelAr: string;
}> = [
  { type: "love", emoji: "❤️", labelEn: "Love", labelAr: "حب" },
  { type: "like", emoji: "🙂", labelEn: "Like", labelAr: "إعجاب" },
  { type: "laugh", emoji: "😂", labelEn: "Laugh", labelAr: "ضحك" },
  { type: "thumbsup", emoji: "👍", labelEn: "Thumbs up", labelAr: "إعجاب" },
];

export function emotionEmoji(type: MessageEmotionType): string {
  return MESSAGE_EMOTION_OPTIONS.find((item) => item.type === type)?.emoji ?? "👍";
}

export function mapEmotionRows(
  rows: Array<{ user_id: string; emotion: MessageEmotionType }> | undefined,
): MessageEmotionItem[] {
  return (rows ?? []).map((row) => ({
    userId: row.user_id,
    emotion: row.emotion,
  }));
}
