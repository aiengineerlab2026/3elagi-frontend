import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Beaker, Bot, Calendar, ClipboardList, FileText, Pill, ScanLine, ShieldCheck, ShieldOff, Stethoscope } from "lucide-react-native";
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
import { ChatReactionOverlay, type ReactionAnchor } from "@/components/ChatReactionOverlay";
import { Avatar } from "@/components/Avatar";
import { ChatComposer } from "@/components/ChatComposer";
import { ConsultationBar } from "@/components/ConsultationBar";
import { ChatAccessBanner } from "@/components/ChatAccessBanner";
import { BookAppointmentDialog } from "@/components/BookAppointmentDialog";
import { ChatMessageBubble } from "@/components/ChatMessageBubble";
import { ArchivedMessagesToggle } from "@/components/chat/ArchivedMessagesToggle";
import { ChatDateSeparator } from "@/components/chat/ChatDateSeparator";
import { TestPatientThinkingIndicator } from "@/components/chat/TestPatientThinkingIndicator";
import { ChatHeader, chatHeaderSubtitle } from "@/components/chat/ChatHeader";
import type { ChatAction } from "@/components/chat/ChatActionsMenu";
import { DiagnosisChatModal } from "@/components/DiagnosisChatModal";
import { DoctorMedicalRequestDialog } from "@/components/medical/DoctorMedicalRequestDialog";
import { AssignIntakeExamDialog } from "@/components/intake/AssignIntakeExamDialog";
import { AssistantCreateRecordDialog } from "@/components/assistant/AssistantCreateRecordDialog";
import type { MedicalDocumentRequestType } from "@/domains/medical/api";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { FullscreenVideoViewer } from "@/components/FullscreenVideoViewer";
import { MedicalRecordPicker } from "@/components/MedicalRecordPicker";
import { usePresenceStore } from "@/domains/presence/store";
import { fetchAccountProfile } from "@/domains/auth/profile-api";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { applyLivePresence } from "@/domains/chat/presence";
import { useChatStore } from "@/domains/chat/store";
import {
  connectConversationSocket,
  disconnectConversationSocket,
} from "@/domains/chat/conversationSocket";
import { buildLoggedInUser } from "@/domains/presence/user";
import {
  canDoctorViewPatientRecords,
  fetchDoctorPatientAccess,
  type AccessActionType,
  type DoctorPatientAccessStatus,
} from "@/domains/chat/access";
import type { ChatMessage, MedicalLinkMeta, SendMessageInput } from "@/domains/chat/types";
import {
  chatListItemKey,
  injectChatDateSeparators,
  type ChatListItem,
} from "@/domains/chat/dateSeparators";
import {
  mapMessageRow,
  markChatMessageRead,
  markChatMessageUnread,
} from "@/domains/chat/api";
import { sendAppointmentAction } from "@/domains/appointments/api";
import { isAppointmentStartInFuture } from "@/domains/appointments/roomWindow";
import {
  acceptConsultation,
  rejectConsultation,
  reviewConsultationCancel,
  reviewConsultationPayment,
  submitConsultationPaymentProof,
} from "@/domains/consultations/api";
import { pickPaymentReceipt } from "@/utils/pickPaymentReceipt";
import { onChatAccessUpdated } from "@/domains/presence/socket";
import type { MedicalRecord } from "@/domains/medical/types";
import { createDiagnosis, fetchAllMedicalHistory, uploadFile } from "@/domains/medical/api";
import { openAsk3elagiAi } from "@/domains/ai/widget-store";
import { isAppointmentNotFoundError } from "@/domains/chat/appointmentMessages";
import { mapInstance } from "@/domains/intake-exams/api";
import { fetchTestPatientChatStatus, type TestPatientChatStatus } from "@/domains/doctor/testPatientChatApi";
import { registerTourAnchorHandler } from "@/domains/onboarding/tourAnchorActions";
import { useMedicalStore } from "@/domains/medical/store";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { setMessageEmotion } from "@/domains/emotions/api";
import { mapEmotionRows, type MessageEmotionType } from "@/domains/emotions/types";
import { showChatMessageActions } from "@/utils/chatMessageActions";
import {
  buildChatLatestMessageToken,
  isChatStuckToLatest,
  scrollChatToLatest,
  shouldForceChatScrollOnNewMessage,
} from "@/utils/chatListScroll";
import { chatFlexRow, chatLayoutDirection, flexRow } from "@/utils/rtl";
import { webConfirm } from "@/utils/webConfirm";

const EMPTY_MESSAGES: ChatMessage[] = [];

function canReactToMessage(message: ChatMessage): boolean {
  return !message.pending && !message.failed && !message.id.startsWith("pending-");
}

interface ChatScreenProps {
  /** Desktop web layout inside the sidebar shell — native/mobile web omit this. */
  desktopLayout?: boolean;
}

