import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect } from "react";
import { AssistantMobileView } from "@/components/assistant/AssistantMobileView";
import { AssistantWebView } from "@/components/assistant/AssistantWebView";
import type { AiFeedbackType } from "@/domains/emotions/types";
import {
  setActiveAiChatId,
  setAssistantScreenActive,
} from "@/domains/ai/push-suppression";
import { useAuthStore } from "@/domains/auth/store";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAssistantDeepLinkId } from "@/hooks/useAssistantDeepLinkId";
import { useMobileWebTabBarHeight } from "@/hooks/useMobileWebTabBarHeight";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function AssistantScreenWeb() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const conversationId = useAssistantDeepLinkId();
  const { isDesktop } = useWebLayout();
  const bottomTabInset = useMobileWebTabBarHeight();

  const assistant = useAiAssistant();

  useFocusEffect(
    useCallback(() => {
      setAssistantScreenActive(true);
      return () => setAssistantScreenActive(false);
    }, []),
  );

  useEffect(() => {
    if (conversationId) {
      assistant.setActiveId(conversationId);
    }
  }, [conversationId, assistant.setActiveId]);

  useEffect(() => {
    if (!assistant.activeId || assistant.activeId.startsWith("draft-")) {
      setActiveAiChatId(null);
      return;
    }
    setActiveAiChatId(assistant.activeId);
  }, [assistant.activeId]);

  if (!hydrated) return null;

  const viewProps = {
    conversations: assistant.conversations,
    activeConversation: assistant.activeConversation,
    activeId: assistant.activeId,
    loadingHistory: assistant.loadingHistory,
    sending: assistant.sending,
    streaming: assistant.streaming,
    error: assistant.error,
    historyError: assistant.historyError,
    canRetry: assistant.canRetry,
    onSelectConversation: assistant.setActiveId,
    onNewChat: assistant.startNewChat,
    onDeleteConversation: (id: string) => void assistant.removeConversation(id),
    onSend: (
      text: string,
      attachment?: {
        data: string;
        mimeType: string;
        name?: string;
        previewUri?: string;
        isPdf?: boolean;
      },
    ) => void assistant.sendMessage(text, undefined, attachment),
    onRetry: () => void assistant.retryLast(),
    selfUserId: assistant.selfUserId,
    onToggleMessageEmotion: (messageId: string, emotion: AiFeedbackType) =>
      void assistant.toggleMessageEmotion(messageId, emotion),
    medicalImageBusy: assistant.medicalImageBusy,
    onSubmitMedicalImage: (input) => void assistant.submitMedicalImage(input),
  };

  if (!isDesktop) {
    return <AssistantMobileView {...viewProps} bottomTabInset={bottomTabInset} />;
  }

  return <AssistantWebView {...viewProps} />;
}
