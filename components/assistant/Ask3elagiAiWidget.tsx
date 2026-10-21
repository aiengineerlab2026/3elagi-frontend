import { usePathname, useSegments } from "expo-router";
import {
  Bot,
  ChevronLeft,
  History,
  Maximize2,
  Minimize,
  Minimize2,
  Plus,
  Sparkles,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AssistantComposer } from "@/components/assistant/AssistantComposer";
import { AssistantHistoryList } from "@/components/assistant/AssistantHistoryList";
import { AssistantMessageBubble } from "@/components/assistant/AssistantMessageBubble";
import { GuestAiLimitError, sendGuestAiChat } from "@/domains/ai/guestApi";
import {
  GUEST_AI_MAX_MESSAGES,
  getGuestAiSentCount,
  getGuestAiSessionId,
  loadGuestActiveConversationId,
  loadGuestConversations,
  makeGuestConversationId,
  saveGuestActiveConversationId,
  saveGuestConversations,
  setGuestAiSentCount,
} from "@/domains/ai/guestSession";
import { useAiEnabled } from "@/domains/ai/aiPreference";
import type { AiConversation, AiMessage } from "@/domains/ai/types";
import { useAsk3elagiAiWidgetStore } from "@/domains/ai/widget-store";
import {
  setActiveAiWidgetChatId,
  setAiWidgetOpen,
} from "@/domains/ai/push-suppression";
import { promptAuthForConsultation } from "@/domains/auth/guestBrowse";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { getApiLang } from "@/domains/i18n/store";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useAiFileAttachment } from "@/hooks/useAiFileAttachment";
import type { AiFileAttachment } from "@/hooks/useAiFileAttachment";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";
import { AI_ATTACHMENT_ONLY_PLACEHOLDER } from "@/utils/aiMessageDisplay";
import { MEDICAL_RECORD_ADD_BAR_HEIGHT } from "@/components/records/MedicalRecordAddBar";
import { MEDICAL_FORM_SAVE_BAR_HEIGHT } from "@/constants/medicalFormFooter";
import {
  mobileWebTabBarHeight,
  NATIVE_TAB_BAR_HEIGHT,
  WEB_FAB_INSET,
} from "@/constants/webLayout";
import { profileSaveChromeHeight } from "@/components/profile/profileSaveChrome";
import {
  ask3elagiAiTriggerInSidebar,
  patientUserIdFromPath,
  shouldHideAsk3elagiAiOnRoute,
} from "@/components/assistant/ask3elagiAiTrigger";
import { viewportPortal } from "@/utils/viewportPortal";

function makeLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** FAB size — used by pages that need bottom padding clearance. */
export const ASK_3ELAGI_AI_FAB_SIZE = 56;
/** Gap from the viewport edge. */
export const ASK_3ELAGI_AI_FAB_CHROME_GAP = WEB_FAB_INSET;
/** Extra breathing room above the native bottom tab bar. */
export const ASK_3ELAGI_AI_FAB_TAB_BAR_GAP = 14;
function isProfileRoute(pathname: string | null, segments: string[]): boolean {
  return segments.includes("profile") || Boolean(pathname?.includes("/profile"));
}

/** Mobile web routes that render the fixed bottom tab bar. */
function mobileWebBottomTabBarVisible(
  pathname: string | null,
  segments: string[],
): boolean {
  if (segments.includes("(tabs)")) return true;
  if (pathname?.startsWith("/medical")) return true;
  if (pathname && /(^|\/)chat(\/|$)/.test(pathname)) return true;
  return false;
}

/** Records pages dock an add-record bar — lift the FAB above it on mobile. */
function recordsAddBarFabOffset(
  pathname: string | null,
  segments: string[],
  isDesktop: boolean,
): number {
  if (isDesktop) return 0;
  const onRecordsTab =
    segments.includes("records") || Boolean(pathname?.includes("/records"));
  const onPatientRecords = Boolean(pathname?.match(/\/patients\/[^/]+\/?$/));
  const onBodyPartRecords = Boolean(pathname?.includes("/medical/body"));
  if (!onRecordsTab && !onPatientRecords && !onBodyPartRecords) return 0;
  return MEDICAL_RECORD_ADD_BAR_HEIGHT + ASK_3ELAGI_AI_FAB_CHROME_GAP;
}

