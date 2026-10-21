import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect } from "react";
import { AssistantMobileView } from "@/components/assistant/AssistantMobileView";
import {
  setActiveAiChatId,
  setAssistantScreenActive,
} from "@/domains/ai/push-suppression";
import { useAuthStore } from "@/domains/auth/store";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAssistantDeepLinkId } from "@/hooks/useAssistantDeepLinkId";

export default function AssistantScreen() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const conversationId = useAssistantDeepLinkId();
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

  return (
    <AssistantMobileView
      conversations={assistant.conversations}
      activeConversation={assistant.activeConversation}
      activeId={assistant.activeId}
      loadingHistory={assistant.loadingHistory}
      sending={assistant.sending}
      streaming={assistant.streaming}
      error={assistant.error}
      historyError={assistant.historyError}
      canRetry={assistant.canRetry}
      onSelectConversation={assistant.setActiveId}
      onNewChat={assistant.startNewChat}
      onDeleteConversation={(id) => void assistant.removeConversation(id)}
      onSend={(text, attachment) =>
        void assistant.sendMessage(text, undefined, attachment)
      }
      onRetry={() => void assistant.retryLast()}
      selfUserId={assistant.selfUserId}
      onToggleMessageEmotion={(messageId, emotion) =>
        void assistant.toggleMessageEmotion(messageId, emotion)
      }
      medicalImageBusy={assistant.medicalImageBusy}
      onSubmitMedicalImage={(input) => void assistant.submitMedicalImage(input)}
    />
  );
}
