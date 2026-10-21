import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Alert } from "react-native";
import { useAuthStore } from "@/domains/auth/store";
import { fetchAiHistory, deleteAiConversation } from "@/domains/ai/api";
import { formatAiChatError } from "@/domains/ai/errors";
import { AI_EVENTS } from "@/domains/ai/events";
import {
  GuestAiLimitError,
  sendGuestAiChat,
} from "@/domains/ai/guestApi";
import {
  GUEST_AI_MAX_MESSAGES,
  getGuestAiSentCount,
  getGuestAiSessionId,
  setGuestAiSentCount,
} from "@/domains/ai/guestSession";
import { promptAuthForConsultation } from "@/domains/auth/guestBrowse";
import { isSignedIn } from "@/domains/auth/session";
import {
  isAuthErrorMessage,
  logoutOnAuthFailure,
} from "@/domains/auth/sessionFailure";
import { setMessageEmotion } from "@/domains/emotions/api";
import { mapEmotionRows, type MessageEmotionItem, type MessageEmotionType, type AiFeedbackType } from "@/domains/emotions/types";
import {
  connectAiSocket,
  disconnectAiSocket,
  getAiSocket,
  requestAiHistory,
  sendAiMessageViaSocket,
} from "@/domains/ai/socket";
import { onMessageEmotionUpdated } from "@/domains/presence/socket";
import type { AiConversation, AiMessage } from "@/domains/ai/types";
import { createMedicalRecordFromChatImage, uploadFile } from "@/domains/medical/api";
import { getApiLang } from "@/domains/i18n/store";
import type { MedicalRecord } from "@/domains/medical/types";
import { useMedicalStore } from "@/domains/medical/store";
import { useI18n } from "@/hooks/useI18n";
import { emit } from "@/utils/eventBus";
import { formatMedicalRecordInsightReply } from "@/utils/medicalAiInsightChat";
import { AI_ATTACHMENT_ONLY_PLACEHOLDER } from "@/utils/aiMessageDisplay";
import type { AiFileAttachment } from "@/hooks/useAiFileAttachment";

/** Single local conversation guests chat in (never persisted server-side). */
const GUEST_CONVERSATION_ID = "guest-chat";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function patchAssistantMessage(
  conversations: AiConversation[],
  conversationKey: string,
  assistantLocalId: string,
  patch: Partial<AiMessage>,
  nextConversationId?: string,
): AiConversation[] {
  return conversations.map((c) => {
    if (c.id !== conversationKey && c.id !== nextConversationId) return c;
    return {
      ...c,
      id: nextConversationId ?? c.id,
      messages: c.messages.map((m) =>
        m.id === assistantLocalId ? { ...m, ...patch } : m,
      ),
    };
  });
}

function patchMessage(
  conversations: AiConversation[],
  conversationKey: string,
  messageId: string,
  patch: Partial<AiMessage>,
): AiConversation[] {
  return conversations.map((c) => {
    if (c.id !== conversationKey) return c;
    return {
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId ? { ...m, ...patch } : m,
      ),
    };
  });
}

function ensureDraftConversation(
  conversations: AiConversation[],
  activeId: string | null,
  seedMessages: AiMessage[],
  title: string,
): { conversations: AiConversation[]; conversationKey: string } {
  const isDraft = !activeId || activeId.startsWith("draft-");
  const conversationKey = isDraft ? makeId("draft") : activeId!;
  if (isDraft) {
    const draft: AiConversation = {
      id: conversationKey,
      title: title.slice(0, 80) || "New chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: seedMessages,
    };
    return { conversations: [draft, ...conversations], conversationKey };
  }
  return {
    conversations: conversations.map((c) =>
      c.id === conversationKey
        ? {
            ...c,
            updatedAt: new Date().toISOString(),
            messages: [...c.messages, ...seedMessages],
          }
        : c,
    ),
    conversationKey,
  };
}