/** The medical add / prescription forms dock a Save + Cancel bar — clear it. */
function medicalFormSaveBarFabOffset(pathname: string | null): number {
  if (!pathname) return 0;
  if (!/\/medical\/(add|prescription\/add)/.test(pathname)) return 0;
  return MEDICAL_FORM_SAVE_BAR_HEIGHT + ASK_3ELAGI_AI_FAB_CHROME_GAP;
}

/** Profile pages dock a Save bar — lift the FAB above it. */
function profileSaveBarFabOffset(
  pathname: string | null,
  segments: string[],
  isDesktop: boolean,
  sidebarTrigger: boolean,
): number {
  if (sidebarTrigger || !isProfileRoute(pathname, segments)) return 0;
  const saveHeight = profileSaveChromeHeight({ withLogout: !isDesktop });
  const fabSize = 56;
  return saveHeight + fabSize + ASK_3ELAGI_AI_FAB_CHROME_GAP;
}

/** Chat screens dock a composer (mic + input) — floating FAB is hidden;
 * ChatComposer renders an inline Ask AI control above the input instead. */
function hideFabOnChatRoute(
  pathname: string | null,
  segments: string[],
): boolean {
  if (pathname && /(^|\/)chat(\/|$)/.test(pathname)) return true;
  return segments.some((s) => s === "chat");
}
/** Distinct red so the floating Ask 3elagi AI control stands out from primary CTAs. */
const ASK_3ELAGI_AI_FAB_RED = "#e11d48";
const ASK_3ELAGI_AI_FAB_RED_SOFT = "rgba(255, 255, 255, 0.18)";
const ASK_3ELAGI_AI_FAB_ON_RED = "#ffffff";
const ASK_3ELAGI_AI_FAB_ON_RED_MUTED = "rgba(255, 255, 255, 0.82)";
const ASK_3ELAGI_AI_FAB_RED_SHADOW =
  "0 10px 28px rgba(225, 29, 72, 0.45), 0 4px 12px rgba(15, 23, 42, 0.18)";

