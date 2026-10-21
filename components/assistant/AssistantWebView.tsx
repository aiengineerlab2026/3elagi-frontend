import { Plus, RefreshCw, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AssistantComposer } from "@/components/assistant/AssistantComposer";
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";
import { AssistantLoadingIndicator } from "@/components/assistant/AssistantLoadingIndicator";
import { AssistantMessageBubble } from "@/components/assistant/AssistantMessageBubble";
import { AssistantVoiceModeView } from "@/components/assistant/AssistantVoiceModeView";
import { AssistantVoiceWebStyles } from "@/components/assistant/AssistantVoiceWebStyles";
import type { AiConversation, AiMessage } from "@/domains/ai/types";
import type { AiFeedbackType } from "@/domains/emotions/types";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useAssistantVoiceChat } from "@/hooks/useAssistantVoiceChat";
import { useAiFileAttachment } from "@/hooks/useAiFileAttachment";

interface Props {
  conversations: AiConversation[];
  activeConversation: AiConversation | null;
  activeId: string | null;
  loadingHistory: boolean;
  sending: boolean;
  streaming?: boolean;
  error: string | null;
  historyError?: string | null;
  canRetry?: boolean;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onSend: (
    text: string,
    attachment?: {
      data: string;
      mimeType: string;
      name?: string;
      previewUri?: string;
      isPdf?: boolean;
    },
  ) => void;
  onRetry: () => void;
  selfUserId?: string | null;
  onToggleMessageEmotion?: (messageId: string, emotion: AiFeedbackType) => void;
  medicalImageBusy?: boolean;
  onSubmitMedicalImage?: (input: {
    uri: string;
    mimeType: string;
    fileName: string;
    webFile?: File;
    caption?: string;
    addToMedicalRecords: boolean;
    generateAiInsight: boolean;
  }) => void;
}

const DISCLAIMER_EN =
  "AI responses are for informational purposes only and are not a substitute for professional medical advice, diagnosis, or treatment.";
const DISCLAIMER_AR =
  "ردود الذكاء الاصطناعي للمعلومات فقط وليست بديلاً عن الاستشارة الطبية أو التشخيص أو العلاج.";

