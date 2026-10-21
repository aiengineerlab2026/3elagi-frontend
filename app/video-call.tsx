import { router, useLocalSearchParams } from "expo-router";
import {
  Beaker,
  ClipboardList,
  MessageSquare,
  Pill,
  Phone,
  PhoneOff,
  ScanLine,
  Stethoscope,
} from "lucide-react-native";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { navigateBack } from "@/utils/appNavigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo3elagi } from "@/components/Logo3elagi";
import { WherebyMeetingEmbed } from "@/components/video-call/WherebyMeetingEmbed";
import { InMeetingChatPanel } from "@/components/video-call/InMeetingChatPanel";
import { DiagnosisChatModal } from "@/components/DiagnosisChatModal";
import { AssignIntakeExamDialog } from "@/components/intake/AssignIntakeExamDialog";
import { ChatActionsMenu, type ChatAction } from "@/components/chat/ChatActionsMenu";
import { DoctorMedicalRequestDialog } from "@/components/medical/DoctorMedicalRequestDialog";
import type { MedicalDocumentRequestType } from "@/domains/medical/api";
import { useAuthStore } from "@/domains/auth/store";
import { useChatStore } from "@/domains/chat/store";
import type { MedicalLinkMeta } from "@/domains/chat/types";
import { mapInstance } from "@/domains/intake-exams/api";
import { createDiagnosis } from "@/domains/medical/api";
import { useMedicalStore } from "@/domains/medical/store";
import { onVideoCallStatus } from "@/domains/presence/socket";
import {
  acceptVideoCall,
  declineVideoCall,
  endVideoCall,
  fetchVideoCallSession,
  toVideoEmbedUrl,
  type VideoCallSession,
} from "@/domains/video-call/api";
import {
  buildDirectMeetingSession,
  resolveMeetingChatPeerId,
} from "@/domains/video-call/meetingChat";
import { formatVideoParticipantName } from "@/domains/video-call/participantNames";
import { stopIncomingCallRing } from "@/domains/video-call/incomingCallRing";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useRinger } from "@/hooks/useRinger";
import { useWebLayout } from "@/hooks/useWebLayout";
import { chatFlexRow } from "@/utils/rtl";
import { showInfoToast, showSuccessToast, showErrorToast } from "@/utils/toast";

const DEFAULT_MEETING_DURATION_MIN = 30;
const WARNING_REMAINING_SEC = 5 * 60;

function readParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseDurationMinutes(value?: string | string[]): number | undefined {
  const raw = readParam(value);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(n);
}

function formatRemainingTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function VideoCallScreen() {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const insets = useSafeAreaInsets();
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const doctorId = useAuthStore((s) => s.doctorId);
  const resolveChatPeer = useChatStore((s) => s.resolvePeer);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const addPendingMessage = useChatStore((s) => s.addPendingMessage);
  const notifyMedicalHistoryChanged = useMedicalStore(
    (s) => s.notifyMedicalHistoryChanged,
  );
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [intakeExamOpen, setIntakeExamOpen] = useState(false);
  const [documentRequestType, setDocumentRequestType] =
    useState<MedicalDocumentRequestType | null>(null);
  const [assigningIntakeExam, setAssigningIntakeExam] = useState(false);
  const params = useLocalSearchParams<{
    sessionId?: string | string[];
    meetingUrl?: string | string[];
    patientUserId?: string | string[];
    peerUserId?: string | string[];
    peerName?: string | string[];
    durationMinutes?: string | string[];
  }>();

  const sessionId = readParam(params.sessionId);
  const meetingUrlParam = readParam(params.meetingUrl);
  const patientUserIdParam = readParam(params.patientUserId);
  const peerUserIdParam = readParam(params.peerUserId);
  const peerNameParam = readParam(params.peerName);
  const durationParam = parseDurationMinutes(params.durationMinutes);

  const isDoctor = role?.toLowerCase() === "doctor";
  const isPatient = role?.toLowerCase() === "patient";
  const [session, setSession] = useState<VideoCallSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<"accept" | "reject" | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerSessionKeyRef = useRef<string | null>(null);
  const warningShownRef = useRef(false);
  const endingRef = useRef(false);
  const meetingDurationMin =
    session?.durationMinutes ?? durationParam ?? DEFAULT_MEETING_DURATION_MIN;
  const meetingDurationSec = meetingDurationMin * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_MEETING_DURATION_MIN * 60,
  );
  const [meetingExpired, setMeetingExpired] = useState(false);
  const { isTablet, isDesktop } = useWebLayout();
  const [chatOpen, setChatOpen] = useState(false);
  const chatDefaultedRef = useRef(false);
  const [meetingMedicalPicker, setMeetingMedicalPicker] = useState<React.ReactNode>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const clearMeetingTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadSession = useCallback(async () => {
    if (!accessToken) {
      setError(isRTL ? "تعذر بدء المكالمة" : "Could not start the video call");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (meetingUrlParam) {
        setSession(
          buildDirectMeetingSession({
            meetingUrl: meetingUrlParam,
            durationMinutes: durationParam ?? DEFAULT_MEETING_DURATION_MIN,
            isDoctor,
            selfUserId: profile?.id ?? "",
            selfName: profile?.name,
            peerUserId: peerUserIdParam,
            peerName: peerNameParam,
            patientUserIdParam,
          }),
        );
        return;
      }

      if (!sessionId) {
        throw new Error(
          isRTL ? "بيانات المكالمة غير متوفرة" : "Call details are missing",
        );
      }
//
      const next = await fetchVideoCallSession(accessToken, sessionId);
      setSession(next);
    } catch (e) {
      setSession(null);
      setError(
        e instanceof Error
          ? e.message
          : isRTL
            ? "تعذر إنشاء غرفة المكالمة"
            : "Could not create the meeting room",
      );
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    durationParam,
    isDoctor,
    isRTL,
    meetingUrlParam,
    patientUserIdParam,
    peerUserIdParam,
    peerNameParam,
    profile?.id,
    profile?.name,
    sessionId,
  ]);

  useEffect(() => {
    void loadSession();
    return () => {
      clearPoll();
      clearMeetingTimer();
    };
  }, [loadSession, clearMeetingTimer, clearPoll]);

  // Socket first (instant, like Messenger); the poll below is the fallback.
  useEffect(() => {
    onVideoCallStatus((payload) => {
      setSession((current) =>
        current && current.id === payload.session_id
          ? { ...current, status: payload.status }
          : current,
      );
    });
    return () => onVideoCallStatus(null);
  }, []);

  // The doctor declined: drop a note in the thread and return the caller to it
  // rather than leaving them on a dead call screen.
  const declineHandledRef = useRef(false);
  useEffect(() => {
    if (session?.status !== "declined" || !isPatient) return;
    if (declineHandledRef.current) return;
    declineHandledRef.current = true;

    const peerId = session.doctorUserId;
    if (peerId) {
      addPendingMessage(peerId, {
        id: `call-declined-${session.id}`,
        conversationId: peerId,
        senderId: peerId,
        text: t.auth.callDeclined,
        createdAt: new Date().toISOString(),
        type: "text",
        pending: false,
      });
    }
    showInfoToast(t.auth.callDeclined);
    if (peerId) {
      router.replace({ pathname: "/chat/[id]", params: { id: peerId } });
    } else {
      navigateBack();
    }
  }, [session?.status, session?.id, session?.doctorUserId, isPatient, addPendingMessage, t]);

  useEffect(() => {
    clearPoll();
    if (!accessToken || !session || session.status !== "ringing" || !isPatient) {
      return;
    }

    pollRef.current = setInterval(() => {
      void fetchVideoCallSession(accessToken, session.id)
        .then((next) => {
          setSession(next);
          if (next.status !== "ringing") clearPoll();
        })
        .catch(() => undefined);
    }, 2000);

    return clearPoll;
  }, [accessToken, clearPoll, isPatient, session?.id, session?.status]);

  useEffect(() => {
    if (Platform.OS !== "android" || !session?.id) return;
    if (session.status !== "ringing") {
      stopIncomingCallRing(session.id);
    }
  }, [session?.id, session?.status]);

  const handleLeave = () => {
    clearMeetingTimer();
    if (accessToken && session?.id && session.id !== "direct") {
      void endVideoCall(accessToken, session.id).catch(() => undefined);
    }
    navigateBack(router, "/(tabs)/history");
  };

  const handleAccept = async () => {
    if (!accessToken || !session || acting) return;
    setActing("accept");
    try {
      const next = await acceptVideoCall(accessToken, session.id);
      stopIncomingCallRing(session.id);
      setSession(next);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isRTL
            ? "تعذر قبول المكالمة"
            : "Could not accept the call",
      );
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (!accessToken || !session || acting) return;
    setActing("reject");
    try {
      await declineVideoCall(accessToken, session.id);
      stopIncomingCallRing(session.id);
      navigateBack(router, "/(tabs)/history");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : isRTL
            ? "تعذر رفض المكالمة"
            : "Could not reject the call",
      );
      setActing(null);
    }
  };

  const handleDiagnosisSubmit = async (
    payload: import("@/components/DiagnosisChatForm").DiagnosisSubmitPayload,
  ) => {
    const targetPatientId = session?.patientUserId?.trim() || patientUserIdParam;
    if (!accessToken || !doctorId || !targetPatientId) return;
    setSavingDiagnosis(true);
    try {
      await createDiagnosis(
        {
          desc: payload.description,
          patient_id: targetPatientId,
          doctor_id: doctorId,
          symptoms: payload.symptoms.map((desc) => ({ desc })),
          document_ids:
            payload.documentIds.length > 0 ? payload.documentIds : undefined,
          body_part: payload.bodyPart,
          prescription_id: payload.prescription_id,
          prescription: payload.prescription,
          intake_exam_assignment_id: payload.intake_exam_assignment_id,
          intake_exam: payload.intake_exam,
        },
        accessToken,
      );
      setDiagnosisOpen(false);
      showSuccessToast(isRTL ? "تم حفظ التشخيص" : "Diagnosis saved");
    } catch (e) {
      showErrorToast(
        isRTL ? "تعذر حفظ التشخيص" : "Could not save diagnosis",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const handleIntakeExamAssigned = async (
    instance: Awaited<
      ReturnType<typeof import("@/domains/intake-exams/api").assignIntakeExam>
    >,
  ) => {
    const targetPatientId = session?.patientUserId?.trim() || patientUserIdParam;
    if (!accessToken || !profile?.id || !targetPatientId) return;

    const mapped = mapInstance(instance);
    const title =
      mapped.title?.trim() || (isRTL ? "فحص متابعة" : "Follow-up exam");
    const meta: MedicalLinkMeta = {
      record_type: "intake",
      record_id: mapped.id,
      title,
    };

    try {
      await sendMessage(
        targetPatientId,
        {
          recipientId: targetPatientId,
          type: "medical_link",
          content: title,
          medicalLink: meta,
        },
        accessToken,
        profile.id,
        role,
      );
      notifyMedicalHistoryChanged(targetPatientId);
      showSuccessToast(
        isRTL ? "تم إرسال فحص المتابعة للمريض" : "Follow-up exam shared with patient",
      );
    } catch (e) {
      // Assignment already succeeded — still notify history even if chat share fails.
      notifyMedicalHistoryChanged(targetPatientId);
      showErrorToast(
        isRTL ? "تم التعيين لكن تعذر الإرسال في المحادثة" : "Assigned, but could not share in chat",
        e instanceof Error ? e.message : undefined,
      );
    }
  };

  const rowDir = chatFlexRow();
  const selfRoleLabel = isDoctor ? t.auth.doctor : t.auth.patient;
  const peerRoleLabel = isDoctor ? t.auth.patient : t.auth.doctor;
  const rawSelfName = profile?.name?.trim() || (isRTL ? "مستخدم" : "User");
  // No role-word fallback here: formatVideoParticipantName already falls back
  // to the role label, and pre-filling it produced "Doctor Doctor".
  const chatPeerId = resolveMeetingChatPeerId({
    isDoctor,
    session,
    peerUserIdParam,
    patientUserIdParam,
  });
  // Appointment rooms are built client-side and often carry no patient name,
  // so fall back to the conversation the two already share.
  const rawPeerName =
    (isDoctor ? session?.patientName : session?.doctorName)?.trim() ||
    peerNameParam?.trim() ||
    (chatPeerId ? resolveChatPeer(chatPeerId)?.name?.trim() : "") ||
    "";
  const displayName = formatVideoParticipantName({
    role: isDoctor ? "doctor" : "patient",
    name: rawSelfName,
    roleLabel: selfRoleLabel,
  });
  const peerName = formatVideoParticipantName({
    role: isDoctor ? "patient" : "doctor",
    name: rawPeerName,
    roleLabel: peerRoleLabel,
  });
  const canJoin = !!session?.roomUrl && session.status === "accepted" && !meetingExpired;
  const canUseMeetingChat = canJoin && !!chatPeerId;
  const useSideChatLayout = isTablet || isDesktop;
  const chatLayout = useSideChatLayout ? "side" : "overlay";

  useEffect(() => {
    if (!canUseMeetingChat || chatDefaultedRef.current) return;
    chatDefaultedRef.current = true;
    setChatOpen(useSideChatLayout);
  }, [canUseMeetingChat, useSideChatLayout]);

  useEffect(() => {
    if (!canUseMeetingChat) {
      chatDefaultedRef.current = false;
      setChatOpen(false);
    }
  }, [canUseMeetingChat]);

  const diagPatientId = session?.patientUserId?.trim() || patientUserIdParam || null;
  const canAddClinicalNotes =
    isDoctor && canJoin && !!diagPatientId && !!accessToken;

  // Everything the doctor may file during the call, collapsed under the plus.
  const clinicalActions: ChatAction[] = [
    {
      key: "diagnosis",
      label: isRTL ? "تشخيص جديد" : "Add diagnosis",
      Icon: Stethoscope,
      onPress: () => setDiagnosisOpen(true),
    },
    {
      key: "prescription",
      label: isRTL ? "روشتة جديدة" : "Add prescription",
      Icon: Pill,
      onPress: () =>
        router.push({
          pathname: "/medical/prescription/add",
          // Come back to the call instead of the records list.
          params: {
            patientUserId: diagPatientId!,
            ...(sessionId
              ? { returnTo: `/video-call?sessionId=${sessionId}` }
              : {}),
          },
        }),
    },
    {
      key: "intake",
      label: isRTL ? "فحص متابعة" : "Follow-up exam",
      Icon: ClipboardList,
      onPress: () => setIntakeExamOpen(true),
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
  ];
  const waitingForDoctor =
    !!session && isPatient && session.status === "ringing";
  const incomingForDoctor =
    !!session && isDoctor && session.status === "ringing";
  // Patient hears the ringback while dialing; the doctor hears the ringtone.
  useRinger("ringback", waitingForDoctor);
  useRinger("ringtone", incomingForDoctor && !acting && Platform.OS !== "android");
  const countdownLabel = formatRemainingTime(remainingSeconds);
  // Wall-clock end = now + whatever is left, which tracks the same timer the
  // countdown used (and so survives a late join or a reconnect).
  const endTimeLabel = new Date(Date.now() + remainingSeconds * 1000)
    .toLocaleTimeString(isRTL ? "ar" : "en", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const endMeetingForTimeout = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;
    clearMeetingTimer();
    setMeetingExpired(true);
    setRemainingSeconds(0);
    if (accessToken && session?.id && session.id !== "direct") {
      void endVideoCall(accessToken, session.id)
        .then((next) => setSession(next))
        .catch(() => undefined);
    }
  }, [accessToken, clearMeetingTimer, session?.id]);

  useEffect(() => {
    if (!canJoin || !session?.roomUrl) {
      clearMeetingTimer();
      if (!meetingExpired) {
        setRemainingSeconds(meetingDurationSec);
      }
      return;
    }

    const sessionKey = `${session.id}:${session.roomUrl}:${meetingDurationSec}`;
    if (timerSessionKeyRef.current !== sessionKey) {
      timerSessionKeyRef.current = sessionKey;
      warningShownRef.current = false;
      endingRef.current = false;
      setMeetingExpired(false);
      setRemainingSeconds(meetingDurationSec);
    }

    clearMeetingTimer();
    timerRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (next <= WARNING_REMAINING_SEC && next > 0 && !warningShownRef.current) {
          warningShownRef.current = true;
          showInfoToast(
            isRTL ? "ستنتهي المكالمة قريبًا" : "Meeting ending soon",
            isRTL
              ? "سيتم إغلاق الاجتماع بعد 5 دقائق."
              : "This meeting will be closed after 5 minutes.",
          );
        }
        if (next === 0) {
          endMeetingForTimeout();
        }
        return next;
      });
    }, 1000);

    return clearMeetingTimer;
  }, [
    canJoin,
    clearMeetingTimer,
    endMeetingForTimeout,
    isRTL,
    meetingDurationSec,
    meetingExpired,
    session?.id,
    session?.roomUrl,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={[styles.headerTop, { flexDirection: rowDir }]}>
          <AppBackButton
            color={colors.foreground}
            style={styles.backBtn}
            fallback="/(tabs)/history"
            onPress={handleLeave}
            accessibilityLabel={isRTL ? "رجوع" : "Back"}
          />

          <View style={[styles.brandRow, { flexDirection: rowDir }]}>
            <Logo3elagi height={28} markOnly />
            <View style={styles.brandText}>
              <Text
                style={[styles.peerName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {peerName}
              </Text>
              <Text
                style={[styles.brandHint, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                3elagi
              </Text>
            </View>
          </View>

          {canUseMeetingChat ? (
            <Pressable
              onPress={() => setChatOpen((open) => !open)}
              style={[
                styles.chatToggleBtn,
                {
                  backgroundColor: chatOpen ? colors.primary : colors.muted,
                  borderColor: colors.border,
                  flexDirection: rowDir,
                  gap: 6,
                  paddingHorizontal: chatOpen || useSideChatLayout ? 10 : 0,
                  width: chatOpen || useSideChatLayout ? undefined : 40,
                },
              ]}
              accessibilityLabel={isRTL ? "محادثة الاجتماع" : "Meeting chat"}
            >
              <MessageSquare
                size={18}
                color={chatOpen ? "#fff" : colors.foreground}
              />
              {!chatOpen && useSideChatLayout ? (
                <Text style={[styles.chatToggleLabel, { color: colors.foreground }]}>
                  {isRTL ? "محادثة" : "Chat"}
                </Text>
              ) : null}
            </Pressable>
          ) : null}

          {canJoin ? (
            <View
              style={[
                styles.timerBadge,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.timerLabel, { color: colors.mutedForeground }]}
              >
                {isRTL ? "ينتهي في" : "Ends at"}
              </Text>
              <Text style={[styles.timerValue, { color: colors.foreground }]}>
                {endTimeLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {canAddClinicalNotes ? (
          <View style={[styles.clinicalActions, { flexDirection: rowDir }]}>
            <ChatActionsMenu isRTL={isRTL} actions={clinicalActions} />
            <Text
              style={[styles.clinicalHint, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {isRTL ? "إجراءات المريض" : "Patient actions"}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {isRTL ? "جاري إعداد المكالمة…" : "Setting up the call…"}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>
              {isRTL ? "تعذر بدء المكالمة" : "Could not start call"}
            </Text>
            <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
              {error}
            </Text>
            <Pressable
              onPress={() => void loadSession()}
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryText}>
                {isRTL ? "إعادة المحاولة" : "Try again"}
              </Text>
            </Pressable>
          </View>
        ) : session?.status === "declined" ? (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>
              {isRTL ? "لم يتم الرد على المكالمة" : "Call was not answered"}
            </Text>
          </View>
        ) : meetingExpired ? (
          <View style={styles.center}>
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>
              {isRTL ? "انتهى وقت الاجتماع" : "Meeting time ended"}
            </Text>
            <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
              {isRTL
                ? `تم إغلاق غرفة الاجتماع بعد ${meetingDurationMin} دقيقة.`
                : `The meeting room was closed after ${meetingDurationMin} minutes.`}
            </Text>
          </View>
        ) : waitingForDoctor ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {isRTL
                ? `جاري الاتصال بـ ${peerName}…`
                : `Calling ${peerName}…`}
            </Text>
          </View>
        ) : incomingForDoctor ? (
          <View style={styles.center}>
            <Logo3elagi height={72} centered />
            <Text style={[styles.errorTitle, { color: colors.foreground, marginTop: 18 }]}>
              {isRTL ? "مكالمة فيديو واردة" : "Incoming video call"}
            </Text>
            <Text style={[styles.callerName, { color: colors.foreground }]}>
              {peerName}
            </Text>
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {isRTL ? "اضغط قبول لبدء المكالمة" : "Tap accept to start the call"}
            </Text>
            <View style={styles.incomingActions}>
              <Pressable
                onPress={() => void handleReject()}
                disabled={!!acting}
                style={[styles.callActionBtn, { backgroundColor: "#ef4444", opacity: acting ? 0.7 : 1 }]}
              >
                {acting === "reject" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <PhoneOff size={28} color="#fff" />
                )}
              </Pressable>
              <Pressable
                onPress={() => void handleAccept()}
                disabled={!!acting}
                style={[styles.callActionBtn, { backgroundColor: "#22c55e", opacity: acting ? 0.7 : 1 }]}
              >
                {acting === "accept" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Phone size={28} color="#fff" />
                )}
              </Pressable>
            </View>
            <View style={styles.incomingLabels}>
              <Text style={[styles.incomingLabel, { color: colors.mutedForeground }]}>
                {isRTL ? "رفض" : "Reject"}
              </Text>
              <Text style={[styles.incomingLabel, { color: colors.mutedForeground }]}>
                {isRTL ? "قبول" : "Accept"}
              </Text>
            </View>
          </View>
        ) : canJoin ? (
          <View style={[styles.meetingBody, { flexDirection: rowDir }]}>
            <View style={styles.videoPane}>
              <WherebyMeetingEmbed
                roomUrl={session.roomUrl}
                embedUrl={toVideoEmbedUrl(session.roomUrl, displayName)}
              />
            </View>
            {chatOpen && chatPeerId ? (
              <InMeetingChatPanel
                clinicalActions={isDoctor ? clinicalActions : undefined}
                peerId={chatPeerId}
                peerName={peerName}
                isDoctor={isDoctor}
                layout={chatLayout}
                onClose={chatLayout === "overlay" ? () => setChatOpen(false) : undefined}
                renderMedicalPicker={setMeetingMedicalPicker}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {canUseMeetingChat && !chatOpen && !useSideChatLayout ? (
        <Pressable
          onPress={() => setChatOpen(true)}
          style={[
            styles.chatFab,
            {
              backgroundColor: colors.primary,
              bottom: insets.bottom + 20,
              flexDirection: rowDir,
            },
          ]}
          accessibilityLabel={isRTL ? "فتح محادثة الاجتماع" : "Open meeting chat"}
        >
          <MessageSquare size={22} color="#fff" />
          <Text style={styles.chatFabLabel}>{isRTL ? "محادثة" : "Chat"}</Text>
        </Pressable>
      ) : null}

      {canAddClinicalNotes && diagPatientId && accessToken ? (
        <DiagnosisChatModal
          visible={diagnosisOpen}
          isRTL={isRTL}
          patientUserId={diagPatientId}
          accessToken={accessToken}
          saving={savingDiagnosis}
          onClose={() => {
            if (savingDiagnosis) return;
            setDiagnosisOpen(false);
          }}
          onSubmit={(payload) => void handleDiagnosisSubmit(payload)}
        />
      ) : null}

      {canAddClinicalNotes && diagPatientId && accessToken ? (
        <AssignIntakeExamDialog
          visible={intakeExamOpen}
          isRTL={isRTL}
          patientUserId={diagPatientId}
          accessToken={accessToken}
          saving={assigningIntakeExam}
          onClose={() => {
            if (assigningIntakeExam) return;
            setIntakeExamOpen(false);
          }}
          onAssigned={(instance) => {
            setAssigningIntakeExam(true);
            void handleIntakeExamAssigned(instance).finally(() => {
              setAssigningIntakeExam(false);
              setIntakeExamOpen(false);
            });
          }}
        />
      ) : null}

      {canAddClinicalNotes && diagPatientId && accessToken && documentRequestType ? (
        <DoctorMedicalRequestDialog
          visible
          patientUserId={diagPatientId}
          accessToken={accessToken}
          initialType={documentRequestType}
          onClose={() => setDocumentRequestType(null)}
        />
      ) : null}

      {meetingMedicalPicker}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  header: {
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 2,
  },
  headerTop: {
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  backBtn: {
    padding: 4,
    flexShrink: 0,
  },
  brandRow: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  timerBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  timerValue: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  peerName: {
    fontSize: 15,
    fontWeight: "800",
  },
  brandHint: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  meetingBody: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  videoPane: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  chatToggleBtn: {
    minWidth: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chatToggleLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  chatFab: {
    position: "absolute",
    right: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    zIndex: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  chatFabLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  clinicalActions: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  clinicalHint: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    textAlign: "center",
  },
  callerName: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  incomingActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
    marginTop: 24,
  },
  callActionBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
  },
  incomingLabels: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 58,
    marginTop: 12,
  },
  incomingLabel: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 82,
    textAlign: "center",
  },
});