function Ask3elagiAiPanel() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((s) => s.isVisible);
  const pathname = usePathname();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isDesktop } = useWebLayout();
  const isNative = Platform.OS !== "web";
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const signedIn = hydrated && isSignedIn(profile, accessToken);
  const widgetOpen = useAsk3elagiAiWidgetStore((s) => s.open);
  const closeWidget = useAsk3elagiAiWidgetStore((s) => s.closeWidget);
  const expanded = useAsk3elagiAiWidgetStore((s) => s.expanded);
  const toggleExpanded = useAsk3elagiAiWidgetStore((s) => s.toggleExpanded);
  const consumePendingQuestion = useAsk3elagiAiWidgetStore(
    (s) => s.consumePendingQuestion,
  );
  const pendingChatId = useAsk3elagiAiWidgetStore((s) => s.pendingChatId);
  const clearPendingChatId = useAsk3elagiAiWidgetStore((s) => s.clearPendingChatId);
  const scopedPatientUserId = useAsk3elagiAiWidgetStore((s) => s.patientUserId);
  const setPatientUserId = useAsk3elagiAiWidgetStore((s) => s.setPatientUserId);
  const assistant = useAiAssistant();
  const aiFile = useAiFileAttachment();
  const listRef = useRef<FlatList>(null);
  const pendingSmoothScrollRef = useRef(false);
  const [guestConversations, setGuestConversations] = useState<AiConversation[]>([]);
  const [guestActiveId, setGuestActiveId] = useState<string | null>(null);
  const [guestSending, setGuestSending] = useState(false);
  const [guestSentCount, setGuestSentCountState] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const sentPendingRef = useRef(false);
  const patientUserId =
    scopedPatientUserId ?? patientUserIdFromPath(pathname);

  const guestActiveConversation = guestConversations.find(
    (c) => c.id === guestActiveId,
  );
  const messages = signedIn
    ? (assistant.activeConversation?.messages ?? [])
    : (guestActiveConversation?.messages ?? []);
  const busy = signedIn
    ? assistant.sending || assistant.streaming
    : guestSending;
  const loadingHistory = signedIn ? assistant.loadingHistory : false;

  useEffect(() => {
    const fromPath = patientUserIdFromPath(pathname);
    if (fromPath) setPatientUserId(fromPath);
  }, [pathname, setPatientUserId]);

  useEffect(() => {
    if (signedIn) return;
    void getGuestAiSentCount().then(setGuestSentCountState);
    void (async () => {
      const [rows, activeId] = await Promise.all([
        loadGuestConversations(),
        loadGuestActiveConversationId(),
      ]);
      setGuestConversations(rows);
      setGuestActiveId(activeId ?? rows[0]?.id ?? null);
    })();
  }, [signedIn]);

  const persistGuestState = useCallback(
    (rows: AiConversation[], activeId: string | null) => {
      setGuestConversations(rows);
      setGuestActiveId(activeId);
      void saveGuestConversations(rows);
      void saveGuestActiveConversationId(activeId);
    },
    [],
  );

  const patchGuestConversation = useCallback(
    (
      conversationId: string,
      patch: Partial<AiConversation> | ((c: AiConversation) => AiConversation),
    ) => {
      setGuestConversations((prev) => {
        const rows = prev.map((c) => {
          if (c.id !== conversationId) return c;
          return typeof patch === "function" ? patch(c) : { ...c, ...patch };
        });
        void saveGuestConversations(rows);
        return rows;
      });
    },
    [],
  );

  const ensureGuestConversation = useCallback((): {
    id: string;
    messages: AiMessage[];
  } => {
    if (guestActiveId && guestConversations.some((c) => c.id === guestActiveId)) {
      const conv = guestConversations.find((c) => c.id === guestActiveId)!;
      return { id: guestActiveId, messages: conv.messages };
    }
    const id = makeGuestConversationId();
    const draft: AiConversation = {
      id,
      title: "New chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const rows = [draft, ...guestConversations];
    persistGuestState(rows, id);
    return { id, messages: [] };
  }, [guestActiveId, guestConversations, persistGuestState]);

  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const scrollToLatestSmooth = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
  }, []);

  const sendGuestMessage = useCallback(
    async (value: string, attachment?: AiFileAttachment | null) => {
      const question = value.trim();
      if ((!question && !attachment) || guestSending) return;

      const alreadySent = await getGuestAiSentCount();
      if (alreadySent >= GUEST_AI_MAX_MESSAGES) {
        promptAuthForConsultation();
        return;
      }

      const { id: conversationId, messages: priorMessages } = ensureGuestConversation();
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

      const userMsg: AiMessage = {
        id: makeLocalId("guest-user"),
        role: "user",
        content: displayContent,
        createdAt: new Date().toISOString(),
        imageUri: attImageUri,
        fileName: attFileName,
      };
      const assistantLocalId = makeLocalId("guest-ai");
      const pendingAssistant: AiMessage = {
        id: assistantLocalId,
        role: "assistant",
        content: "",
        pending: true,
        createdAt: new Date().toISOString(),
      };

      setGuestSending(true);
      patchGuestConversation(conversationId, (c) => ({
        ...c,
        title:
          c.title === "New chat" && displayContent
            ? displayContent.slice(0, 80)
            : c.title,
        updatedAt: new Date().toISOString(),
        messages: [...c.messages, userMsg, pendingAssistant],
      }));

      try {
        const guestId = await getGuestAiSessionId();
        const history = priorMessages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .filter((m) => !m.pending && m.content.trim())
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        const result = await sendGuestAiChat({
          guestId,
          message: question || AI_ATTACHMENT_ONLY_PLACEHOLDER,
          history,
          locale: getApiLang(),
          attachment,
        });
        await setGuestAiSentCount(result.used);
        setGuestSentCountState(result.used);
        patchGuestConversation(conversationId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantLocalId
              ? { ...m, pending: false, content: result.content }
              : m,
          ),
        }));
      } catch (e) {
        if (e instanceof GuestAiLimitError) {
          patchGuestConversation(conversationId, (c) => ({
            ...c,
            messages: c.messages.filter(
              (m) => m.id !== userMsg.id && m.id !== assistantLocalId,
            ),
          }));
          promptAuthForConsultation();
          return;
        }
        const errText =
          e instanceof Error ? e.message : t.auth.genericError;
        patchGuestConversation(conversationId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantLocalId
              ? { ...m, pending: false, content: errText }
              : m,
          ),
        }));
      } finally {
        setGuestSending(false);
      }
    },
    [
      ensureGuestConversation,
      guestSending,
      patchGuestConversation,
      t.auth.genericError,
    ],
  );

  useEffect(() => {
    if (sentPendingRef.current) return;
    const pending = consumePendingQuestion();
    if (!pending?.trim()) return;
    sentPendingRef.current = true;
    if (signedIn) {
      void assistant.sendMessage(pending.trim(), patientUserId ?? undefined);
    } else {
      void sendGuestMessage(pending.trim());
    }
  }, [
    consumePendingQuestion,
    assistant,
    patientUserId,
    signedIn,
    sendGuestMessage,
  ]);

  useEffect(() => {
    if (!signedIn || !pendingChatId || loadingHistory) return;
    assistant.setActiveId(pendingChatId);
    clearPendingChatId();
  }, [
    signedIn,
    pendingChatId,
    loadingHistory,
    assistant.setActiveId,
    clearPendingChatId,
  ]);

  useEffect(() => {
    if (!signedIn) {
      setActiveAiWidgetChatId(null);
      return;
    }
    const id = assistant.activeId;
    if (id && !id.startsWith("draft-")) {
      setActiveAiWidgetChatId(id);
      return;
    }
    setActiveAiWidgetChatId(null);
  }, [signedIn, assistant.activeId]);

  const activeConversationKey = signedIn
    ? (assistant.activeId ?? "new")
    : (guestActiveId ?? "guest");

  // Defer one smooth scroll after open / conversation switch / history load.
  useEffect(() => {
    if (!widgetOpen) return;
    pendingSmoothScrollRef.current = true;
  }, [widgetOpen, activeConversationKey]);

  useEffect(() => {
    if (!widgetOpen || loadingHistory) return;
    pendingSmoothScrollRef.current = true;
    const timer = setTimeout(() => {
      if (!pendingSmoothScrollRef.current) return;
      scrollToLatestSmooth();
      pendingSmoothScrollRef.current = false;
    }, 150);
    return () => clearTimeout(timer);
  }, [widgetOpen, loadingHistory, activeConversationKey, scrollToLatestSmooth]);

  const onChatContentSizeChange = useCallback(() => {
    if (!widgetOpen || loadingHistory || !pendingSmoothScrollRef.current) return;
    pendingSmoothScrollRef.current = false;
    scrollToLatestSmooth();
  }, [widgetOpen, loadingHistory, scrollToLatestSmooth]);

  useEffect(() => {
    if (!widgetOpen || messages.length === 0) return;
    scrollToLatest(true);
  }, [
    widgetOpen,
    messages.length,
    assistant.streaming,
    guestSending,
    scrollToLatest,
  ]);

  const handleSend = useCallback(
    (value: string) => {
      const question = value.trim();
      if (busy) return;

      if (signedIn) {
        if (!question && !aiFile.attachment) return;
        void assistant.sendMessage(
          question,
          patientUserId ?? undefined,
          aiFile.attachment ?? undefined,
        );
        aiFile.clear();
        return;
      }

      if (!question && !aiFile.attachment) return;
      const attachment = aiFile.attachment;
      aiFile.clear();
      void sendGuestMessage(question, attachment);
    },
    [
      aiFile,
      assistant,
      busy,
      patientUserId,
      sendGuestMessage,
      signedIn,
    ],
  );

  const onNewChat = () => {
    aiFile.clear();
    sentPendingRef.current = true;
    setHistoryOpen(false);
    if (signedIn) {
      assistant.startNewChat();
      return;
    }
    const id = makeGuestConversationId();
    const draft: AiConversation = {
      id,
      title: "New chat",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    persistGuestState([draft, ...guestConversations], id);
  };

  const historyConversations = signedIn
    ? assistant.conversations
    : guestConversations;
  const historyActiveId = signedIn ? assistant.activeId : guestActiveId;
  const historyLoading = signedIn ? assistant.loadingHistory : false;

  const onSelectHistory = (id: string) => {
    setHistoryOpen(false);
    if (signedIn) {
      assistant.setActiveId(id);
      return;
    }
    setGuestActiveId(id);
    void saveGuestActiveConversationId(id);
  };

  const onDeleteHistory = (id: string) => {
    if (signedIn) {
      void assistant.removeConversation(id);
      return;
    }
    const next = guestConversations.filter((c) => c.id !== id);
    const nextActive =
      guestActiveId === id ? (next[0]?.id ?? null) : guestActiveId;
    persistGuestState(next, nextActive);
  };

  const fullScreenPanel = isNative || expanded;
  const panelStyle = fullScreenPanel
    ? {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: windowWidth,
        maxWidth: windowWidth,
        height: windowHeight,
        borderRadius: 0,
        paddingTop: isNative ? insets.top : 0,
        paddingBottom:
          isNative && keyboardVisible ? 0 : isNative ? Math.max(insets.bottom, 8) : 0,
      }
    : isDesktop
      ? {
          top: undefined as number | undefined,
          bottom: Math.max(insets.bottom, 12) + ASK_3ELAGI_AI_FAB_CHROME_GAP,
          ...(isRTL
            ? { left: 16, right: undefined as number | undefined }
            : { right: 16, left: undefined as number | undefined }),
          width: windowWidth * 0.3,
          maxWidth: windowWidth * 0.3,
          height: Math.min(windowHeight * 0.75, 640),
          borderRadius: 18,
        }
      : {
          top: undefined as number | undefined,
          bottom: 0,
          left: 0,
          right: 0,
          width: windowWidth,
          maxWidth: windowWidth,
          height: Math.round(
            Math.min(windowHeight * 0.68, windowHeight - insets.top - 72),
          ),
          borderRadius: 18,
          paddingTop: 12,
          paddingBottom:
            isNative && keyboardVisible ? 0 : Math.max(insets.bottom, 8),
        };

  const webShadow =
    Platform.OS === "web"
      ? ({
          boxShadow: isDesktop
            ? "0 16px 48px rgba(15, 23, 42, 0.22), 0 4px 14px rgba(15, 23, 42, 0.12)"
            : "0 8px 28px rgba(15, 23, 42, 0.18)",
        } as const)
      : null;

  const PanelShell = isNative ? View : KeyboardAvoidingView;
  const panelShellProps = isNative
    ? {}
    : ({ behavior: "padding" as const });

  const guestRemaining = Math.max(0, GUEST_AI_MAX_MESSAGES - guestSentCount);
  const guestQuotaAccent =
    guestRemaining <= 1 ? "#ea580c" : ASK_3ELAGI_AI_FAB_RED;
  const guestQuotaBg =
    guestRemaining <= 1 ? "rgba(234, 88, 12, 0.12)" : "rgba(225, 29, 72, 0.09)";
  const guestQuotaBorder =
    guestRemaining <= 1 ? "rgba(234, 88, 12, 0.28)" : "rgba(225, 29, 72, 0.22)";

  return (
    <PanelShell
      {...panelShellProps}
      style={
        [
          styles.panel,
          panelStyle,
          webShadow,
          Platform.OS === "web" ? ({ position: "fixed" } as const) : null,
        ] as object
      }
    >
      <View
        style={[
          styles.panelInner,
          {
            backgroundColor: colors.card,
            borderColor: ASK_3ELAGI_AI_FAB_RED,
            borderWidth: isDesktop && !fullScreenPanel ? 2 : 0,
            borderRadius: panelStyle.borderRadius,
          },
        ]}
      >
      <View
        style={[
          styles.panelHeader,
          {
            flexDirection: dir,
            borderBottomColor: "rgba(255, 255, 255, 0.22)",
            backgroundColor: ASK_3ELAGI_AI_FAB_RED,
          },
        ]}
      >
        <View style={[styles.headerLeft, { flexDirection: dir, flex: 1 }]}>
          {historyOpen ? (
            <Pressable
              onPress={() => setHistoryOpen(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={isRTL ? "رجوع" : "Back to chat"}
              style={styles.iconBtn}
            >
              <ChevronLeft
                size={20}
                color={ASK_3ELAGI_AI_FAB_ON_RED}
                style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              />
            </Pressable>
          ) : (
            <View
              style={[styles.iconBubble, { backgroundColor: ASK_3ELAGI_AI_FAB_RED_SOFT }]}
            >
              <Bot size={16} color={ASK_3ELAGI_AI_FAB_ON_RED} />
            </View>
          )}
          <Text
            style={[styles.title, { color: ASK_3ELAGI_AI_FAB_ON_RED, flexShrink: 1 }]}
            numberOfLines={1}
          >
            {historyOpen
              ? isRTL
                ? "محادثات الذكاء الاصطناعي"
                : "AI Chats"
              : t.records.ask3elagiAi}
          </Text>
        </View>
        <View style={[styles.headerActions, { flexDirection: dir }]}>
          {!historyOpen ? (
            <Pressable
              onPress={() => setHistoryOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t.tabs.history}
              style={styles.iconBtn}
            >
              <History size={18} color={ASK_3ELAGI_AI_FAB_ON_RED_MUTED} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onNewChat}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t.records.ask3elagiAiNewChat}
            style={[
              styles.newChatBtn,
              { backgroundColor: ASK_3ELAGI_AI_FAB_RED_SOFT, flexDirection: dir },
            ]}
          >
            <Plus size={14} color={ASK_3ELAGI_AI_FAB_ON_RED} />
            {!isDesktop ? null : (
              <Text style={[styles.newChatLabel, { color: ASK_3ELAGI_AI_FAB_ON_RED }]}>
                {t.records.ask3elagiAiNewChat}
              </Text>
            )}
          </Pressable>
          {isDesktop ? (
            <Pressable
              onPress={toggleExpanded}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={expanded ? "Restore panel size" : "Expand panel"}
              style={styles.iconBtn}
            >
              {expanded ? (
                <Minimize2 size={18} color={ASK_3ELAGI_AI_FAB_ON_RED_MUTED} />
              ) : (
                <Maximize2 size={18} color={ASK_3ELAGI_AI_FAB_ON_RED_MUTED} />
              )}
            </Pressable>
          ) : null}
          {isDesktop ? (
            <Pressable
              onPress={closeWidget}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Minimize"
              style={styles.iconBtn}
            >
              <Minimize size={18} color={ASK_3ELAGI_AI_FAB_ON_RED_MUTED} />
            </Pressable>
          ) : (
            <Pressable
              onPress={closeWidget}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.iconBtn}
            >
              <X size={18} color={ASK_3ELAGI_AI_FAB_ON_RED_MUTED} />
            </Pressable>
          )}
        </View>
      </View>

      {historyOpen ? (
        <View style={[styles.historyPane, { backgroundColor: colors.background }]}>
          <AssistantHistoryList
            conversations={historyConversations}
            activeId={historyActiveId}
            loading={historyLoading}
            onSelect={onSelectHistory}
            onNewChat={onNewChat}
            onDelete={onDeleteHistory}
          />
        </View>
      ) : loadingHistory ? (
        <View style={[styles.chatLoading, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          key={signedIn ? (assistant.activeId ?? "new") : (guestActiveId ?? "guest")}
          keyExtractor={(item) => item.id}
          style={[styles.chatList, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.chatListContent}
          onContentSizeChange={onChatContentSizeChange}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          renderItem={({ item }) => (
            <AssistantMessageBubble
              message={item}
              compact
              selfUserId={assistant.selfUserId}
              isRTL={isRTL}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              {t.records.ask3elagiAiPlaceholder}
            </Text>
          }
        />
      )}

      {!historyOpen && !signedIn ? (
        <View
          style={[
            styles.guestQuotaWrap,
            { alignItems: isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <View
            style={[
              styles.guestQuotaPill,
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                backgroundColor: guestQuotaBg,
                borderColor: guestQuotaBorder,
              },
            ]}
          >
            <View
              style={[
                styles.guestQuotaIcon,
                { backgroundColor: `${guestQuotaAccent}18` },
              ]}
            >
              <Sparkles size={14} color={guestQuotaAccent} />
            </View>
            <Text style={[styles.guestQuotaText, { color: guestQuotaAccent }]}>
              {t.ai.guestMessagesLeft(guestRemaining, GUEST_AI_MAX_MESSAGES)}
            </Text>
          </View>
        </View>
      ) : null}

      {!historyOpen ? (
        <KeyboardStickyView enabled={isNative} offset={{ closed: 0, opened: 0 }}>
          <AssistantComposer
            key={signedIn ? (assistant.activeId ?? "widget-new") : "widget-guest"}
            compact
            isRTL={isRTL}
            sending={busy}
            disabled={loadingHistory}
            placeholder={t.records.ask3elagiAiPlaceholder}
            onSend={handleSend}
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
            onScanAiFile={
              aiFile.canScan ? () => void aiFile.scanFile() : undefined
            }
            aiAttachLoading={aiFile.loading}
            onRemoveAiAttachment={aiFile.clear}
          />
        </KeyboardStickyView>
      ) : null}
      </View>
    </PanelShell>
  );
}

/** Global floating Ask 3elagi AI chat — mount once in the root layout. */
export function Ask3elagiAiWidget() {
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { isDesktop, isTablet, isMobile } = useWebLayout();
  const pathname = usePathname();
  const segments = useSegments();
  const sidebarTrigger = ask3elagiAiTriggerInSidebar(isTablet);
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const open = useAsk3elagiAiWidgetStore((s) => s.open);
  const openWidget = useAsk3elagiAiWidgetStore((s) => s.openWidget);
  const closeWidget = useAsk3elagiAiWidgetStore((s) => s.closeWidget);

  const aiEnabled = useAiEnabled();
  const signedIn = hydrated && isSignedIn(profile, accessToken);
  const roleOk =
    ["patient", "doctor", "hospital"].includes(role?.toLowerCase() ?? "");
  /** Guests + patient/doctor/hospital accounts; hide for admin / unsupported roles when signed in. */
  const canUseWidget = (!signedIn || roleOk) && aiEnabled;
  const hidden = shouldHideAsk3elagiAiOnRoute(pathname, segments as string[]);
  // Circle icon-only on native + mobile web; labeled pill on desktop web.
  const iconOnlyFab =
    !sidebarTrigger && (Platform.OS !== "web" || !isDesktop);

  useEffect(() => {
    if (!canUseWidget || hidden) closeWidget();
  }, [canUseWidget, hidden, closeWidget]);

  useEffect(() => {
    setAiWidgetOpen(open);
    return () => setAiWidgetOpen(false);
  }, [open]);

  // Escape key closes the floating AI chat (web / mobile browser).
  useEffect(() => {
    if (Platform.OS !== "web" || !open || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeWidget();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeWidget]);

  if (!hydrated || !canUseWidget || hidden) return null;

  const edge = WEB_FAB_INSET;
  const addBarLift = recordsAddBarFabOffset(
    pathname,
    segments as string[],
    isDesktop,
  );
  const profileLift = profileSaveBarFabOffset(
    pathname,
    segments as string[],
    isDesktop,
    sidebarTrigger,
  );
  const hideFab = hideFabOnChatRoute(pathname, segments as string[]);
  const medicalFormLift = medicalFormSaveBarFabOffset(pathname);
  // Tab screens sit under the bottom bar; lift the FAB clear of it,
  // plus a gap so the two never touch (the base already covers the inset).
  const onNativeTabs =
    Platform.OS !== "web" && (segments as string[]).includes("(tabs)");
  const onMobileWebTabs =
    Platform.OS === "web" &&
    isMobile &&
    mobileWebBottomTabBarVisible(pathname, segments as string[]);
  const nativeTabBarLift = onNativeTabs
    ? NATIVE_TAB_BAR_HEIGHT + ASK_3ELAGI_AI_FAB_TAB_BAR_GAP
    : 0;
  // Mobile web: sit just above the tab bar — its height already includes the
  // safe-area padding, so don't also add the desktop FAB chrome inset.
  const bottom = onMobileWebTabs
    ? mobileWebTabBarHeight(insets.bottom) +
      ASK_3ELAGI_AI_FAB_TAB_BAR_GAP +
      addBarLift +
      profileLift +
      medicalFormLift
    : Math.max(insets.bottom, ASK_3ELAGI_AI_FAB_CHROME_GAP) +
      nativeTabBarLift +
      addBarLift +
      profileLift +
      medicalFormLift;
  // Bottom corner above tab bar: far right in LTR, far left in RTL (Arabic).
  const fabPositionStyle = {
    bottom,
    top: undefined as number | undefined,
    ...(isRTL
      ? { left: edge, right: undefined as number | undefined }
      : { right: edge, left: undefined as number | undefined }),
  };

  const content = (
    <View style={styles.host} pointerEvents="box-none">
      {open ? <Ask3elagiAiPanel /> : null}

      {!open && !hideFab && !sidebarTrigger ? (
        <Pressable
          onPress={() => openWidget(undefined, patientUserIdFromPath(pathname))}
          style={[
            iconOnlyFab ? styles.fabCircle : styles.fab,
            fabPositionStyle,
            {
              backgroundColor: ASK_3ELAGI_AI_FAB_RED,
              shadowColor: ASK_3ELAGI_AI_FAB_RED,
            },
            Platform.OS === "web"
              ? ({ boxShadow: ASK_3ELAGI_AI_FAB_RED_SHADOW } as const)
              : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t.records.ask3elagiAi}
        >
          {iconOnlyFab ? (
            <Bot size={26} color="#fff" />
          ) : (
            <>
              <Bot size={22} color="#fff" />
              <Text style={styles.fabLabel} numberOfLines={1}>
                {t.records.ask3elagiAi}
              </Text>
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );

  return viewportPortal(content);
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    ...(Platform.OS === "web"
      ? ({
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          pointerEvents: "box-none",
        } as const)
      : null),
  },
  fab: {
    position: Platform.OS === "web" ? ("fixed" as const) : "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: ASK_3ELAGI_AI_FAB_SIZE,
    paddingHorizontal: 16,
    borderRadius: 28,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
    zIndex: 10001,
  },
  fabCircle: {
    position: Platform.OS === "web" ? ("fixed" as const) : "absolute",
    width: ASK_3ELAGI_AI_FAB_SIZE,
    height: ASK_3ELAGI_AI_FAB_SIZE,
    borderRadius: ASK_3ELAGI_AI_FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
    zIndex: 10001,
  },
  fabLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    maxWidth: 140,
  },
  panel: {
    position: "absolute",
    // Shadow lives on the outer shell; inner clips rounded corners.
    overflow: "visible",
    shadowColor: "#0f172a",
    shadowOpacity: 0.32,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 28,
  },
  panelInner: {
    flex: 1,
    overflow: "hidden",
  },
  panelHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerLeft: { alignItems: "center", gap: 8, minWidth: 0 },
  headerActions: { alignItems: "center", gap: 4, flexShrink: 0 },
  iconBtn: { padding: 4 },
  newChatBtn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  newChatLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "800" },
  chatList: { flex: 1 },
  chatListContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexGrow: 1,
  },
  chatLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  historyPane: {
    flex: 1,
    minHeight: 0,
  },
  emptyHint: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  guestQuotaWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  guestQuotaPill: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
  },
  guestQuotaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  guestQuotaText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.15,
    flexShrink: 1,
  },
});
