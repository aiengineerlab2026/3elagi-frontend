import { MessageSquare, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { ChatDateSeparator } from "@/components/chat/ChatDateSeparator";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { FullscreenVideoViewer } from "@/components/FullscreenVideoViewer";
import { MedicalRecordPicker } from "@/components/MedicalRecordPicker";
import { useAuthStore } from "@/domains/auth/store";
import {
  connectConversationSocket,
  disconnectConversationSocket,
} from "@/domains/chat/conversationSocket";
import { buildLoggedInUser } from "@/domains/presence/user";
import { useChatStore } from "@/domains/chat/store";
import type {
  ChatMessage,
  MedicalLinkMeta,
  SendMessageInput,
} from "@/domains/chat/types";
import {
  chatListItemKey,
  injectChatDateSeparators,
  type ChatListItem,
} from "@/domains/chat/dateSeparators";
import { fetchAllMedicalHistory } from "@/domains/medical/api";
import type { MedicalRecord } from "@/domains/medical/types";
import { useMedicalStore } from "@/domains/medical/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { chatFlexRow, flexRow } from "@/utils/rtl";
import type { ChatAction } from "@/components/chat/ChatActionsMenu";
import {
  buildChatLatestMessageToken,
  isChatStuckToLatest,
  scrollChatToLatest,
  shouldForceChatScrollOnNewMessage,
} from "@/utils/chatListScroll";

const EMPTY_MESSAGES: ChatMessage[] = [];
const SIDE_PANEL_WIDTH = 380;

interface Props {
  peerId: string;
  peerName: string;
  isDoctor: boolean;
  /** Fixed column beside video (tablet/desktop) or full overlay (mobile). */
  layout: "side" | "overlay";
  /** Doctor-only clinical actions (diagnosis, prescription, lab/x-ray, exam)
   *  surfaced under the composer's "+" — same list the call screen shows. */
  clinicalActions?: ChatAction[];
  onClose?: () => void;
  /** Lift the picker to the video-call root so it sits above the meeting UI. */
  renderMedicalPicker?: (picker: React.ReactNode) => void;
}

export function InMeetingChatPanel({
  peerId,
  peerName,
  isDoctor,
  layout,
  clinicalActions,
  onClose,
  renderMedicalPicker,
}: Props) {
  const colors = useColors();
  const { isRTL, t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const rowDir = chatFlexRow();
  const keyboardVisible = useKeyboardState((s) => s.isVisible);

  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const doctorId = useAuthStore((s) => s.doctorId);
  const specialty = useAuthStore((s) => s.specialty);
  const specialityId = useAuthStore((s) => s.specialityId);

  const messages = useChatStore((s) => s.messages[peerId] ?? EMPTY_MESSAGES);
  const messagesLoading = useChatStore((s) => s.messagesLoading[peerId] ?? false);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);
  const setActiveChatPeerId = useChatStore((s) => s.setActiveChatPeerId);
  const setPeerTyping = useChatStore((s) => s.setPeerTyping);
  const peerTyping = useChatStore((s) => s.peerTyping[peerId] ?? false);
  const addPendingMessage = useChatStore((s) => s.addPendingMessage);
  const failPendingMessage = useChatStore((s) => s.failPendingMessage);

  const medicalRecords = useMedicalStore((s) => s.records);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);

  const [sending, setSending] = useState(false);
  const [medicalPickerOpen, setMedicalPickerOpen] = useState(false);
  const [medicalPickerLoading, setMedicalPickerLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const stickToBottomRef = useRef(true);
  const sendingRef = useRef(false);
  const lastMessageTokenRef = useRef("");

  const isPatient = !isDoctor;
  const patientUserIdForLinks = isDoctor ? peerId : profile?.id;

  const dateLabels = useMemo(
    () => ({ today: t.common.today, yesterday: t.common.yesterday }),
    [t.common.today, t.common.yesterday],
  );
  const listData = useMemo<ChatListItem[]>(
    () =>
      injectChatDateSeparators([...messages].reverse(), locale, dateLabels),
    [messages, locale, dateLabels],
  );
  const listInverted = listData.length > 0;

  const scrollToLatest = useCallback(
    (animated = false) => {
      scrollChatToLatest(listRef, listInverted, animated, {
        shouldContinue: () => stickToBottomRef.current,
      });
    },
    [listInverted],
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (KeyboardController.isVisible()) {
      void KeyboardController.dismiss().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    setActiveChatPeerId(peerId);
    return () => {
      setActiveChatPeerId(null);
      setPeerTyping(peerId, false);
    };
  }, [peerId, setActiveChatPeerId, setPeerTyping]);

  useEffect(() => {
    if (!peerId || !accessToken || !profile?.id) return;
    connectConversationSocket({
      peerId,
      selfId: profile.id,
      accessToken,
      user: buildLoggedInUser(profile, role, specialty, specialityId, doctorId),
    });
    return () => disconnectConversationSocket();
  }, [peerId, accessToken, profile?.id, role, specialty, specialityId, doctorId]);

  useEffect(() => {
    if (!peerId || !accessToken || !profile?.id) return;
    void loadMessages(peerId, accessToken, profile.id);
    void markRead(peerId, accessToken);
  }, [peerId, accessToken, profile?.id, loadMessages, markRead]);

  useEffect(() => {
    lastMessageTokenRef.current = "";
    stickToBottomRef.current = true;
  }, [peerId]);

  useEffect(() => {
    if (messagesLoading) return;
    const token = buildChatLatestMessageToken(messages);
    if (token === lastMessageTokenRef.current) return;

    const prevToken = lastMessageTokenRef.current;
    lastMessageTokenRef.current = token;
    if (messages.length === 0) return;

    const isInitialBatch = prevToken === "" || prevToken === "empty";
    const newest = messages[messages.length - 1];
    const isOwnMessage = newest?.senderId === "me";

    if (shouldForceChatScrollOnNewMessage(isInitialBatch, newest)) {
      stickToBottomRef.current = true;
      scrollToLatest(true);
      return;
    }

    if (!isInitialBatch && !isOwnMessage && !stickToBottomRef.current) return;

    if (isInitialBatch || isOwnMessage) stickToBottomRef.current = true;
    scrollToLatest(!isInitialBatch);
  }, [messages, messagesLoading, scrollToLatest]);

  useEffect(() => {
    if (!keyboardVisible || Platform.OS === "web") return;
    stickToBottomRef.current = true;
    scrollToLatest(false);
  }, [keyboardVisible, scrollToLatest]);

  const loadMedicalRecords = useCallback(async () => {
    if (!accessToken || !profile?.id) return;
    setMedicalPickerLoading(true);
    try {
      const apiRecords = await fetchAllMedicalHistory(profile.id, accessToken, role ?? undefined);
      setRecordsFromApi(apiRecords, profile.id);
    } catch {
      // keep cached records if refresh fails
    } finally {
      setMedicalPickerLoading(false);
    }
  }, [accessToken, profile?.id, role, setRecordsFromApi]);

  const openMedicalPicker = useCallback(() => {
    if (!accessToken || !profile?.id || !isPatient) return;
    setMedicalPickerOpen(true);
    void loadMedicalRecords();
  }, [accessToken, profile?.id, isPatient, loadMedicalRecords]);

  const handleSend = useCallback(
    async (input: SendMessageInput, replaceTempId?: string) => {
      const abortSend = () => {
        if (replaceTempId) failPendingMessage(peerId, replaceTempId);
        throw new Error("SEND_ABORTED");
      };
      if (!accessToken || !profile?.id || sending || sendingRef.current) abortSend();

      sendingRef.current = true;
      setSending(true);
      stickToBottomRef.current = true;
      try {
        await sendMessage(peerId, input, accessToken, profile!.id, role, replaceTempId);
        stickToBottomRef.current = true;
        scrollToLatest(false);
      } catch (e) {
        if (replaceTempId) failPendingMessage(peerId, replaceTempId);
        if ((e as Error).message !== "SEND_ABORTED") {
          Alert.alert(
            isRTL ? "خطأ" : "Error",
            e instanceof Error
              ? e.message
              : isRTL
                ? "تعذر إرسال الرسالة"
                : "Failed to send message",
          );
        }
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [
      accessToken,
      profile?.id,
      sending,
      peerId,
      role,
      sendMessage,
      failPendingMessage,
      isRTL,
      scrollToLatest,
    ],
  );

  const handleMedicalPickerSelect = useCallback(
    async (record: MedicalRecord, note?: string) => {
      const trimmedNote = note?.trim();
      const meta: MedicalLinkMeta = {
        record_type: record.category as MedicalLinkMeta["record_type"],
        record_id: record.id,
        title: record.title,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };

      setMedicalPickerOpen(false);
      await handleSend({
        recipientId: peerId,
        type: "medical_link",
        content: trimmedNote || record.title,
        medicalLink: meta,
      });
    },
    [peerId, handleSend],
  );

  const medicalPickerNode = useMemo(() => {
    if (!isPatient) return null;
    return (
      <MedicalRecordPicker
        visible={medicalPickerOpen}
        records={medicalRecords}
        loading={medicalPickerLoading}
        isRTL={isRTL}
        mode="share"
        onClose={() => setMedicalPickerOpen(false)}
        onSelect={(record, note) => void handleMedicalPickerSelect(record, note)}
      />
    );
  }, [
    isPatient,
    medicalPickerOpen,
    medicalRecords,
    medicalPickerLoading,
    isRTL,
    handleMedicalPickerSelect,
  ]);

  useEffect(() => {
    if (!renderMedicalPicker) return;
    renderMedicalPicker(medicalPickerNode);
    return () => renderMedicalPicker(null);
  }, [renderMedicalPicker, medicalPickerNode]);

  if (!profile?.id || !accessToken) return null;

  const panelWidth =
    layout === "overlay" ? "100%" : SIDE_PANEL_WIDTH;
  const composerBottomInset =
    layout === "overlay" ? Math.max(insets.bottom, 8) : 8;

  const panel = (
    <View
      style={[
        styles.panel,
        layout === "side" ? styles.panelSide : styles.panelOverlay,
        {
          width: panelWidth,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.panelHeader,
          {
            flexDirection: rowDir,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <MessageSquare size={18} color={colors.primary} />
        <View style={styles.panelHeaderText}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]} numberOfLines={1}>
            {isRTL ? "محادثة الاجتماع" : "Meeting chat"}
          </Text>
          <Text
            style={[styles.panelSubtitle, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {peerName}
          </Text>
        </View>
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={styles.closeBtn}
            accessibilityLabel={isRTL ? "إغلاق المحادثة" : "Close chat"}
          >
            <X size={20} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.panelBody}>
        {messagesLoading && messages.length === 0 ? (
          <View style={styles.loadingMessages}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listData}
            inverted={listInverted}
            keyExtractor={chatListItemKey}
            style={[styles.messageList, { backgroundColor: colors.muted }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            scrollEventThrottle={16}
            onScrollBeginDrag={() => {
              stickToBottomRef.current = false;
            }}
            onScroll={(event) => {
              stickToBottomRef.current = isChatStuckToLatest(event, listInverted);
            }}
            onMomentumScrollEnd={(event) => {
              stickToBottomRef.current = isChatStuckToLatest(event, listInverted);
            }}
            onScrollEndDrag={(event) => {
              stickToBottomRef.current = isChatStuckToLatest(event, listInverted);
            }}
            onContentSizeChange={
              Platform.OS === "web"
                ? undefined
                : () => {
                    if (stickToBottomRef.current) scrollToLatest(false);
                  }
            }
            maintainVisibleContentPosition={
              listInverted ? { minIndexForVisible: 0 } : undefined
            }
            contentContainerStyle={
              messages.length === 0
                ? styles.emptyListContent
                : { paddingHorizontal: 12, paddingVertical: 10 }
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
                  {isRTL
                    ? "أرسل رسالة أثناء المكالمة"
                    : "Send a message during the call"}
                </Text>
              </View>
            }
            renderItem={({ item: row }) => {
              if (row.kind === "date") {
                return <ChatDateSeparator label={row.label} />;
              }
              const item = row.message;
              const mine = item.senderId === "me";
              return (
                <View
                  style={[
                    styles.messageColumn,
                    mine ? styles.messageColumnMine : styles.messageColumnTheirs,
                  ]}
                >
                  <ChatMessageBubble
                    item={item}
                    mine={mine}
                    isRTL={isRTL}
                    rowDir={rowDir}
                    patientUserId={patientUserIdForLinks}
                    isDoctor={isDoctor}
                    onImagePress={setFullscreenImage}
                    onVideoPress={setFullscreenVideo}
                  />
                </View>
              );
            }}
          />
        )}

        {peerTyping ? (
          <Text style={[styles.typingHint, { color: colors.mutedForeground }]}>
            {isRTL ? "يكتب…" : "Typing…"}
          </Text>
        ) : null}
      </View>

      <View style={styles.panelFooter}>
        <KeyboardStickyView
          enabled={Platform.OS !== "web"}
          offset={{ closed: 0, opened: 0 }}
        >
          <ChatComposer
            isRTL={isRTL}
            isPatient={isPatient}
            selfId={profile.id}
            accessToken={accessToken}
            peerId={peerId}
            sending={sending}
            bottomInset={composerBottomInset}
            onSend={handleSend}
            onAddPending={(msg) => addPendingMessage(peerId, msg)}
            onFailPending={(tempId) => failPendingMessage(peerId, tempId)}
            onPickMedical={openMedicalPicker}
            actions={clinicalActions}
            canStoreImageInMedicalRecord={isPatient}
            medicalRecordPatientUserId={profile.id}
            disabled={false}
          />
        </KeyboardStickyView>
      </View>

      {!renderMedicalPicker ? medicalPickerNode : null}

      <FullscreenImageViewer uri={fullscreenImage} onClose={() => setFullscreenImage(null)} />
      <FullscreenVideoViewer uri={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
    </View>
  );

  if (layout === "overlay") {
    return (
      <View
        style={[styles.overlayRoot, { flexDirection: flexRow(isRTL) }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[styles.overlayBackdrop, { backgroundColor: "rgba(0,0,0,0.35)" }]}
          onPress={onClose}
          accessibilityLabel={isRTL ? "إغلاق المحادثة" : "Close chat"}
        />
        <View style={[styles.overlayPanelWrap, { paddingTop: insets.top }]}>
          {panel}
        </View>
      </View>
    );
  }

  return panel;
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    flexDirection: "row",
  },
  overlayBackdrop: {
    flex: 1,
  },
  overlayPanelWrap: {
    width: "88%",
    maxWidth: SIDE_PANEL_WIDTH,
    height: "100%",
  },
  panel: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  },
  panelSide: {
    maxWidth: SIDE_PANEL_WIDTH,
    borderStartWidth: 1,
  },
  panelOverlay: {
    borderStartWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  panelHeader: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  panelHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  panelSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
  },
  panelBody: {
    flex: 1,
    minHeight: 0,
  },
  panelFooter: {
    flexShrink: 0,
    marginTop: "auto",
  },
  messageList: {
    flex: 1,
  },
  loadingMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyChat: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  messageColumn: {
    flexShrink: 1,
    maxWidth: "92%",
    marginBottom: 8,
  },
  messageColumnMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  messageColumnTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  typingHint: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
});