async function streamAssistantReply(input: {
  accessToken: string;
  isRTL: boolean;
  question: string;
  conversationKey: string;
  assistantLocalId: string;
  serverConversationId?: string;
  patientUserId?: string;
  setConversations: Dispatch<SetStateAction<AiConversation[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setChatError: Dispatch<SetStateAction<string | null>>;
  setRateLimitReached: Dispatch<SetStateAction<boolean>>;
  setCanRetry: Dispatch<SetStateAction<boolean>>;
}): Promise<string> {
  const {
    accessToken,
    isRTL,
    question,
    conversationKey,
    assistantLocalId,
    serverConversationId,
    patientUserId,
    setConversations,
    setActiveId,
    setChatError,
    setRateLimitReached,
    setCanRetry,
  } = input;

  let resolvedConversationId = serverConversationId;
  let assistantContent = "";

  await sendAiMessageViaSocket(
    {
      message: question,
      chatId: serverConversationId,
      patientUserId,
    },
    (event) => {
      if (event.type === "ack" && event.conversationId) {
        resolvedConversationId = event.conversationId;
        emit(AI_EVENTS.MESSAGE_SENT, { token: accessToken });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationKey || c.id === event.conversationId
              ? { ...c, id: event.conversationId! }
              : c,
          ),
        );
        setActiveId(event.conversationId);
      }
      if (event.type === "token" && event.content) {
        assistantContent += event.content;
        setConversations((prev) =>
          patchAssistantMessage(
            prev,
            conversationKey,
            assistantLocalId,
            { content: assistantContent },
            resolvedConversationId,
          ),
        );
      }
      if (event.type === "done") {
        if (event.conversationId) {
          resolvedConversationId = event.conversationId;
          setActiveId(event.conversationId);
        }
        const finalContent = event.content ?? assistantContent;
        assistantContent = finalContent;
        setConversations((prev) =>
          patchAssistantMessage(
            prev,
            conversationKey,
            assistantLocalId,
            {
              id: event.messageId ?? assistantLocalId,
              pending: false,
              content: finalContent,
            },
            event.conversationId,
          ),
        );
      }
      if (event.type === "error") {
        const formatted = formatAiChatError(event.error, event.code, t);
        setChatError(formatted.message);
        setRateLimitReached(formatted.isRateLimit);
        setCanRetry(formatted.canRetry);
        setConversations((prev) =>
          patchAssistantMessage(
            prev,
            conversationKey,
            assistantLocalId,
            {
              pending: false,
              error: true,
              content: formatted.message,
            },
            resolvedConversationId,
          ),
        );
        throw new Error(formatted.message);
      }
    },
  );

  setConversations((prev) =>
    patchAssistantMessage(
      prev,
      conversationKey,
      assistantLocalId,
      { pending: false, content: assistantContent },
      resolvedConversationId,
    ),
  );

  return assistantContent;
}

async function loadHistoryWithFallback(accessToken: string): Promise<AiConversation[]> {
  const socket = getAiSocket();
  if (socket?.connected) {
    try {
      return await requestAiHistory();
    } catch {
      // fall through to HTTP
    }
  }
  return fetchAiHistory(accessToken);
}

function mapConversationEmotions(conversation: AiConversation): AiConversation {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => ({
      ...message,
      emotions: mapEmotionRows(
        (message as AiMessage & { emotions?: Array<{ user_id: string; emotion: MessageEmotionType }> })
          .emotions,
      ),
    })),
  };
}