export function AssistantWebView({
  conversations,
  activeConversation,
  activeId,
  loadingHistory,
  sending,
  streaming = false,
  error,
  historyError,
  canRetry = true,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onSend,
  onRetry,
  selfUserId,
  onToggleMessageEmotion,
  medicalImageBusy = false,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isRTL } = useI18n();
  const isEn = !isRTL;
  const isDoctor = useAuthStore((s) => s.role?.toLowerCase() === "doctor");
  const listRef = useRef<FlatList<AiMessage>>(null);
  const isNearBottomRef = useRef(true);
  const initialScrollPendingRef = useRef(true);
  const messages =
    activeConversation?.messages ??
    (sending || medicalImageBusy
      ? conversations.find((c) => c.messages.some((m) => m.pending))?.messages ?? []
      : []);
  const lastMessage = messages[messages.length - 1];

  const voice = useAssistantVoiceChat({
    messages,
    sending,
    streaming,
    onSend,
  });

  const aiFile = useAiFileAttachment();
  const handleSend = useCallback(
    (text: string) => {
      isNearBottomRef.current = true;
      voice.armAutoSpeak();
      onSend(text, aiFile.attachment ?? undefined);
      aiFile.clear();
    },
    [onSend, voice, aiFile],
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    initialScrollPendingRef.current = true;
    isNearBottomRef.current = true;
  }, [activeId]);

  useEffect(() => {
    if (loadingHistory || messages.length === 0) return;
    if (!initialScrollPendingRef.current) return;
    scrollToBottom(false);
    const timer = setTimeout(() => scrollToBottom(false), 100);
    initialScrollPendingRef.current = false;
    return () => clearTimeout(timer);
  }, [activeId, loadingHistory, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!sending) return;
    scrollToBottom(false);
  }, [
    sending,
    messages.length,
    lastMessage?.content,
    lastMessage?.pending,
    scrollToBottom,
  ]);

  const handleContentSizeChange = useCallback(() => {
    if (initialScrollPendingRef.current || sending || isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [scrollToBottom, sending]);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      if (sending) return;
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      isNearBottomRef.current = distanceFromBottom < 80;
    },
    [sending],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AssistantVoiceWebStyles />
      <View
        style={[
          styles.historyPanel,
          {
            borderRightColor: colors.border,
            borderLeftColor: colors.border,
            backgroundColor: colors.card,
          },
          isRTL ? styles.historyRtl : styles.historyLtr,
        ]}
      >
        <View style={[styles.historyHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.historyTitle, { color: colors.foreground }]}>
            {isEn ? "Chats" : "المحادثات"}
          </Text>
          <Pressable
            onPress={onNewChat}
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
          >
            <Plus color={colors.primaryForeground} size={16} />
            <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>
              {isEn ? "New" : "جديد"}
            </Text>
          </Pressable>
        </View>
        {loadingHistory ? (
          <View style={styles.historyLoading}>
            <AssistantLoadingIndicator compact variant="history" />
          </View>
        ) : historyError ? (
          <Text style={[styles.emptyHistory, { color: colors.destructive }]}>
            {historyError}
          </Text>
        ) : conversations.length === 0 ? (
          <Text style={[styles.emptyHistory, { color: colors.mutedForeground }]}>
            {isEn ? "No conversations yet" : "لا توجد محادثات بعد"}
          </Text>
        ) : (
          <ScrollView contentContainerStyle={styles.historyList}>
            {conversations.map((c) => {
              const selected = c.id === activeId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => onSelectConversation(c.id)}
                  style={[
                    styles.historyItem,
                    {
                      backgroundColor: selected ? colors.background : "transparent",
                    },
                  ]}
                >
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.historyItemTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    {c.title}
                  </Text>
                  {!c.id.startsWith("draft-") ? (
                    <Pressable
                      onPress={() => onDeleteConversation(c.id)}
                      hitSlop={8}
                      style={styles.deleteBtn}
                    >
                      <Trash2 size={14} color={colors.mutedForeground} />
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.conversation}>
        <View
          style={[
            styles.conversationHeader,
            {
              borderBottomColor: colors.border,
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          <View style={styles.headerTitleRow}>
            <AssistantAvatar
              height={26}
              isTalking={voice.isTalking}
              webClassName="assistant-avatar"
            />
            <Text style={[styles.conversationTitle, { color: colors.foreground }]}>
              {isEn ? "Medical AI Assistant" : "المساعد الطبي الذكي"}
            </Text>
          </View>
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
            {isEn ? DISCLAIMER_EN : DISCLAIMER_AR}
          </Text>
        </View>

        {voice.isVoiceMode ? (
          <AssistantVoiceModeView
            isRecording={voice.isRecording}
            isTranscribing={voice.isTranscribing}
            isTalking={voice.isTalking}
            sending={sending}
            streaming={streaming}
            voiceError={voice.voiceError ?? error}
            liveTranscript={voice.liveTranscript}
            speechLocale={voice.speechLocale}
            onSpeechLocaleChange={voice.setSpeechLocale}
            onSend={() => void voice.sendRecording(voice.liveTranscript)}
            onExit={() => void voice.exitVoiceMode()}
            onClearError={voice.clearVoiceError}
          />
        ) : loadingHistory && messages.length === 0 ? (
          <View style={styles.historyLoadingMain}>
            <AssistantLoadingIndicator variant="history" />
          </View>
        ) : !activeConversation && !sending && messages.length === 0 ? (
          <View style={styles.emptyState}>
            <AssistantAvatar
              height={48}
              isTalking={voice.isTalking}
              webClassName="assistant-avatar"
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {isDoctor
                ? isEn
                  ? "Ask about your practice"
                  : "اسأل عن ممارستك الطبية"
                : isEn
                  ? "Ask about your records"
                  : "اسأل عن سجلاتك"}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              {isDoctor
                ? isEn
                  ? "Try: Which patients have I treated? What diagnoses did I add?"
                  : "جرّب: من المرضى الذين عالجتهم؟ ما التشخيصات التي أضفتها؟"
                : isEn
                  ? "Try: What allergies do I have? Which doctor diagnosed my migraine?"
                  : "جرّب: ما حساسيتي؟ من الذي شخّص صداعي النصفي؟"}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AssistantMessageBubble
                message={item}
                isRTL={isRTL}
                selfUserId={selfUserId}
                spokenWordIndex={
                  voice.spokenHighlight?.messageId === item.id
                    ? voice.spokenHighlight.wordIndex
                    : null
                }
                isReadingAloud={
                  voice.spokenHighlight?.messageId === item.id &&
                  voice.isTalking
                }
                onReadAloud={() =>
                  void voice.readAloudMessage(item.id, item.content)
                }
                onFeedback={
                  onToggleMessageEmotion
                    ? (emotion) => onToggleMessageEmotion(item.id, emotion)
                    : undefined
                }
              />
            )}
            contentContainerStyle={styles.messages}
            extraData={`${messages.length}-${voice.spokenHighlight?.wordIndex ?? -1}-${voice.isTalking}`}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
          />
        )}

        {(error || voice.voiceError) && !voice.isVoiceMode ? (
          <View
            style={[
              styles.errorBar,
              { backgroundColor: colors.destructive + "18" },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error ?? voice.voiceError}
            </Text>
            {canRetry && error ? (
              <Pressable onPress={onRetry} style={styles.retryBtn}>
                <RefreshCw size={14} color={colors.destructive} />
                <Text style={[styles.retryText, { color: colors.destructive }]}>
                  {isEn ? "Retry" : "إعادة"}
                </Text>
              </Pressable>
            ) : voice.voiceError ? (
              <Pressable onPress={voice.clearVoiceError} style={styles.retryBtn}>
                <Text style={[styles.retryText, { color: colors.destructive }]}>
                  {isEn ? "Dismiss" : "إغلاق"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!voice.isVoiceMode ? (
          <AssistantComposer
            isRTL={isRTL}
            sending={sending || medicalImageBusy}
            disabled={loadingHistory || medicalImageBusy}
            aiAttachment={
              aiFile.attachment
                ? {
                    previewUri: aiFile.attachment.previewUri,
                    name: aiFile.attachment.name,
                    isPdf: aiFile.attachment.isPdf,
                  }
                : null
            }
            onAttachAiFile={() => void aiFile.pickFile()}
            aiAttachLoading={aiFile.loading}
            onRemoveAiAttachment={aiFile.clear}
            placeholder={
              isDoctor
                ? isEn
                  ? "Ask about your patients, diagnoses, records…"
                  : "اسأل عن مرضاك، التشخيصات، السجلات…"
                : isEn
                  ? "Ask about allergies, labs, prescriptions…"
                  : "اسأل عن الحساسية، التحاليل، الأدوية…"
            }
            onSend={handleSend}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", minHeight: 0 },
  historyPanel: {
    width: 272,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    minHeight: 0,
  },
  historyLtr: { borderRightWidth: StyleSheet.hairlineWidth, borderLeftWidth: 0 },
  historyRtl: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: 0 },
  historyHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  historyTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  newBtnText: { fontSize: 12, fontWeight: "800" },
  historyList: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 16, gap: 4 },
  historyItem: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyItemTitle: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  deleteBtn: { padding: 4 },
  emptyHistory: { padding: 16, fontSize: 14 },
  historyLoading: {
    marginTop: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  historyLoadingMain: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  conversation: { flex: 1, minWidth: 0, minHeight: 0 },
  conversationHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  conversationTitle: { fontSize: 20, fontWeight: "700" },
  disclaimer: { fontSize: 12, lineHeight: 18 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  emptyBody: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  messages: { paddingVertical: 16, flexGrow: 1 },
  errorBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  errorText: { flex: 1, fontSize: 13 },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  retryText: { fontSize: 13, fontWeight: "600" },
});
