import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { openAsk3elagiAiWithChat } from "@/domains/ai/widget-store";

/** AI deep links open the floating widget and stay in the tab shell. */
export default function AiChatDeepLinkWeb() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const chatId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : undefined;

  useEffect(() => {
    if (!chatId) return;
    openAsk3elagiAiWithChat(chatId);
    router.replace("/(tabs)");
  }, [chatId, router]);

  if (!chatId) return <Redirect href="/(tabs)" />;

  return null;
}