export function useAiAssistant() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const selfUserId = profile?.id ?? null;
  const upsertDocument = useMedicalStore((s) => s.upsertDocument);
  const notifyMedicalHistoryChanged = useMedicalStore(
    (s) => s.notifyMedicalHistoryChanged,
  );
  const { isRTL, t } = useI18n();
  const isEn = !isRTL;
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [medicalImageBusy, setMedicalImageBusy] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [rateLimitReached, setRateLimitReached] = useState(false);
  const [canRetry, setCanRetry] = useState(true);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [guestSentCount, setGuestSentCount] = useState(0);
  const signedIn = isSignedIn(profile, accessToken);
  const isGuest = !signedIn;

  const updateMessageEmotions = useCallback(
    (messageId: string, emotions: MessageEmotionItem[]) => {
      setConversations((prev) =>
        prev.map((conversation) => ({
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.id === messageId ? { ...message, emotions } : message,
          ),
        })),
      );
    },
    [],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const loadHistory = useCallback(async () => {
    if (!signedIn || !accessToken) {
      setConversations([]);
      setActiveId(null);
      setLoadingHistory(false);
      setHistoryError(null);
      return;
    }
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const rows = (await loadHistoryWithFallback(accessToken)).map(mapConversationEmotions);
      setConversations(rows);
      setActiveId((current) => current ?? rows[0]?.id ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load history";
      if (isAuthErrorMessage(message)) {
        logoutOnAuthFailure();
      }
      setHistoryError(message);
    } finally {
      setLoadingHistory(false);
    }
  }, [accessToken, signedIn]);

  // The AI chat has its own dedicated socket (separate from the presence/main
  // socket); connect while the assistant is mounted, tear down on leave.
  useEffect(() => {
    if (!signedIn || !accessToken) {
      disconnectAiSocket();
      return;
    }
    connectAiSocket(accessToken);
    return () => disconnectAiSocket();
  }, [accessToken, signedIn]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!isGuest) return;
    void getGuestAiSentCount().then(setGuestSentCount);
  }, [isGuest]);

  const startNewChat = useCallback(() => {
    setActiveId(null);
    setChatError(null);
    setRateLimitReached(false);
    setCanRetry(true);
  }, []);

  const removeConversation = useCallback(
    async (conversationId: string) => {
      if (!accessToken || conversationId.startsWith("draft-")) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (activeId === conversationId) setActiveId(null);
        return;
      }
      await deleteAiConversation(accessToken, conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeId === conversationId) setActiveId(null);
    },
    [accessToken, activeId],
  );

  // Free tier: logged-out visitors get GUEST_AI_MAX_MESSAGES turns against the
  // public /ai/guest/chat endpoint.
  const sendGuestMessage = useCallback(
    async (text: string, attachment?: AiFileAttachment | null) => {
      const question = text.trim();
      if (!question && !attachment) return;
      if ((await getGuestAiSentCount()) >= GUEST_AI_MAX_MESSAGES) {
        promptAuthForConsultation();
        return;
      }

      const displayContent =
        question || (attachment ? AI_ATTACHMENT_ONLY_PLACEHOLDER : "");
      const attImageUri =
        attachment && !attachment.isPdf && attachment.mimeType.startsWith("image/")
          ? `data:${attachment.mimeType};base64,${attachment.data}`
          : undefined;
      const attFileName =
        attachment && (attachment.isPdf || !attachment.mimeType.startsWith("image/"))
          ? attachment.name
          : undefined;

      const userMessage: AiMessage = {
        id: makeId("guest-user"),
        role: "user",
        content: displayContent,
        createdAt: new Date().toISOString(),
        imageUri: attImageUri,
        fileName: attFileName,
      };
      const assistantLocalId = makeId("guest-assistant");
      const assistantMessage: AiMessage = {
        id: assistantLocalId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        pending: true,
      };
      const history = (
        conversations.find((c) => c.id === GUEST_CONVERSATION_ID)?.messages ?? []
      )
        .filter((m) => !m.pending && m.content.trim())
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      setLastQuestion(question);
      setChatError(null);
      setCanRetry(true);
      setSending(true);
      setStreaming(true);
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === GUEST_CONVERSATION_ID);
        const next: AiConversation = existing
          ? {
              ...existing,
              updatedAt: new Date().toISOString(),
              messages: [...existing.messages, userMessage, assistantMessage],
            }
          : {
              id: GUEST_CONVERSATION_ID,
              title: question.slice(0, 80) || "New chat",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [userMessage, assistantMessage],
            };
        return [next, ...prev.filter((c) => c.id !== GUEST_CONVERSATION_ID)];
      });
      setActiveId(GUEST_CONVERSATION_ID);

      try {
        const result = await sendGuestAiChat({
          guestId: await getGuestAiSessionId(),
          message: question || AI_ATTACHMENT_ONLY_PLACEHOLDER,
          history,
          locale: getApiLang(),
          attachment,
        });
        await setGuestAiSentCount(result.used);
        setGuestSentCount(result.used);
        setConversations((prev) =>
          patchAssistantMessage(prev, GUEST_CONVERSATION_ID, assistantLocalId, {
            pending: false,
            content: result.content,
          }),
        );
      } catch (e) {
        if (e instanceof GuestAiLimitError) {
          await setGuestAiSentCount(GUEST_AI_MAX_MESSAGES);
          setGuestSentCount(GUEST_AI_MAX_MESSAGES);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === GUEST_CONVERSATION_ID
                ? {
                    ...c,
                    messages: c.messages.filter(
                      (m) => m.id !== userMessage.id && m.id !== assistantLocalId,
                    ),
                  }
                : c,
            ),
          );
          promptAuthForConsultation();
          return;
        }
        const message = e instanceof Error ? e.message : t.auth.genericError;
        setChatError(message);
        setConversations((prev) =>
          patchAssistantMessage(prev, GUEST_CONVERSATION_ID, assistantLocalId, {
            pending: false,
            error: true,
            content: message,
          }),
        );
      } finally {
        setSending(false);
        setStreaming(false);
      }
    },
    [conversations, t.auth.genericError],
  );

  const sendMessage = useCallback(
    async (
      text: string,
      patientUserId?: string,
      attachment?: {
        data: string;
        mimeType: string;
        name?: string;
        previewUri?: string;
        uploadUri?: string;
        webFile?: File;
        isPdf?: boolean;
      },
    ) => {
      if (!text.trim() && !attachment) return;
      if (!signedIn || !accessToken) {
        await sendGuestMessage(text, attachment ?? null);
        return;
      }
      const question = text.trim();
      const attImageUri =
        attachment && !attachment.isPdf && attachment.mimeType.startsWith("image/")
          ? attachment.previewUri ??
            `data:${attachment.mimeType};base64,${attachment.data}`
          : undefined;
      const attFileName =
        attachment && !attachment.mimeType.startsWith("image/")
          ? attachment.name ?? "document"
          : undefined;

      setLastQuestion(question);
      setChatError(null);
      setRateLimitReached(false);
      setCanRetry(true);
      setSending(true);
      setStreaming(true);

      const userMessage: AiMessage = {
        id: makeId("user"),
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
        imageUri: attImageUri,
        fileName: attFileName,
      };
      const assistantLocalId = makeId("assistant");
      const assistantMessage: AiMessage = {
        id: assistantLocalId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        pending: true,
      };

      const isDraft = !activeId || activeId.startsWith("draft-");
      const conversationKey = isDraft ? makeId("draft") : activeId!;
      const serverConversationId = isDraft ? undefined : activeId ?? undefined;

      if (isDraft) {
        const draft: AiConversation = {
          id: conversationKey,
          title:
            question.slice(0, 80) ||
            attFileName?.slice(0, 80) ||
            "New chat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [userMessage, assistantMessage],
        };
        setConversations((prev) => [draft, ...prev]);
        setActiveId(conversationKey);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationKey
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  messages: [...c.messages, userMessage, assistantMessage],
                }
              : c,
          ),
        );
      }

      let resolvedConversationId = serverConversationId;
      let assistantContent = "";
      let ackReceived = false;

      try {
        let socketAttachment: { data: string; mimeType: string } | undefined;
        let attachmentUrl: string | undefined;

        if (attachment?.isPdf && attachment.uploadUri) {
          const uploaded = await uploadFile(
            attachment.uploadUri,
            attachment.mimeType,
            attachment.name ?? "document",
            accessToken,
            attachment.webFile,
          );
          attachmentUrl = uploaded.url;
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== conversationKey && c.id !== resolvedConversationId) {
                return c;
              }
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === userMessage.id
                    ? { ...m, attachmentUrl: uploaded.url, fileName: attFileName }
                    : m,
                ),
              };
            }),
          );
        } else if (attachment) {
          socketAttachment = {
            data: attachment.data,
            mimeType: attachment.mimeType,
          };
        }

        await sendAiMessageViaSocket(
          {
            message: question,
            chatId: serverConversationId,
            patientUserId,
            attachment: socketAttachment,
            attachmentUrl,
            fileName: attFileName ?? attachment?.name,
          },
          (event) => {
            if (event.type === "ack" && event.conversationId) {
              ackReceived = true;
              resolvedConversationId = event.conversationId;
              emit(AI_EVENTS.MESSAGE_SENT, { token: accessToken });
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === conversationKey || c.id === event.conversationId
                    ? { ...c, id: event.conversationId! }
                    : c,
                ),
              );
              setActiveId(event.conversationId);
            }
            if (event.type === "token" && event.content) {
              assistantContent += event.content;
              setConversations((prev) =>
                patchAssistantMessage(
                  prev,
                  conversationKey,
                  assistantLocalId,
                  { content: assistantContent },
                  resolvedConversationId,
                ),
              );
            }
            if (event.type === "done") {
              if (event.conversationId) {
                resolvedConversationId = event.conversationId;
                setActiveId(event.conversationId);
              }
              const finalContent = event.content ?? assistantContent;
              assistantContent = finalContent;
              setConversations((prev) =>
                patchAssistantMessage(
                  prev,
                  conversationKey,
                  assistantLocalId,
                  {
                    id: event.messageId ?? assistantLocalId,
                    pending: false,
                    content: finalContent,
                  },
                  event.conversationId,
                ),
              );
            }
            if (event.type === "error") {
              const formatted = formatAiChatError(
                event.error,
                event.code,
                t,
              );
              if (isAuthErrorMessage(event.error) || isAuthErrorMessage(formatted.message)) {
                logoutOnAuthFailure();
              }
              setChatError(formatted.message);
              setRateLimitReached(formatted.isRateLimit);
              setCanRetry(formatted.canRetry);
              setConversations((prev) =>
                patchAssistantMessage(
                  prev,
                  conversationKey,
                  assistantLocalId,
                  {
                    pending: false,
                    error: true,
                    content: formatted.message,
                  },
                  resolvedConversationId,
                ),
              );
            }
          },
        );

        setConversations((prev) =>
          patchAssistantMessage(
            prev,
            conversationKey,
            assistantLocalId,
            { pending: false, content: assistantContent },
            resolvedConversationId,
          ),
        );
      } catch (err) {
        const code =
          err instanceof Error && "code" in err
            ? (err as Error & { code?: string }).code
            : undefined;
        const formatted = formatAiChatError(
          err instanceof Error ? err.message : undefined,
          code,
          t,
        );
        setChatError(formatted.message);
        setRateLimitReached(formatted.isRateLimit);
        setCanRetry(formatted.canRetry);

        if (isAuthErrorMessage(formatted.message) || isAuthErrorMessage(err instanceof Error ? err.message : undefined)) {
          logoutOnAuthFailure();
        }

        if (!ackReceived) {
          setConversations((prev) => {
            const next = prev
              .map((c) => {
                if (c.id !== conversationKey && c.id !== resolvedConversationId) {
                  return c;
                }
                return {
                  ...c,
                  messages: c.messages.filter(
                    (m) => m.id !== userMessage.id && m.id !== assistantLocalId,
                  ),
                };
              })
              .filter((c) => c.messages.length > 0);
            if (isDraft && next.every((c) => c.id !== conversationKey)) {
              setActiveId(next[0]?.id ?? null);
            }
            return next;
          });
        } else {
          setConversations((prev) =>
            patchAssistantMessage(
              prev,
              conversationKey,
              assistantLocalId,
              {
                pending: false,
                error: true,
                content: formatted.message,
              },
              resolvedConversationId,
            ),
          );
        }
      } finally {
        setSending(false);
        setStreaming(false);
      }
    },
    [accessToken, activeId, isRTL, sendGuestMessage, signedIn, t],
  );

  useEffect(() => {
    onMessageEmotionUpdated((payload) => {
      if (payload.message_source !== "ai") return;
      updateMessageEmotions(payload.message_id, mapEmotionRows(payload.emotions));
    });
    return () => onMessageEmotionUpdated(null);
  }, [updateMessageEmotions]);

  const toggleMessageEmotion = useCallback(
    async (messageId: string, emotion: AiFeedbackType) => {
      if (!accessToken) return;
      try {
        const result = await setMessageEmotion(accessToken, messageId, "ai", emotion);
        updateMessageEmotions(messageId, mapEmotionRows(result.emotions));
      } catch (e) {
        Alert.alert(
          isRTL ? "تعذر الإضافة" : "Could not react",
          e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
        );
      }
    },
    [accessToken, isRTL, updateMessageEmotions],
  );

  const retryLast = useCallback(async () => {
    if (!lastQuestion || !canRetry) return;
    await sendMessage(lastQuestion);
  }, [lastQuestion, sendMessage, canRetry]);

  const appendMedicalRecordCreated = useCallback(
    (record: MedicalRecord, previewUri?: string) => {
      upsertDocument(record);
      if (profile?.id) notifyMedicalHistoryChanged(profile.id);

      const userMessage: AiMessage = {
        id: makeId("user"),
        role: "user",
        content: isEn
          ? `Created medical record: ${record.title}`
          : `تم إنشاء سجل طبي: ${record.title}`,
        createdAt: new Date().toISOString(),
        imageUri: previewUri,
        imageUrl: record.fileUrl ?? undefined,
      };
      const assistantMessage: AiMessage = {
        id: makeId("assistant"),
        role: "assistant",
        content: formatMedicalRecordInsightReply(record, isEn, "created"),
        createdAt: new Date().toISOString(),
      };
      setConversations((prev) => {
        const next = ensureDraftConversation(
          prev,
          activeId,
          [userMessage, assistantMessage],
          record.title,
        );
        setActiveId(next.conversationKey);
        return next.conversations;
      });
    },
    [activeId, isEn, notifyMedicalHistoryChanged, profile?.id, upsertDocument],
  );

  const submitMedicalImage = useCallback(
    async (input: {
      uri: string;
      mimeType: string;
      fileName: string;
      webFile?: File;
      caption?: string;
      addToMedicalRecords: boolean;
      generateAiInsight: boolean;
    }) => {
      if (!accessToken || medicalImageBusy || sending) return;
      const userMessageId = makeId("user");
      const caption = input.caption?.trim();
      const wantsCaptionReply = !!caption;
      const wantsRecord = input.addToMedicalRecords;
      const userContent =
        caption || (isEn ? "Shared medical image" : "صورة طبية مرفقة");
      const userMessage: AiMessage = {
        id: userMessageId,
        role: "user",
        content: userContent,
        createdAt: new Date().toISOString(),
        imageUri: input.uri,
      };

      const needsAssistant = wantsRecord || wantsCaptionReply;
      const assistantLocalId = needsAssistant ? makeId("assistant") : null;
      const seedMessages: AiMessage[] = [userMessage];
      if (assistantLocalId) {
        seedMessages.push({
          id: assistantLocalId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          pending: true,
        });
      }

      const isDraft = !activeId || activeId.startsWith("draft-");
      const serverConversationId = isDraft ? undefined : activeId ?? undefined;
      let conversationKey = isDraft ? makeId("draft") : activeId!;

      setMedicalImageBusy(true);
      setChatError(null);
      setConversations((prev) => {
        const next = ensureDraftConversation(
          prev,
          activeId,
          seedMessages,
          userContent,
        );
        conversationKey = next.conversationKey;
        setActiveId(next.conversationKey);
        return next.conversations;
      });

      const recordSavedLine = (record: MedicalRecord) =>
        isEn
          ? `Medical record saved: [${record.title}](/medical/${record.id}).`
          : `تم حفظ السجل الطبي: [${record.title}](/medical/${record.id}).`;

      try {
        if (wantsRecord) {
          const record = await createMedicalRecordFromChatImage(
            {
              uri: input.uri,
              mimeType: input.mimeType,
              fileName: input.fileName,
              webFile: input.webFile,
              caption,
              generateInsight: input.generateAiInsight,
            },
            accessToken,
            getApiLang(),
          );
          upsertDocument(record);
          if (profile?.id) notifyMedicalHistoryChanged(profile.id);

          setConversations((prev) =>
            patchMessage(prev, conversationKey, userMessageId, {
              imageUrl: record.fileUrl ?? undefined,
            }),
          );

          if (!assistantLocalId) return;

          if (input.generateAiInsight) {
            const assistantContent = formatMedicalRecordInsightReply(
              record,
              isEn,
              "uploaded",
            );
            setConversations((prev) =>
              patchAssistantMessage(prev, conversationKey, assistantLocalId, {
                pending: false,
                content: assistantContent,
              }),
            );
          } else if (wantsCaptionReply) {
            setLastQuestion(caption!);
            setSending(true);
            setStreaming(true);
            try {
              const reply = await streamAssistantReply({
                accessToken,
                isRTL,
                question: caption!,
                conversationKey,
                assistantLocalId,
                serverConversationId,
                setConversations,
                setActiveId,
                setChatError,
                setRateLimitReached,
                setCanRetry,
              });
              const combined = `${reply}\n\n${recordSavedLine(record)}`;
              setConversations((prev) =>
                patchAssistantMessage(prev, conversationKey, assistantLocalId, {
                  pending: false,
                  content: combined,
                }),
              );
            } finally {
              setSending(false);
              setStreaming(false);
            }
          } else {
            setConversations((prev) =>
              patchAssistantMessage(prev, conversationKey, assistantLocalId, {
                pending: false,
                content: recordSavedLine(record),
              }),
            );
          }
          return;
        }

        const uploaded = await uploadFile(
          input.uri,
          input.mimeType,
          input.fileName,
          accessToken,
          input.webFile,
        );
        const imageUrl = uploaded.url || uploaded.objectPath;
        setConversations((prev) =>
          patchMessage(prev, conversationKey, userMessageId, { imageUrl }),
        );

        if (wantsCaptionReply && assistantLocalId) {
          setLastQuestion(caption!);
          setSending(true);
          setStreaming(true);
          try {
            await streamAssistantReply({
              accessToken,
              isRTL,
              question: caption!,
              conversationKey,
              assistantLocalId,
              serverConversationId,
              setConversations,
              setActiveId,
              setChatError,
              setRateLimitReached,
              setCanRetry,
            });
          } finally {
            setSending(false);
            setStreaming(false);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : isEn ? "Upload failed" : "فشل الرفع";
        setChatError(message);
        if (assistantLocalId) {
          setConversations((prev) =>
            patchAssistantMessage(prev, conversationKey, assistantLocalId, {
              pending: false,
              error: true,
              content: message,
            }),
          );
        }
      } finally {
        setMedicalImageBusy(false);
      }
    },
    [
      accessToken,
      activeId,
      isEn,
      isRTL,
      medicalImageBusy,
      notifyMedicalHistoryChanged,
      profile?.id,
      sending,
      upsertDocument,
    ],
  );

  return {
    conversations,
    activeConversation,
    activeId,
    setActiveId,
    loadingHistory,
    sending,
    streaming,
    medicalImageBusy,
    error: chatError,
    historyError,
    rateLimitReached,
    canRetry,
    loadHistory,
    startNewChat,
    removeConversation,
    sendMessage,
    submitMedicalImage,
    appendMedicalRecordCreated,
    retryLast,
    lastQuestion,
    selfUserId,
    toggleMessageEmotion,
    isGuest,
    guestSentCount,
    guestRemaining: Math.max(0, GUEST_AI_MAX_MESSAGES - guestSentCount),
    guestMax: GUEST_AI_MAX_MESSAGES,
  };
}
