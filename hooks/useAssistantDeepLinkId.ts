import { useLocalSearchParams } from "expo-router";

function pickParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string" && value) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return undefined;
}

/** Conversation id from `/ai/[id]`, `/(tabs)/assistant?chatId=`, or legacy params. */
export function useAssistantDeepLinkId(): string | undefined {
  const { chatId, id } = useLocalSearchParams<{
    chatId?: string | string[];
    id?: string | string[];
  }>();

  return pickParam(id) ?? pickParam(chatId);
}