export default function ChatScreen({ desktopLayout = false }: ChatScreenProps) {
  const colors = useColors();
  const { isRTL, t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((s) => s.isVisible);
  const keyboardHeight = useKeyboardState((s) => s.height);
  const [composerFocused, setComposerFocused] = useState(false);
  const role = useAuthStore((s) => s.role);

  // Opening from a push notification can inherit a stale keyboard height — only
  // reserve list padding once the composer is actually focused.
  const layoutKeyboardVisible =
    Platform.OS !== "web" && composerFocused && keyboardVisible;
  const layoutKeyboardHeight = layoutKeyboardVisible ? keyboardHeight : 0;

  // Reset keyboard lift whenever this thread gains focus (e.g. notification tap).
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") return;
      setComposerFocused(false);
      if (KeyboardController.isVisible()) {
        void KeyboardController.dismiss().catch(() => undefined);
      }
    }, []),
  );
  const {
    id: rawPeerId,
    consultationId: rawConsultationId,
    from: rawFrom,
  } = useLocalSearchParams<{
    id: string;
    consultationId?: string;
    from?: string;
  }>();
  const openedFrom = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;
  const id = Array.isArray(rawPeerId) ? rawPeerId[0] : rawPeerId;
  const consultationId = Array.isArray(rawConsultationId)
    ? rawConsultationId[0]
    : rawConsultationId;
  const messages = useChatStore((s) => s.messages[id] ?? EMPTY_MESSAGES);
  const messagesLoading = useChatStore((s) => s.messagesLoading[id] ?? false);
  const conversations = useChatStore((s) => s.conversations);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);
  const resolvePeer = useChatStore((s) => s.resolvePeer);
  const ensureContacts = useChatStore((s) => s.ensureContacts);
  const ensurePeer = useChatStore((s) => s.ensurePeer);
  const setActiveChatPeerId = useChatStore((s) => s.setActiveChatPeerId);
  const setPeerTyping = useChatStore((s) => s.setPeerTyping);
  const peerTyping = useChatStore((s) => s.peerTyping[id ?? ""] ?? false);
  const addPendingMessage = useChatStore((s) => s.addPendingMessage);
  const failPendingMessage = useChatStore((s) => s.failPendingMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const removeAppointmentMessages = useChatStore((s) => s.removeAppointmentMessages);
  const editMessage = useChatStore((s) => s.editMessage);
  const editMedicalMessage = useChatStore((s) => s.editMedicalMessage);
  const updateMessageEmotions = useChatStore((s) => s.updateMessageEmotions);
  const patchMessage = useChatStore((s) => s.patchMessage);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const doctorId = useAuthStore((s) => s.doctorId);
  const specialty = useAuthStore((s) => s.specialty);
  const specialityId = useAuthStore((s) => s.specialityId);
  const medicalRecords = useMedicalStore((s) => s.records);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);
  const notifyMedicalHistoryChanged = useMedicalStore((s) => s.notifyMedicalHistoryChanged);
  const [contactsReady, setContactsReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [medicalPickerOpen, setMedicalPickerOpen] = useState(false);
  const [medicalPickerLoading, setMedicalPickerLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [replacingMedicalMessage, setReplacingMedicalMessage] = useState<ChatMessage | null>(null);
  const [medicalPickerMode, setMedicalPickerMode] = useState<"share" | "replace">("share");
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [documentRequestType, setDocumentRequestType] =
    useState<MedicalDocumentRequestType | null>(null);
  const [intakeExamModalOpen, setIntakeExamModalOpen] = useState(false);
  const [assigningIntakeExam, setAssigningIntakeExam] = useState(false);
  const [createMedicalRecordOpen, setCreateMedicalRecordOpen] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<ChatMessage | null>(null);
  const [reactionAnchor, setReactionAnchor] = useState<ReactionAnchor | null>(null);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [accessStatus, setAccessStatus] = useState<DoctorPatientAccessStatus | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);
  const [appointmentActionBusy, setAppointmentActionBusy] = useState(false);
  /** Appointment being moved, and the doctor's own entity id for slot lookups. */
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<
    string | null
  >(null);
  const [selfDoctorEntityId, setSelfDoctorEntityId] = useState<string | null>(null);
  const [testPatientStatus, setTestPatientStatus] = useState<TestPatientChatStatus | null>(null);
  const [testPatientThinking, setTestPatientThinking] = useState(false);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const chatBodyRef = useRef<View>(null);
  const sendingRef = useRef(false);
  const messageAnchorsRef = useRef<Map<string, View>>(new Map());
  const stickToBottomRef = useRef(true);
  const lastMessageTokenRef = useRef("");
  // Only this peer's presence matters here. Subscribing to the whole users map
  // re-rendered the entire chat every time *any* user in the app logged in/out.
  const peerOnline = usePresenceStore((s) => !!s.users[id ?? ""]);

  const peerCacheTick = useChatStore((s) => s.peerCacheTick);
  // `messages` is deliberately not a dep — resolvePeer never reads it, and it
  // rebuilt `peer` (a fresh object) on every single incoming message.
  const peer = useMemo(() => {
    if (!id) return undefined;
    const resolved = resolvePeer(id);
    return resolved ? applyLivePresence(resolved) : undefined;
  }, [id, resolvePeer, conversations, contactsReady, peerOnline, peerCacheTick]);

  useEffect(() => {
    if (!id || !accessToken || peer?.photoUrl) return;
    void ensurePeer(id, accessToken);
  }, [id, accessToken, peer?.photoUrl, ensurePeer]);

  const isDoctor = role?.toLowerCase() === "doctor";
  const isPatient = role?.toLowerCase() === "patient";
  const isAdmin = role?.toLowerCase() === "admin";
  const isDemoPatientChat = isDoctor && !!testPatientStatus?.is_test_patient;
  const canOpenPatientRecord =
    isDoctor &&
    peer?.role === "patient" &&
    (isDemoPatientChat || canDoctorViewPatientRecords(accessStatus));

  const openPatientRecord = useCallback(() => {
    if (!id || !isDoctor || peer?.role !== "patient") return;
    if (!isDemoPatientChat && !canDoctorViewPatientRecords(accessStatus)) {
      Alert.alert(
        isRTL ? "لا يوجد صلاحية" : "No access",
        isRTL
          ? "المريض لم يمنحك صلاحية عرض السجل الطبي بعد."
          : "The patient has not granted permission to view medical records yet.",
      );
      return;
    }
    router.push({
      pathname: "/patients/[userId]",
      params: { userId: id, name: peer?.name ?? "" },
    });
  }, [id, isDoctor, peer?.role, peer?.name, accessStatus, isDemoPatientChat, isRTL, router]);

  useEffect(() => {
    if (!canOpenPatientRecord) return;
    return registerTourAnchorHandler("chat-view-records", openPatientRecord);
  }, [canOpenPatientRecord, openPatientRecord]);

  const isDoctorPatientChat =
    (isDoctor && peer?.role === "patient") || (isPatient && peer?.role === "doctor");
  const isDoctorDoctorChat = isDoctor && peer?.role === "doctor";
  const latestConsultationAction = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.type === "consultation_action" && m.consultationAction) {
        return m.consultationAction;
      }
    }
    return null;
  }, [messages]);
  const [consultationOpen, setConsultationOpen] = useState(false);
  // Start / end consultation live in the plus menu, published by ConsultationBar.
  const [consultationMenuActions, setConsultationMenuActions] = useState<ChatAction[]>([]);
  const [activeConsultationId, setActiveConsultationId] = useState<string | undefined>();

  // Stable identity: ConsultationBar re-runs its sync effect on every callback change.
  const handleConsultationActiveChange = useCallback(
    (c: { id: string } | null) => setActiveConsultationId(c?.id),
    [],
  );
  /** Previous consultations' messages — collapsed by default under a toggle. */
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  // Doctor↔patient can only message while a consultation is open — except AI demo patient.
  const needsConsultation = isDoctorPatientChat && !consultationOpen && !isDemoPatientChat;
  const canUseDiagnosisTemplates =
    canOpenPatientRecord && (consultationOpen || isDemoPatientChat);
  const chatBlocked = !!accessStatus?.is_blocked;
  const patientUserIdForLinks =
    isDoctor && peer?.role === "patient" ? peer.id : undefined;
  const canOpenSharedMedicalLinks =
    isDoctor && peer?.role === "patient"
      ? (isDemoPatientChat || !!accessStatus?.records_allowed) && !accessStatus?.is_blocked
      : isDoctorDoctorChat
        ? false
        : true;
  const canAddMedicalRecord =
    !chatBlocked &&
    (isPatient || (isDoctor && !!accessStatus?.records_allowed));
  const medicalRecordPatientUserId = isDoctor ? id : profile?.id;

  useFocusEffect(
    useCallback(() => {
      if (!accessToken || !id) return;
      const peerId = id;
      const cachedPeer = resolvePeer(peerId);
      const hasCachedPeer =
        !!cachedPeer?.name?.trim() && cachedPeer.name !== "…";
      if (!hasCachedPeer) {
        setContactsReady(false);
      }
      void (async () => {
        await Promise.allSettled([
          ensureContacts(accessToken, role),
          ensurePeer(peerId, accessToken),
        ]);
        setContactsReady(true);
      })();
    }, [accessToken, id, role, ensureContacts, ensurePeer, resolvePeer]),
  );

  useEffect(() => {
    if (!id) return;
    setActiveChatPeerId(id);
    setTestPatientThinking(false);
    return () => {
      setActiveChatPeerId(null);
      setPeerTyping(id, false);
      setTestPatientThinking(false);
    };
  }, [id, setActiveChatPeerId, setPeerTyping]);

  // Each open conversation gets its own dedicated socket (separate from the
  // presence/main socket), connected while this screen is open.
  useEffect(() => {
    if (!id || !accessToken || !profile?.id) return;
    connectConversationSocket({
      peerId: id,
      selfId: profile.id,
      accessToken,
      user: buildLoggedInUser(profile, role, specialty, specialityId, doctorId),
    });
    return () => disconnectConversationSocket();
  }, [id, accessToken, profile?.id, role, specialty, specialityId, doctorId]);

  useEffect(() => {
    if (!id || !accessToken || !profile?.id) return;
    void loadMessages(id, accessToken, profile.id);
    void markRead(id, accessToken);
  }, [id, accessToken, profile?.id, loadMessages, markRead]);

  useEffect(() => {
    if (!id || !accessToken || !isDoctorPatientChat) {
      setAccessStatus(null);
      return;
    }

    let cancelled = false;
    setAccessLoading(true);
    void fetchDoctorPatientAccess(accessToken, id)
      .then((status) => {
        if (!cancelled) setAccessStatus(status);
      })
      .catch(() => {
        if (!cancelled) setAccessStatus(null);
      })
      .finally(() => {
        if (!cancelled) setAccessLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, accessToken, isDoctorPatientChat]);

  useEffect(() => {
    if (!id || !accessToken || !isDoctor || !isDoctorPatientChat) {
      setTestPatientStatus(null);
      return;
    }
    let cancelled = false;
    void fetchTestPatientChatStatus(accessToken, id)
      .then((status) => {
        if (cancelled) return;
        setTestPatientStatus(status);
        if (status.is_test_patient) {
          void fetchDoctorPatientAccess(accessToken, id)
            .then((access) => {
              if (!cancelled) setAccessStatus(access);
            })
            .catch(() => undefined);
        }
      })
      .catch(() => {
        if (!cancelled) setTestPatientStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, accessToken, isDoctor, isDoctorPatientChat, messages.length]);

  useEffect(() => {
    if (!testPatientThinking || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.senderId !== "me" && !latest.pending && !latest.failed) {
      setTestPatientThinking(false);
    }
  }, [messages, testPatientThinking]);

  useEffect(() => {
    if (!id || !accessToken || !isDoctor || !isDemoPatientChat) return;
    void fetchAllMedicalHistory(id, accessToken, role ?? undefined).then((rows) =>
      setRecordsFromApi(rows, id),
    );
  }, [id, accessToken, isDoctor, isDemoPatientChat, role, setRecordsFromApi]);

  useEffect(() => {
    if (!id) return;
    onChatAccessUpdated((payload) => {
      if (payload.peer_id === id) setAccessStatus(payload.status);
    });
    return () => onChatAccessUpdated(null);
  }, [id]);

  // Consultation start grants record access on the server — refresh in case the
  // socket event was missed while the app was backgrounded.
  useEffect(() => {
    if (!id || !accessToken || !isDoctorPatientChat || !consultationOpen) return;
    void fetchDoctorPatientAccess(accessToken, id)
      .then(setAccessStatus)
      .catch(() => undefined);
  }, [id, accessToken, isDoctorPatientChat, consultationOpen, activeConsultationId]);

  const chatMessages = useMemo(() => [...messages].reverse(), [messages]);

  // When a consultation is open, everything before its "start" card is archived.
  const archiveSplit = useMemo(() => {
    if (!isDoctorPatientChat || !consultationOpen || !activeConsultationId) {
      return null;
    }
    const startIdx = messages.findIndex(
      (m) =>
        m.type === "consultation_action" &&
        m.consultationAction?.action === "start" &&
        m.consultationAction.consultation_id === activeConsultationId,
    );
    if (startIdx <= 0) return null;
    return {
      archived: messages.slice(0, startIdx),
      current: messages.slice(startIdx),
    };
  }, [
    messages,
    isDoctorPatientChat,
    consultationOpen,
    activeConsultationId,
  ]);

  const dateLabels = useMemo(
    () => ({ today: t.common.today, yesterday: t.common.yesterday }),
    [t.common.today, t.common.yesterday],
  );

  const listData = useMemo((): ChatListItem[] => {
    if (!archiveSplit) {
      return injectChatDateSeparators(chatMessages, locale, dateLabels);
    }
    const currentRev = [...archiveSplit.current].reverse();
    if (!archiveExpanded) {
      return injectChatDateSeparators(currentRev, locale, dateLabels);
    }
    const archivedRev = [...archiveSplit.archived].reverse();
    // Inverted list: archived block sits above current messages; toggle is ListFooter (visual top).
    return injectChatDateSeparators([...currentRev, ...archivedRev], locale, dateLabels);
  }, [archiveSplit, archiveExpanded, chatMessages, locale, dateLabels]);

  useEffect(() => {
    setArchiveExpanded(false);
  }, [activeConsultationId, id]);

  const scrolledConsultationRef = useRef<string | null>(null);
  const [highlightConsultationId, setHighlightConsultationId] = useState<string | null>(null);
  const latestAppointmentMessageIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages) {
      const apptId = message.appointmentAction?.appointment_id;
      if (apptId) map.set(apptId, message.id);
    }
    return map;
  }, [messages]);
  const appointmentStatuses = useMemo(() => {
    const map = new Map<
      string,
      { status: string; meetingLink?: string | null; pendingBy?: string | null }
    >();
    for (const message of messages) {
      if (message.type !== "appointment_action" || !message.appointmentAction) continue;
      const meta = message.appointmentAction;
      map.set(meta.appointment_id, {
        status: meta.status ?? "pending",
        meetingLink: meta.meeting_link,
        pendingBy: meta.pending_by ?? null,
      });
    }
    return map;
  }, [messages]);
  /** Unanswered reschedule/cancel request per appointment → message id. */
  const openAppointmentChangeRequests = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages) {
      const meta = message.appointmentAction;
      if (!meta) continue;
      const apptId = meta.appointment_id;
      if (meta.action === "reschedule_request" || meta.action === "cancel_request") {
        map.set(apptId, message.id);
      }
      if (
        meta.action === "reschedule_accepted" ||
        meta.action === "reschedule_declined" ||
        meta.action === "cancel_approved" ||
        meta.action === "cancel_declined"
      ) {
        map.delete(apptId);
      }
    }
    return map;
  }, [messages]);
  // A request stops being answerable once any later action lands on it.
  const answeredConsultations = useMemo(() => {
    const set = new Set<string>();
    for (const message of messages) {
      const meta = message.consultationAction;
      if (!meta || meta.action === "start") continue;
      set.add(meta.consultation_id);
    }
    return set;
  }, [messages]);

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
    lastMessageTokenRef.current = "";
    stickToBottomRef.current = true;
  }, [id]);

  useEffect(() => {
    if (!id) {
      lastMessageTokenRef.current = "";
      return;
    }
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

    if (isInitialBatch || isOwnMessage) {
      stickToBottomRef.current = true;
    }
    scrollToLatest(!isInitialBatch);
  }, [id, messages, messagesLoading, scrollToLatest]);

  // Opening the keyboard means the user is about to type — put them on the
  // newest message, whatever they had scrolled to.
  useEffect(() => {
    if (!layoutKeyboardVisible || Platform.OS === "web") return;
    stickToBottomRef.current = true;
    scrollToLatest(false);
  }, [layoutKeyboardVisible, scrollToLatest]);

  // Deep-link from the doctor's consultation list: scroll to and highlight it.
  useEffect(() => {
    if (!consultationId || messagesLoading) return;
    if (scrolledConsultationRef.current === consultationId) return;
    const index = listData.findIndex(
      (row) =>
        row.kind === "message" &&
        row.message.consultationAction?.consultation_id === consultationId,
    );
    if (index < 0) {
      // Message may be in the collapsed archive — expand so we can scroll to it.
      if (archiveSplit) setArchiveExpanded(true);
      return;
    }
    scrolledConsultationRef.current = consultationId;
    stickToBottomRef.current = false;
    setHighlightConsultationId(consultationId);
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
      } catch {
        // ignore — onScrollToIndexFailed will retry
      }
    });
    const t = setTimeout(() => setHighlightConsultationId(null), 3000);
    return () => clearTimeout(t);
  }, [consultationId, messagesLoading, listData, archiveSplit]);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  const openDoctorProfile = () => {
    if (!isPatient || peer?.role !== "doctor" || !id) return;
    const entityId = peer.doctorEntityId;
    if (!entityId) {
      Alert.alert(
        isRTL ? "تعذر فتح الملف" : "Could not open profile",
        isRTL ? "بيانات الطبيب غير متوفرة." : "Doctor profile data is unavailable.",
      );
      return;
    }
    router.push({
      pathname: "/doctor/[doctorId]",
      params: { doctorId: entityId, userId: id },
    });
  };

  const closeReactionPicker = useCallback(() => {
    setReactionTarget(null);
    setReactionAnchor(null);
  }, []);

  const showReactionPicker = useCallback((item: ChatMessage) => {
    const node = messageAnchorsRef.current.get(item.id);
    const body = chatBodyRef.current;
    if (!node || !body) {
      setReactionTarget(item);
      setReactionAnchor(null);
      return;
    }

    body.measureInWindow((bodyX, bodyY) => {
      node.measureInWindow((x, y, width, height) => {
        setReactionTarget(item);
        setReactionAnchor({
          top: y - bodyY + height + 6,
          left: x - bodyX,
          width,
          mine: item.senderId === "me",
        });
      });
    });
  }, []);

  const openMessageActions = (item: ChatMessage) => {
    if (!id || !accessToken || !profile?.id) return;
    if (item.pending || item.failed || item.id.startsWith("pending-")) return;

    showChatMessageActions({
      message: item,
      isRTL,
      onEditText:
        item.senderId === "me" ? () => setEditingMessage(item) : undefined,
      onChangeRecord:
        item.senderId === "me"
          ? () => void openMedicalPickerForReplace(item)
          : undefined,
      onDelete:
        item.senderId === "me"
          ? () => {
              void deleteMessage(id, item.id, accessToken, profile.id, role).catch(
                () => {
                  Alert.alert(
                    isRTL ? "تعذر الحذف" : "Could not delete",
                    isRTL ? "حاول مرة أخرى." : "Please try again.",
                  );
                },
              );
            }
          : undefined,
      onToggleRead:
        item.senderId !== "me"
          ? () => {
              void (async () => {
                try {
                  const next = item.readAt
                    ? await markChatMessageUnread(
                        accessToken,
                        item.id,
                        id,
                        profile.id,
                      )
                    : await markChatMessageRead(
                        accessToken,
                        item.id,
                        id,
                        profile.id,
                      );
                  patchMessage(item.id, { readAt: next.readAt ?? null });
                } catch (e) {
                  Alert.alert(
                    isRTL ? "تعذر التحديث" : "Could not update",
                    e instanceof Error
                      ? e.message
                      : isRTL
                        ? "حاول مرة أخرى."
                        : "Please try again.",
                  );
                }
              })();
            }
          : undefined,
    });
  };

  const handleToggleEmotion = useCallback(
    async (message: ChatMessage, emotion: MessageEmotionType) => {
      if (!accessToken) return;
      try {
        const result = await setMessageEmotion(
          accessToken,
          message.id,
          "chat",
          emotion,
        );
        updateMessageEmotions(message.id, mapEmotionRows(result.emotions));
      } catch (e) {
        Alert.alert(
          isRTL ? "تعذر الإضافة" : "Could not react",
          e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
        );
      } finally {
        closeReactionPicker();
      }
    },
    [accessToken, isRTL, updateMessageEmotions, closeReactionPicker],
  );

  const handleEditMessage = async (messageId: string, content: string) => {
    if (!id || !accessToken || !profile?.id) return;
    try {
      await editMessage(id, messageId, content, accessToken, profile.id, role);
      setEditingMessage(null);
    } catch (e) {
      Alert.alert(
        isRTL ? "تعذر التعديل" : "Could not edit",
        e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    }
  };

  const handleSend = async (input: SendMessageInput, replaceTempId?: string) => {
    const abortSend = () => {
      if (replaceTempId && id) failPendingMessage(id, replaceTempId);
      throw new Error("SEND_ABORTED");
    };

    if (!id || !accessToken || !profile?.id || sending || sendingRef.current) abortSend();

    sendingRef.current = true;
    setSending(true);
    // Sending always lands you on your own message. Pinned here rather than
    // left to the message effect alone: clearing a multi-line composer resizes
    // the footer mid-scroll, and that transient can clear the stick flag and
    // cancel the pending retry.
    stickToBottomRef.current = true;
    try {
      await sendMessage(id, input, accessToken, profile!.id, role, replaceTempId);
      if (
        isDemoPatientChat &&
        (typeof input === "string" ||
          input.type === "text" ||
          (input.type === undefined && !!input.content?.trim()))
      ) {
        setTestPatientThinking(true);
      }
      stickToBottomRef.current = true;
      scrollToLatest(false);
    } catch (e) {
      if (replaceTempId) failPendingMessage(id, replaceTempId);
      if ((e as Error).message !== "SEND_ABORTED") {
        Alert.alert(
          isRTL ? "خطأ" : "Error",
          e instanceof Error ? e.message : isRTL ? "تعذر إرسال الرسالة" : "Failed to send message",
        );
      }
      throw e;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const loadMedicalRecords = async () => {
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
  };

  const closeMedicalPicker = () => {
    setMedicalPickerOpen(false);
    setMedicalPickerMode("share");
    setReplacingMedicalMessage(null);
  };

  const openMedicalPicker = async () => {
    if (!accessToken || !profile?.id || !isPatient) return;
    setMedicalPickerMode("share");
    setReplacingMedicalMessage(null);
    setMedicalPickerOpen(true);
    await loadMedicalRecords();
  };

  const openMedicalPickerForReplace = async (message: ChatMessage) => {
    if (!accessToken || !profile?.id || !isPatient || message.type !== "medical_link") return;
    setReplacingMedicalMessage(message);
    setMedicalPickerMode("replace");
    setMedicalPickerOpen(true);
    await loadMedicalRecords();
  };

  const handleMedicalPickerSelect = async (record: MedicalRecord, note?: string) => {
    const trimmedNote = note?.trim();
    const meta: MedicalLinkMeta = {
      record_type: record.category as MedicalLinkMeta["record_type"],
      record_id: record.id,
      title: record.title,
      ...(trimmedNote ? { note: trimmedNote } : {}),
    };

    if (replacingMedicalMessage && id && accessToken && profile?.id) {
      closeMedicalPicker();
      try {
        await editMedicalMessage(
          id,
          replacingMedicalMessage.id,
          meta,
          trimmedNote,
          record.title,
          accessToken,
          profile.id,
          role,
        );
      } catch (e) {
        Alert.alert(
          isRTL ? "تعذر التحديث" : "Could not update",
          e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
        );
      }
      return;
    }

    closeMedicalPicker();
    await handleSend({
      recipientId: id!,
      type: "medical_link",
      content: trimmedNote || record.title,
      medicalLink: meta,
    });
  };

  const openDiagnosisModal = () => {
    if (!canUseDiagnosisTemplates) return;
    setDiagnosisModalOpen(true);
  };

  const openPrescriptionScreen = () => {
    if (!id || !canUseDiagnosisTemplates) return;
    router.push({
      pathname: "/medical/prescription/add",
      // Saving or cancelling returns here, not to the records list.
      params: { patientUserId: id, returnTo: `/chat/${id}` },
    });
  };

  const handleAccessAction = async (action: AccessActionType) => {
    if (!id || !accessToken || !profile?.id || sending) return;

    const confirmBlock =
      action === "patient_block" || action === "doctor_block"
        ? await new Promise<boolean>((resolve) => {
            Alert.alert(
              isRTL ? "تأكيد الحظر" : "Confirm block",
              isRTL
                ? "لن تتمكن من إرسال رسائل جديدة حتى يُرفع الحظر."
                : "You will not be able to send new messages until the block is lifted.",
              [
                { text: isRTL ? "إلغاء" : "Cancel", style: "cancel", onPress: () => resolve(false) },
                {
                  text: isRTL ? "حظر" : "Block",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ],
            );
          })
        : true;

    if (!confirmBlock) return;

    if (action === "revoke_records") {
      const title = isRTL ? "إلغاء صلاحية السجل" : "Revoke record access";
      const message = isRTL
        ? "لن يتمكن الطبيب من عرض أو تعديل سجلك الطبي بعد الإلغاء."
        : "The doctor will no longer be able to view or edit your medical records.";
      const confirmed =
        Platform.OS === "web"
          ? webConfirm(title, message)
          : await new Promise<boolean>((resolve) => {
              Alert.alert(title, message, [
                { text: isRTL ? "إلغاء" : "Cancel", style: "cancel", onPress: () => resolve(false) },
                {
                  text: isRTL ? "إلغاء الصلاحية" : "Revoke",
                  style: "destructive",
                  onPress: () => resolve(true),
                },
              ]);
            });
      if (!confirmed) return;
    }

    if (action === "grant_records") {
      const title = isRTL ? "منح صلاحية السجل" : "Grant record access";
      const message = isRTL
        ? "سيتمكن الطبيب من عرض وتعديل سجلك الطبي."
        : "The doctor will be able to view and edit your medical records.";
      const confirmed =
        Platform.OS === "web"
          ? webConfirm(title, message)
          : await new Promise<boolean>((resolve) => {
              Alert.alert(title, message, [
                { text: isRTL ? "إلغاء" : "Cancel", style: "cancel", onPress: () => resolve(false) },
                {
                  text: isRTL ? "منح" : "Grant",
                  onPress: () => resolve(true),
                },
              ]);
            });
      if (!confirmed) return;
    }

    setSending(true);
    try {
      await sendMessage(
        id,
        { recipientId: id, type: "access_action", accessAction: { action } },
        accessToken,
        profile.id,
        role,
      );
      const status = await fetchDoctorPatientAccess(accessToken, id);
      setAccessStatus(status);
    } catch (e) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : isRTL ? "تعذر تنفيذ الإجراء" : "Action failed",
      );
    } finally {
      setSending(false);
    }
  };

  const handleAppointmentAction = async (
    appointmentId: string,
    action: "confirm" | "reject" | "cancel",
  ) => {
    if (!id || !accessToken || !profile?.id || appointmentActionBusy) return;

    if (action === "cancel") {
      const ok =
        Platform.OS === "web"
          ? confirm(isRTL ? "هل تريد إلغاء هذا الموعد؟" : "Cancel this appointment?")
          : await new Promise<boolean>((resolve) => {
              Alert.alert(
                isRTL ? "إلغاء الموعد" : "Cancel appointment",
                isRTL ? "هل تريد إلغاء هذا الموعد؟" : "Cancel this appointment?",
                [
                  {
                    text: isRTL ? "لا" : "No",
                    style: "cancel",
                    onPress: () => resolve(false),
                  },
                  {
                    text: isRTL ? "نعم" : "Yes",
                    style: "destructive",
                    onPress: () => resolve(true),
                  },
                ],
              );
            });
      if (!ok) return;
    }

    setAppointmentActionBusy(true);
    try {
      const row = await sendAppointmentAction(accessToken, id, {
        appointment_id: appointmentId,
        action,
        date: "",
        time: "",
      });
      const msg = mapMessageRow(row, id, profile.id);
      useChatStore.setState((s) => {
        const thread = s.messages[id] ?? [];
        if (thread.some((m) => m.id === msg.id)) return s;
        return {
          messages: { ...s.messages, [id]: [...thread, msg] },
        };
      });
    } catch (e) {
      if (isAppointmentNotFoundError(e)) {
        removeAppointmentMessages(id, appointmentId);
      }
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : isRTL ? "تعذر تحديث الموعد" : "Could not update appointment",
      );
    } finally {
      setAppointmentActionBusy(false);
    }
  };

  const [consultationActionBusy, setConsultationActionBusy] = useState(false);

  /** Doctor answers a pending consultation request from the thread. */
  /**
   * Land on the newest message. Consultation actions are taken from a bubble
   * further up the thread, which clears the stick-to-bottom flag, so the
   * resulting message would otherwise arrive off-screen.
   */
  const jumpToLatest = useCallback(() => {
    stickToBottomRef.current = true;
    scrollToLatest(true);
  }, [scrollToLatest]);

  const handleConsultationAction = async (
    consultationId: string,
    action: "accept" | "accept_paid" | "reject",
  ) => {
    if (!accessToken || consultationActionBusy) return;
    setConsultationActionBusy(true);
    try {
      if (action === "accept" || action === "accept_paid") {
        await acceptConsultation(
          consultationId,
          accessToken,
          action === "accept_paid",
        );
      } else {
        await rejectConsultation(consultationId, accessToken);
      }
      // The API posts the answer into the thread; the socket brings it back.
      jumpToLatest();
    } catch (e) {
      Alert.alert(
        isRTL ? "تعذر الرد" : "Could not answer",
        e instanceof Error
          ? e.message
          : isRTL
            ? "حاول مرة أخرى."
            : "Please try again.",
      );
    } finally {
      setConsultationActionBusy(false);
    }
  };

  /**
   * Money changes hands outside the app: the patient uploads the receipt, the
   * doctor approves it, and only then does the visit or chat open.
   */
  const handlePaymentReply = async (
    target: { kind: "appointment" | "consultation"; id: string },
    reply: "submit" | "approve" | "reject",
  ) => {
    if (!accessToken || !id || !profile?.id) return;
    const busy =
      target.kind === "consultation" ? consultationActionBusy : appointmentActionBusy;
    if (busy) return;
    const setBusy =
      target.kind === "consultation"
        ? setConsultationActionBusy
        : setAppointmentActionBusy;

    if (reply === "submit") {
      const asset = await pickPaymentReceipt();
      if (!asset) return;
      setBusy(true);
      try {
        const uploaded = await uploadFile(
          asset.uri,
          asset.mimeType ?? "image/jpeg",
          asset.name || `receipt-${Date.now()}`,
          accessToken,
          asset.file,
        );
        const proofUrl = uploaded.url;

        if (target.kind === "consultation") {
          await submitConsultationPaymentProof(target.id, proofUrl, accessToken);
        } else {
          const row = await sendAppointmentAction(accessToken, id, {
            appointment_id: target.id,
            action: "payment_submitted",
            date: "",
            time: "",
            payment_proof_url: proofUrl,
          });
          const msg = mapMessageRow(row, id, profile.id);
          useChatStore.setState((s) => {
            const thread = s.messages[id] ?? [];
            if (thread.some((m) => m.id === msg.id)) return s;
            return { messages: { ...s.messages, [id]: [...thread, msg] } };
          });
        }
        jumpToLatest();
      } catch (e) {
        if (target.kind === "appointment" && isAppointmentNotFoundError(e)) {
          removeAppointmentMessages(id, target.id);
        }
        Alert.alert(
          isRTL ? "خطأ" : "Error",
          e instanceof Error
            ? e.message
            : isRTL
              ? "تعذر تحديث الدفع"
              : "Could not update the payment",
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      if (target.kind === "consultation") {
        await reviewConsultationPayment(target.id, reply === "approve", accessToken);
      } else {
        const row = await sendAppointmentAction(accessToken, id, {
          appointment_id: target.id,
          action: reply === "approve" ? "payment_approved" : "payment_rejected",
          date: "",
          time: "",
        });
        const msg = mapMessageRow(row, id, profile.id);
        useChatStore.setState((s) => {
          const thread = s.messages[id] ?? [];
          if (thread.some((m) => m.id === msg.id)) return s;
          return { messages: { ...s.messages, [id]: [...thread, msg] } };
        });
      }
      jumpToLatest();
    } catch (e) {
      if (target.kind === "appointment" && isAppointmentNotFoundError(e)) {
        removeAppointmentMessages(id, target.id);
      }
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error
          ? e.message
          : isRTL
            ? "تعذر تحديث الدفع"
            : "Could not update the payment",
      );
    } finally {
      setBusy(false);
    }
  };

  /**
   * Answering a proposed new slot or a cancellation request. Nothing has
   * changed server-side until this call lands.
   */
  const handleChangeReply = async (
    target: {
      kind: "appointment" | "consultation";
      id: string;
      change: "reschedule" | "cancel";
    },
    reply: "accept" | "decline",
  ) => {
    if (!accessToken || !id || !profile?.id) return;
    const busy =
      target.kind === "consultation" ? consultationActionBusy : appointmentActionBusy;
    if (busy) return;
    const setBusy =
      target.kind === "consultation"
        ? setConsultationActionBusy
        : setAppointmentActionBusy;

    setBusy(true);
    try {
      if (target.kind === "consultation") {
        await reviewConsultationCancel(target.id, reply === "accept", accessToken);
      } else {
        const action =
          target.change === "reschedule"
            ? reply === "accept"
              ? "reschedule_accepted"
              : "reschedule_declined"
            : reply === "accept"
              ? "cancel_approved"
              : "cancel_declined";
        const row = await sendAppointmentAction(accessToken, id, {
          appointment_id: target.id,
          action,
          date: "",
          time: "",
        });
        const msg = mapMessageRow(row, id, profile.id);
        useChatStore.setState((s) => {
          const thread = s.messages[id] ?? [];
          if (thread.some((m) => m.id === msg.id)) return s;
          return { messages: { ...s.messages, [id]: [...thread, msg] } };
        });
      }
      jumpToLatest();
    } catch (e) {
      if (target.kind === "appointment" && isAppointmentNotFoundError(e)) {
        removeAppointmentMessages(id, target.id);
      }
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error
          ? e.message
          : isRTL
            ? "تعذر تحديث الطلب"
            : "Could not answer the request",
      );
    } finally {
      setBusy(false);
    }
  };

  /** Either side can propose a new slot; the other confirms it. */
  const openReschedule = useCallback(
    async (appointmentId: string) => {
      const latestMsgId = latestAppointmentMessageIds.get(appointmentId);
      const latestMeta = messages.find((m) => m.id === latestMsgId)?.appointmentAction;
      if (!isAppointmentStartInFuture(latestMeta?.date ?? "", latestMeta?.time ?? null)) {
        Alert.alert(
          isRTL ? "غير متاح" : "Not available",
          isRTL
            ? "لا يمكن تغيير الموعد بعد بدء الاجتماع"
            : "The meeting time cannot be changed after it has started",
        );
        return;
      }
      setRescheduleAppointmentId(appointmentId);
      // The picker reads the doctor's schedule; a doctor needs their own id.
      if (isDoctor && !selfDoctorEntityId && accessToken && role) {
        try {
          const account = await fetchAccountProfile(accessToken, role);
          setSelfDoctorEntityId(account.doctorEntityId ?? null);
        } catch {
          // Falls back to no slots; the dialog shows its own error.
        }
      }
    },
    [isDoctor, selfDoctorEntityId, accessToken, role, isRTL, latestAppointmentMessageIds, messages],
  );

  const submitReschedule = async (date: string, time: string) => {
    if (!accessToken || !id || !profile?.id || !rescheduleAppointmentId) return;
    const row = await sendAppointmentAction(accessToken, id, {
      appointment_id: rescheduleAppointmentId,
      action: "reschedule_request",
      date: "",
      time: "",
      proposed_date: date,
      proposed_time: time,
    });
    const msg = mapMessageRow(row, id, profile.id);
    useChatStore.setState((s) => {
      const thread = s.messages[id] ?? [];
      if (thread.some((m) => m.id === msg.id)) return s;
      return { messages: { ...s.messages, [id]: [...thread, msg] } };
    });
    setRescheduleAppointmentId(null);
    jumpToLatest();
  };

  const handleIntakeExamAssigned = async (
    instance: Awaited<ReturnType<typeof import("@/domains/intake-exams/api").assignIntakeExam>>,
  ) => {
    if (!id || !accessToken || !profile?.id) return;
    const mapped = mapInstance(instance);
    const title =
      mapped.title?.trim() ||
      (isRTL ? "فحص متابعة" : "Follow-up exam");
    const meta: MedicalLinkMeta = {
      record_type: "intake",
      record_id: mapped.id,
      title,
    };
    await handleSend({
      recipientId: id,
      type: "medical_link",
      content: title,
      medicalLink: meta,
    });
    notifyMedicalHistoryChanged(id);
    void fetchAllMedicalHistory(id, accessToken, role ?? undefined).then((rows) =>
      setRecordsFromApi(rows, id),
    );
  };

  const handleDiagnosisSubmit = async (
    payload: import("@/components/DiagnosisChatForm").DiagnosisSubmitPayload,
  ) => {
    if (!id || !accessToken || !profile?.id || !doctorId || !canUseDiagnosisTemplates) return;

    setSavingDiagnosis(true);
    try {
      const record = await createDiagnosis(
        {
          desc: payload.description,
          patient_id: id,
          doctor_id: doctorId,
          symptoms: payload.symptoms.map((desc) => ({ desc })),
          document_ids: payload.documentIds.length > 0 ? payload.documentIds : undefined,
          body_part: payload.bodyPart,
          prescription_id: payload.prescription_id,
          prescription: payload.prescription,
          intake_exam_assignment_id: payload.intake_exam_assignment_id,
          intake_exam: payload.intake_exam,
        },
        accessToken,
      );

      const trimmedNote = payload.note?.trim();
      const meta: MedicalLinkMeta = {
        record_type: "diagnosis",
        record_id: record.id,
        title: record.title,
        ...(trimmedNote ? { note: trimmedNote } : {}),
      };

      await handleSend({
        recipientId: id,
        type: "medical_link",
        content: trimmedNote || record.title,
        medicalLink: meta,
      });

      setDiagnosisModalOpen(false);
    } catch (e) {
      Alert.alert(
        isRTL ? "تعذر الحفظ" : "Could not save",
        e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const replacingMedicalNote = useMemo(() => {
    if (!replacingMedicalMessage?.medicalLink) return "";
    const title = replacingMedicalMessage.medicalLink.title?.trim() ?? "";
    return (
      replacingMedicalMessage.medicalLink.note?.trim() ||
      (replacingMedicalMessage.text?.trim() !== title
        ? replacingMedicalMessage.text?.trim()
        : "") ||
      ""
    );
  }, [replacingMedicalMessage]);

  const wrapDesktop = (node: React.ReactNode) => {
    if (!desktopLayout) return node;
    return (
      <View style={[styles.desktopPage, { backgroundColor: colors.background }]}>
        <View style={[styles.desktopContainer, { maxWidth: WEB_MAX_WIDTH.content }]}>
          <View
            style={[
              styles.chatPanel,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {node}
          </View>
        </View>
      </View>
    );
  };

  const peerKnown =
    !!peer?.name?.trim() && peer.name !== "…";
  if (!contactsReady && !peerKnown) {
    return wrapDesktop(
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>,
    );
  }

  if (!peer || !id || !accessToken) {
    return wrapDesktop(
      <View style={styles.center}>
        <Text style={{ color: colors.foreground }}>
          {isRTL ? "المحادثة غير موجودة" : "Conversation not found."}
        </Text>
      </View>,
    );
  }

  const rowDir = chatFlexRow();
  const canOpenDoctorProfile =
    ((isPatient || isDoctorDoctorChat) &&
      peer?.role === "doctor" &&
      !!peer.doctorEntityId) ||
    false;
  const onPeerHeaderPress = canOpenPatientRecord
    ? openPatientRecord
    : canOpenDoctorProfile
      ? openDoctorProfile
      : undefined;

  const headerPaddingTop = desktopLayout ? 16 : insets.top + 8;
  // Drop home-indicator padding while keyboard is open — sticky view sits on the keyboard.
  const composerBottomInset = desktopLayout
    ? 12
    : layoutKeyboardVisible
      ? 0
      : Math.max(insets.bottom, 0);
  const listPadding = desktopLayout
    ? { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 8 }
    : {
        padding: 14,
        gap: 6,
        paddingBottom: 12,
        // Inverted list: paddingTop is the visual gap *below* the newest
        // message. The composer is translated over the list by
        // KeyboardStickyView rather than shrinking it, so with the keyboard up
        // the list has to reserve that height itself — otherwise the message
        // just sent sits underneath the input and the keys.
        paddingTop: layoutKeyboardHeight + 14,
      };

  // With no consultation open the composer is disabled anyway, so "start" is
  // promoted to a centered button in its place rather than hidden in the menu.
  const startConsultationAction = needsConsultation
    ? consultationMenuActions.find((a) => a.key === "consult-start")
    : undefined;

  const bookAppointmentAction: ChatAction | undefined =
    isPatient && isDoctorPatientChat && peer?.doctorEntityId
      ? {
          key: "book",
          label: isRTL ? "حجز موعد" : "Book appointment",
          Icon: Calendar,
          onPress: () => setBookAppointmentOpen(true),
        }
      : undefined;

  // The plus button is hidden while the CTAs show, so booking rides along with
  // "Start consultation" instead of being unreachable in the menu.
  const disabledActions = [startConsultationAction, bookAppointmentAction].filter(
    (a): a is ChatAction => !!a,
  );

  // Quick actions — collapsed under the plus button context window beside the input.
  // Start/end consultation is published into this menu by ConsultationBar.
  const chatActions: ChatAction[] = chatBlocked
    ? []
    : [
        ...consultationMenuActions.filter((a) => a.key !== startConsultationAction?.key),
        ...(isDoctor && canUseDiagnosisTemplates
          ? [
              {
                key: "diagnosis",
                label: isRTL ? "تشخيص جديد" : "Add diagnosis",
                Icon: Stethoscope,
                onPress: openDiagnosisModal,
              },
              {
                key: "prescription",
                label: isRTL ? "روشتة جديدة" : "Add prescription",
                Icon: Pill,
                onPress: openPrescriptionScreen,
              },
              {
                key: "lab",
                label: t.records.requestLab,
                Icon: Beaker,
                onPress: () => setDocumentRequestType("lab"),
              },
              {
                key: "xray",
                label: t.records.requestXray,
                Icon: ScanLine,
                onPress: () => setDocumentRequestType("xray"),
              },
              {
                key: "intake",
                label: isRTL ? "فحص متابعة" : "Follow-up exam",
                Icon: ClipboardList,
                onPress: () => setIntakeExamModalOpen(true),
              },
            ]
          : []),
        ...(isPatient && isDoctorPatientChat
          ? [
              ...(bookAppointmentAction ? [bookAppointmentAction] : []),
              ...(accessLoading
                ? []
                : accessStatus?.records_allowed
                  ? [
                      {
                        key: "revoke",
                        label: isRTL ? "إلغاء صلاحية السجل" : "Revoke record access",
                        Icon: ShieldOff,
                        color: colors.mutedForeground,
                        disabled: sending,
                        onPress: () => void handleAccessAction("revoke_records"),
                      },
                    ]
                  : [
                      {
                        key: "grant",
                        label: isRTL ? "منح صلاحية السجل" : "Grant record access",
                        Icon: ShieldCheck,
                        disabled: sending,
                        onPress: () => void handleAccessAction("grant_records"),
                      },
                    ]),
            ]
          : []),
        {
          key: "ask-ai",
          label: t.records.ask3elagiAi,
          Icon: Bot,
          color: "#e11d48",
          onPress: () => openAsk3elagiAi(undefined, isDoctor ? id : undefined),
        },
      ];

  const headerSubtitle = chatHeaderSubtitle({
    peer,
    isRTL,
    consultationOpen,
    testPatientThinking,
    peerTyping,
  });

  const chatUi = (
    <>
      <ChatHeader
        peer={peer}
        isRTL={isRTL}
        desktopLayout={desktopLayout}
        paddingTop={headerPaddingTop}
        backFallback={
          isAdmin
            ? "/admin/chats"
            : openedFrom === "doctors"
              ? "/(tabs)"
              : "/(tabs)/history"
        }
        onBackAccessibilityLabel={isRTL ? "رجوع" : "Back"}
        subtitle={
          !testPatientThinking && !peerTyping && peer.specialty && !headerSubtitle.accent
            ? `${headerSubtitle.text} · ${peer.specialty}`
            : headerSubtitle.text
        }
        subtitleAccent={headerSubtitle.accent}
        onPeerPress={onPeerHeaderPress}
        canOpenPatientRecord={canOpenPatientRecord}
        onOpenPatientRecord={openPatientRecord}
      />

      {isDoctorPatientChat && !accessLoading ? (
        <ChatAccessBanner isRTL={isRTL} isDoctor={isDoctor} access={accessStatus} />
      ) : null}

      {isDoctor && testPatientStatus?.is_test_patient ? (
        <View
          style={[
            styles.testPatientBanner,
            {
              backgroundColor: colors.muted,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.testPatientBannerText, { color: colors.foreground }]}>
            {isRTL
              ? `مريض 3elagi التجريبي (ذكاء اصطناعي) — ${testPatientStatus.questions_asked}/${testPatientStatus.max_questions} أسئلة. المحادثة مفتوحة — اطلب تحاليل أو أشعة من القائمة +.`
              : `3elagi AI demo patient — ${testPatientStatus.questions_asked}/${testPatientStatus.max_questions} questions. Chat is open — request labs or X-rays from the + menu.`}
          </Text>
        </View>
      ) : null}

      <View style={[styles.chatBody, desktopLayout && styles.chatBodyDesktop]}>
      <View ref={chatBodyRef} style={styles.chatBodyInner} collapsable={false}>
      {/* Only blank the thread on a cold load — a refresh must not unmount the
          list, that flashed a spinner over messages we already had. */}
      {messagesLoading && messages.length === 0 ? (
        <View style={styles.loadingMessages}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
        {archiveSplit ? (
          <ArchivedMessagesToggle
            count={archiveSplit.archived.length}
            expanded={archiveExpanded}
            isRTL={isRTL}
            onToggle={() => setArchiveExpanded((v) => !v)}
            label={t.consultations.archivedMessages}
            countLabel={t.consultations.archivedCount}
          />
        ) : null}
        {/* Web deliberately has no resize re-scroll: writing scrollTop while the
            browser is settling is what made the thread flicker. Native has no
            such fight, and needs the nudge — a bubble that grows after layout
            (image, long text) would otherwise leave the newest message
            off-screen. See onContentSizeChange below. */}
        <FlatList
          ref={listRef}
          data={listData}
          inverted={listInverted}
          keyExtractor={chatListItemKey}
          extraData={`${reactionTarget?.id ?? ""}:${messages.length}:${archiveExpanded}:${testPatientThinking}`}
          style={[styles.messageList, desktopLayout && { backgroundColor: colors.muted }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            stickToBottomRef.current = false;
            closeReactionPicker();
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
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              try {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  viewPosition: 0.5,
                  animated: true,
                });
              } catch {
                // give up silently
              }
            }, 300);
          }}
          maintainVisibleContentPosition={
            listInverted
              ? { minIndexForVisible: 0 }
              : undefined
          }
          contentContainerStyle={
            messages.length === 0
              ? [styles.emptyListContent, desktopLayout && styles.emptyListContentDesktop]
              : listPadding
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 15,
                  textAlign: "center",
                }}
              >
                {isRTL ? "أرسل رسالتك الأولى" : "Send your first message"}
              </Text>
            </View>
          }
          ListHeaderComponent={
            isDemoPatientChat && testPatientThinking ? (
              <TestPatientThinkingIndicator isRTL={isRTL} rowDir={rowDir} />
            ) : null
          }
          renderItem={({ item: row, index }) => {
            if (row.kind === "date") {
              return <ChatDateSeparator label={row.label} />;
            }
            const item = row.message;
            const mine = item.senderId === "me";
            const apptId = item.appointmentAction?.appointment_id;
            const showAppointmentControls = apptId
              ? latestAppointmentMessageIds.get(apptId) === item.id
              : false;
            const showPendingChangePanel = apptId
              ? openAppointmentChangeRequests.get(apptId) === item.id
              : false;

            const senderAvatar = mine ? (
              <Avatar
                uri={profile?.avatarUrl}
                seed={profile?.id ?? "me"}
                role={role === "doctor" ? "doctor" : "patient"}
                size={22}
              />
            ) : (
              <Avatar
                uri={peer.photoUrl}
                seed={peer.id}
                role={peer.role === "doctor" ? "doctor" : "patient"}
                size={22}
              />
            );

            const isWideCardMessage =
              item.type === "medical_link" ||
              item.type === "consultation_action" ||
              item.type === "appointment_action";

            const bubble = (
              <View
                ref={(node) => {
                  if (node) messageAnchorsRef.current.set(item.id, node);
                  else messageAnchorsRef.current.delete(item.id);
                }}
                collapsable={false}
                style={[
                  styles.messageColumn,
                  mine ? styles.messageColumnMine : styles.messageColumnTheirs,
                  !desktopLayout && isWideCardMessage && styles.messageColumnWide,
                ]}
              >
                <ChatMessageBubble
                  item={item}
                  mine={mine}
                  isRTL={isRTL}
                  rowDir={rowDir}
                  patientUserId={patientUserIdForLinks}
                  conversationPeerId={id}
                  canOpenMedicalLink={canOpenSharedMedicalLinks}
                  onImagePress={setFullscreenImage}
                  onVideoPress={setFullscreenVideo}
                  selfUserId={profile?.id}
                  onLongPress={
                    canReactToMessage(item) ? () => showReactionPicker(item) : undefined
                  }
                  isDoctor={isDoctor}
                  appointmentStatus={apptId ? appointmentStatuses.get(apptId) : undefined}
                  showAppointmentControls={showAppointmentControls}
                  showPendingChangePanel={showPendingChangePanel}
                  onAppointmentAction={(appointmentId, action) =>
                    void handleAppointmentAction(appointmentId, action)
                  }
                  appointmentActionBusy={appointmentActionBusy}
                  onConsultationAction={
                    item.consultationAction &&
                    !answeredConsultations.has(item.consultationAction.consultation_id)
                      ? (id, action) => void handleConsultationAction(id, action)
                      : undefined
                  }
                  consultationActionBusy={consultationActionBusy}
                  onPaymentReply={(target, reply) => void handlePaymentReply(target, reply)}
                  onChangeReply={handleChangeReply}
                  onRescheduleRequest={(appointmentId) =>
                    void openReschedule(appointmentId)
                  }
                  onEmotionToggle={(emotion) => void handleToggleEmotion(item, emotion)}
                  highlighted={
                    editingMessage?.id === item.id ||
                    replacingMedicalMessage?.id === item.id ||
                    reactionTarget?.id === item.id ||
                    (!!highlightConsultationId &&
                      item.consultationAction?.consultation_id ===
                        highlightConsultationId)
                  }
                />
              </View>
            );

            return (
              <View
                style={[
                  styles.bubbleRow,
                  {
                    flexDirection: rowDir,
                    justifyContent: mine ? "flex-end" : "flex-start",
                  },
                ]}
              >
                {mine ? (
                  <>
                    {bubble}
                    {senderAvatar}
                  </>
                ) : (
                  <>
                    {senderAvatar}
                    {bubble}
                  </>
                )}
              </View>
            );
          }}
        />
        </>
      )}

      {reactionTarget && reactionAnchor ? (
        <ChatReactionOverlay
          anchor={reactionAnchor}
          message={reactionTarget}
          selfUserId={profile?.id}
          onSelect={(emotion) => void handleToggleEmotion(reactionTarget, emotion)}
          onClose={closeReactionPicker}
          onMore={() => {
            const target = reactionTarget;
            closeReactionPicker();
            openMessageActions(target);
          }}
        />
      ) : null}
      </View>

      <View style={[styles.chatFooter, desktopLayout && styles.chatFooterDesktop]}>
      {/* Both native platforms. KeyboardProvider runs edge-to-edge
          (statusBarTranslucent/navigationBarTranslucent), so the window does not
          resize for the keyboard on Android either — this view is the only thing
          lifting the composer, and without it the input hides behind the keys. */}
      <KeyboardStickyView
        enabled={Platform.OS !== "web"}
        offset={{ closed: 0, opened: 0 }}
      >
      <ChatComposer
        isRTL={isRTL}
        isPatient={isPatient}
        selfId={profile!.id}
        accessToken={accessToken}
        peerId={id}
        sending={sending}
        bottomInset={composerBottomInset}
        onComposerFocus={() => setComposerFocused(true)}
        onComposerBlur={() => setComposerFocused(false)}
        onSend={handleSend}
        onAddPending={(msg) => addPendingMessage(id, msg)}
        onFailPending={(tempId) => failPendingMessage(id, tempId)}
        onPickMedical={() => void openMedicalPicker()}
        actions={chatActions}
        inlineAction={
          isDoctorPatientChat && !chatBlocked ? (
            <ConsultationBar
              compact
              menuOnly
              onMenuActionsChange={setConsultationMenuActions}
              peerId={id}
              isPatient={isPatient}
              isDoctor={isDoctor}
              enabled={isDoctorPatientChat && !isDemoPatientChat}
              token={accessToken}
              isRTL={isRTL}
              colors={colors}
              selfId={profile!.id}
              selfRole={role ?? "patient"}
              latestAction={latestConsultationAction}
              onOpenChange={setConsultationOpen}
              onActiveChange={handleConsultationActiveChange}
              onThreadUpdated={jumpToLatest}
              removeConsultationId={consultationId ?? undefined}
            />
          ) : null
        }
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        onEdit={handleEditMessage}
        disabled={chatBlocked || needsConsultation}
        disabledActions={chatBlocked ? undefined : disabledActions}
        disabledHint={
          needsConsultation && !chatBlocked
            ? isPatient
              ? isRTL
                ? "ابدأ استشارة لإرسال الرسائل."
                : "Start a consultation to send messages."
              : isRTL
                ? "لا يمكن المراسلة حتى يبدأ المريض استشارة."
                : "Messaging opens once the patient starts a consultation."
            : chatBlocked
            ? isDoctor && accessStatus?.blocked_by_doctor
              ? isRTL
                ? "لقد حظرت هذه المحادثة. استخدم «إلغاء الحظر» للمتابعة."
                : "You blocked this chat. Use Unblock to continue."
              : isPatient && accessStatus?.blocked_by_patient
                ? isRTL
                  ? "لقد حظرت هذه المحادثة. استخدم «إلغاء الحظر» للمتابعة."
                  : "You blocked this chat. Use Unblock to continue."
                : isRTL
                  ? "هذه المحادثة محظورة"
                  : "This chat is blocked"
            : undefined
        }
        canStoreImageInMedicalRecord={
          isPatient && isDoctorPatientChat && !chatBlocked
        }
        medicalRecordPatientUserId={profile?.id}
        onMedicalRecordCreated={() => {
          if (!accessToken || !profile?.id) return;
          void fetchAllMedicalHistory(profile.id, accessToken).then((apiRecords) =>
            setRecordsFromApi(apiRecords, profile.id),
          );
        }}
      />
      </KeyboardStickyView>
      </View>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[{ flex: 1 }, chatLayoutDirection]}>{wrapDesktop(chatUi)}</View>

      {id && accessToken ? (
        <DiagnosisChatModal
          visible={diagnosisModalOpen}
          isRTL={isRTL}
          patientUserId={id}
          accessToken={accessToken}
          consultationId={activeConsultationId}
          saving={savingDiagnosis}
          onClose={() => {
            if (savingDiagnosis) return;
            setDiagnosisModalOpen(false);
          }}
          onSubmit={(payload) => void handleDiagnosisSubmit(payload)}
        />
      ) : null}

      {id && accessToken && documentRequestType ? (
        <DoctorMedicalRequestDialog
          visible
          patientUserId={id}
          accessToken={accessToken}
          initialType={documentRequestType}
          onClose={() => setDocumentRequestType(null)}
        />
      ) : null}

      {id && accessToken && isDoctor ? (
        <AssignIntakeExamDialog
          visible={intakeExamModalOpen}
          isRTL={isRTL}
          patientUserId={id}
          accessToken={accessToken}
          saving={assigningIntakeExam}
          onClose={() => {
            if (assigningIntakeExam) return;
            setIntakeExamModalOpen(false);
          }}
          onAssigned={(instance) => {
            setAssigningIntakeExam(true);
            void handleIntakeExamAssigned(instance).finally(() => {
              setAssigningIntakeExam(false);
              setIntakeExamModalOpen(false);
            });
          }}
        />
      ) : null}

      {accessToken ? (
        <AssistantCreateRecordDialog
          visible={createMedicalRecordOpen}
          token={accessToken}
          patientUserId={isDoctor ? id : undefined}
          onClose={() => setCreateMedicalRecordOpen(false)}
          onCreated={() => {
            setCreateMedicalRecordOpen(false);
            if (!profile?.id) return;
            void fetchAllMedicalHistory(profile.id, accessToken).then((apiRecords) =>
              setRecordsFromApi(apiRecords, profile.id),
            );
          }}
        />
      ) : null}

      <MedicalRecordPicker
        visible={medicalPickerOpen}
        records={medicalRecords}
        loading={medicalPickerLoading}
        isRTL={isRTL}
        mode={medicalPickerMode}
        initialNote={replacingMedicalNote}
        onClose={closeMedicalPicker}
        onSelect={(record, note) => void handleMedicalPickerSelect(record, note)}
      />

      {id && accessToken && profile?.id && rescheduleAppointmentId ? (
        <BookAppointmentDialog
          visible
          mode="reschedule"
          isRTL={isRTL}
          token={accessToken}
          selfId={profile.id}
          doctorUserId={isPatient ? id : profile.id}
          doctorEntityId={
            (isPatient ? peer?.doctorEntityId : selfDoctorEntityId) ?? ""
          }
          onSubmitSlot={submitReschedule}
          onClose={() => setRescheduleAppointmentId(null)}
          onBooked={() => undefined}
        />
      ) : null}

      {isPatient && id && accessToken && profile?.id && peer?.doctorEntityId ? (
        <BookAppointmentDialog
          visible={bookAppointmentOpen}
          isRTL={isRTL}
          token={accessToken}
          selfId={profile.id}
          doctorUserId={id}
          doctorEntityId={peer.doctorEntityId}
          videoConsultationPrice={peer.videoConsultationPrice}
          onClose={() => setBookAppointmentOpen(false)}
          onBooked={() => {
            if (accessToken && profile?.id) {
              void loadMessages(id, accessToken, profile.id);
            }
          }}
        />
      ) : null}

      <FullscreenImageViewer
        uri={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
      <FullscreenVideoViewer
        uri={fullscreenVideo}
        onClose={() => setFullscreenVideo(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  desktopPage: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 24,
  },
  desktopContainer: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    minHeight: 0,
  },
  chatPanel: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  chatBody: { flex: 1 },
  chatBodyInner: {
    flex: 1,
    position: "relative",
  },
  chatBodyDesktop: { backgroundColor: "transparent" },
  // marginTop pins the composer to the bottom of the column even if the message
  // list above it has not laid out yet (empty / still loading conversation).
  chatFooter: { flexShrink: 0, marginTop: "auto" },
  messageColumn: {
    flexShrink: 1,
    maxWidth: "82%",
  },
  messageColumnMine: {
    alignItems: "flex-end",
  },
  messageColumnTheirs: {
    alignItems: "flex-start",
  },
  messageColumnWide: {
    maxWidth: "90%",
    width: "90%",
  },
  messageList: { flex: 1 },
  loadingMessages: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyListContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
  emptyListContentDesktop: { paddingHorizontal: 32 },
  emptyChat: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  chatFooterDesktop: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
  },
  testPatientBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  testPatientBannerText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  bubbleRow: {
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 6,
    width: "100%",
  },
});
