import { Image } from "expo-image";
import { router } from "expo-router";
import { Beaker, Check, CheckCheck, ChevronRight, ClipboardList, ImageIcon, Pill, ScanLine, Stethoscope } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { ChatMessage } from "@/domains/chat/types";
import {
  countryFlagEmoji,
  PATIENT_COUNTRY_LABELS,
} from "@/constants/patientCountries";
import type { MessageEmotionType } from "@/domains/emotions/types";
import { ChatInlineVideo } from "@/components/chat/ChatInlineVideo";
import { VoiceMessagePlayer } from "@/components/chat/VoiceMessagePlayer";
import { MessageEmotionsBar } from "@/components/MessageEmotionsBar";
import {
  PaymentActionPanel,
  type PaymentReply,
} from "@/components/chat/PaymentActionPanel";
import {
  PendingChangePanel,
  type ChangeReply,
} from "@/components/chat/PendingChangePanel";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import {
  appointmentRoomState,
  isAppointmentStartInFuture,
} from "@/domains/appointments/roomWindow";

interface Props {
  item: ChatMessage;
  mine: boolean;
  isRTL: boolean;
  rowDir: "row" | "row-reverse";
  /** Chat counterpart for in-call / appointment joins (doctor or patient user id). */
  conversationPeerId?: string;
  patientUserId?: string;
  canOpenMedicalLink?: boolean;
  isDoctor?: boolean;
  appointmentStatus?: {
    status: string;
    meetingLink?: string | null;
    pendingBy?: string | null;
  };
  onAppointmentAction?: (
    appointmentId: string,
    action: "confirm" | "reject" | "cancel",
  ) => void;
  appointmentActionBusy?: boolean;
  showAppointmentControls?: boolean;
  /** True only on the unanswered reschedule/cancel request message. */
  showPendingChangePanel?: boolean;
  /** Doctor answering a pending consultation request from the thread. */
  onConsultationAction?: (
    consultationId: string,
    action: "accept" | "accept_paid" | "reject",
  ) => void;
  /** Patient sends a receipt, doctor approves or rejects it. */
  onPaymentReply?: (
    target: { kind: "appointment" | "consultation"; id: string },
    reply: PaymentReply,
  ) => void;
  /** Either side proposes a new slot for an appointment. */
  onRescheduleRequest?: (appointmentId: string) => void;
  /** Answering a proposed new slot or a cancellation request. */
  onChangeReply?: (
    target: {
      kind: "appointment" | "consultation";
      id: string;
      change: "reschedule" | "cancel";
    },
    reply: ChangeReply,
  ) => void;
  consultationActionBusy?: boolean;
  onImagePress?: (uri: string) => void;
  onVideoPress?: (uri: string) => void;
  onLongPress?: () => void;
  onEmotionToggle?: (emotion: MessageEmotionType) => void;
  selfUserId?: string | null;
  highlighted?: boolean;
}

export function ChatMessageBubble({
  item,
  mine,
  isRTL,
  rowDir,
  patientUserId,
  conversationPeerId,
  canOpenMedicalLink = true,
  isDoctor = false,
  appointmentStatus,
  onAppointmentAction,
  appointmentActionBusy = false,
  showAppointmentControls = false,
  showPendingChangePanel = false,
  onConsultationAction,
  onPaymentReply,
  onChangeReply,
  onRescheduleRequest,
  consultationActionBusy = false,
  onImagePress,
  onVideoPress,
  onLongPress,
  onEmotionToggle,
  selfUserId,
  highlighted = false,
}: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const { isDesktop } = useWebLayout();
  const { width: screenWidth } = useWindowDimensions();
  const [imageLoaded, setImageLoaded] = useState(false);

  const wideActionCards = Platform.OS !== "web" || !isDesktop;

  // 86% of the column on a phone; capped on desktop, where screenWidth is the
  // whole window and an unbounded bubble would stretch across the page.
  const maxBubbleWidth = useMemo(
    () => Math.min(Math.round(screenWidth * 0.86), 560),
    [screenWidth],
  );
  const cardBubbleWidth = useMemo(
    () => Math.round(screenWidth * 0.9),
    [screenWidth],
  );
  const imageWidth = useMemo(() => Math.min(240, maxBubbleWidth), [maxBubbleWidth]);
  const imageHeight = useMemo(() => Math.round(imageWidth * 0.72), [imageWidth]);

  const openMedicalRecord = (recordId: string) => {
    if (!canOpenMedicalLink) {
      Alert.alert(
        isRTL ? "لا يوجد صلاحية" : "No access",
        isRTL
          ? "المريض لم يمنحك صلاحية عرض السجل الطبي بعد."
          : "The patient has not granted permission to view medical records yet.",
      );
      return;
    }
    router.push({
      pathname: "/medical/[id]",
      params: {
        id: recordId,
        doctorView: patientUserId ? "1" : "0",
        patientUserId: patientUserId ?? "",
      },
    });
  };

  const openMedicalLink = () => {
    if (!item.medicalLink) return;
    openMedicalRecord(item.medicalLink.record_id);
  };

  const openConsultationDiagnosis = () => {
    const meta = item.consultationAction;
    if (!meta || meta.action !== "end") return;
    const diagnosisId = meta.diagnosis_id?.trim();
    if (!diagnosisId) {
      Alert.alert(
        isRTL ? "لا يوجد تشخيص" : "No diagnosis",
        isRTL
          ? "لا يوجد تشخيص مرتبط بهذه الاستشارة."
          : "There is no diagnosis linked to this consultation.",
      );
      return;
    }
    openMedicalRecord(diagnosisId);
  };

  const isAccessAction = item.type === "access_action";
  const isAppointmentAction = item.type === "appointment_action";
  const isConsultationAction = item.type === "consultation_action";
  const isImage = item.type === "image" && !!(item.localAttachmentUrl ?? item.attachmentUrl);
  const isVideo = item.type === "video" && !!(item.localAttachmentUrl ?? item.attachmentUrl);
  const isMedicalLink = item.type === "medical_link" && !!item.medicalLink;
  const isDocumentRequest = item.type === "document_request" && !!item.documentRequest;
  // Card width shared by medical record, document request and consultation
  // cards. `screenWidth` is the whole window on desktop, so the ratio needs the
  // absolute cap beside it to stay a card rather than a banner.
  const compactCardWidth = Math.min(
    maxBubbleWidth,
    Math.round(screenWidth * 0.4),
    360,
  );
  const wideCardWidth = wideActionCards ? cardBubbleWidth : compactCardWidth;
  const medicalBubbleWidth = wideCardWidth;
  // Consultation cards (request / started / ended / rejected) match the medical
  // record card so the thread has one card width.
  const consultationBubbleWidth = wideCardWidth;
  // Lab / x-ray request cards need a definite width — percentage widths collapse
  // when the message column shrink-wraps under alignItems: flex-end on native.
  const documentCardWidth = Math.min(
    maxBubbleWidth,
    Math.round(screenWidth * 0.76),
    340,
  );
  const videoWidth = imageWidth;
  const videoHeight = Math.round(imageWidth * 0.75);
  const responsiveMediaWidth = useMemo(() => {
    if (Platform.OS !== "web") return videoWidth;
    const columnCap = Math.round(maxBubbleWidth * 0.82);
    return Math.min(videoWidth, columnCap, screenWidth - 80);
  }, [maxBubbleWidth, screenWidth, videoWidth]);

  const mediaCaption =
    (isImage || isVideo) && item.text?.trim()
      ? (() => {
          const t = item.text.trim();
          if (t === "Photo" || t === "Video" || t === "Voice message") return null;
          return t;
        })()
      : null;

  const isVoiceMsg = item.type === "voice";

  const bubbleColors =
    isImage || isVideo || isVoiceMsg
      ? { backgroundColor: "transparent", borderWidth: 0 }
      : isDocumentRequest
      ? {
          backgroundColor: "transparent",
          borderWidth: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
        }
      : isMedicalLink || isConsultationAction
      ? {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        }
      : mine
        ? { backgroundColor: colors.primary }
        : {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
          };

  const textColor =
    isMedicalLink || isDocumentRequest || isVoiceMsg || isImage || isVideo
      ? colors.foreground
      : mine
        ? "#fff"
        : colors.foreground;
  const imageUri = item.localAttachmentUrl ?? item.attachmentUrl;

  let body: React.ReactNode = (
    <View>
      <Text
        style={{
          color: textColor,
          fontSize: 14,
          lineHeight: 20,
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {item.text}
      </Text>
      {item.editedAt ? (
        <Text
          style={{
            color: mine ? "rgba(255,255,255,0.65)" : colors.mutedForeground,
            fontSize: 10,
            fontStyle: "italic",
            marginTop: 4,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {isRTL ? "تم التعديل" : "Edited"}
        </Text>
      ) : null}
    </View>
  );

  if (isImage && imageUri) {
    const showLoader = item.pending || !imageLoaded;
    body = (
      <View style={[styles.mediaBlock, { width: imageWidth }]}>
        <Pressable
          onPress={() => {
            const fullUri = item.attachmentUrl ?? item.localAttachmentUrl;
            if (!fullUri) return;
            onImagePress?.(fullUri);
          }}
          onLongPress={onLongPress}
          delayLongPress={400}
          disabled={!(item.attachmentUrl ?? item.localAttachmentUrl)}
          style={[styles.mediaShadow, { width: imageWidth, height: imageHeight }]}
        >
          <View style={[styles.mediaWrap, { width: imageWidth, height: imageHeight }]}>
            {!imageLoaded ? (
              <View
                style={[
                  styles.mediaPlaceholder,
                  { backgroundColor: "#111" },
                ]}
              >
                <ImageIcon size={28} color={colors.mutedForeground} />
              </View>
            ) : null}
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.media,
                { width: imageWidth, height: imageHeight },
                !imageLoaded && styles.mediaHidden,
              ]}
              contentFit="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
            {showLoader ? (
              <View style={styles.mediaOverlay}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
                  {item.pending
                    ? isRTL
                      ? "جاري الإرسال…"
                      : "Sending…"
                    : isRTL
                      ? "جاري التحميل…"
                      : "Loading…"}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
        {mediaCaption ? (
          <Text
            style={[
              styles.mediaCaptionText,
              { color: colors.primary, width: imageWidth, backgroundColor: "transparent" },
            ]}
          >
            {mediaCaption}
          </Text>
        ) : null}
      </View>
    );
  } else if (isVideo && imageUri) {
    body = (
      <View
        style={[
          Platform.OS === "web" ? styles.webMediaFrame : null,
          styles.mediaBlock,
          { width: responsiveMediaWidth },
        ]}
      >
        <ChatInlineVideo
          uri={imageUri}
          width={responsiveMediaWidth}
          height={Math.round(responsiveMediaWidth * 0.75)}
          isRTL={isRTL}
          pending={item.pending}
          onExpand={(uri) => onVideoPress?.(uri)}
          onLongPress={onLongPress}
        />
        {mediaCaption ? (
          <Text
            style={[
              styles.mediaCaptionText,
              {
                color: colors.primary,
                width: responsiveMediaWidth,
                backgroundColor: "transparent",
              },
            ]}
          >
            {mediaCaption}
          </Text>
        ) : null}
      </View>
    );
  } else if (item.type === "voice") {
    body = (
      <VoiceMessagePlayer
        uri={item.localAttachmentUrl ?? item.attachmentUrl}
        pending={item.pending}
        color={colors.primary}
        trackColor={`${colors.primary}33`}
        fillColor={colors.primary}
        isRTL={isRTL}
        rowDir={rowDir}
        onLongPress={onLongPress}
      />
    );
  } else if (isMedicalLink && item.medicalLink) {
    const link = item.medicalLink;
    const typeLabel =
      link.record_type === "lab"
        ? isRTL
          ? "نتيجة مختبر"
          : "Lab result"
        : link.record_type === "xray"
          ? isRTL
            ? "أشعة / مسح"
            : "X-ray / scan"
          : link.record_type === "intake"
            ? isRTL
              ? "فحص متابعة"
              : "Follow-up exam"
            : link.record_type === "prescription"
              ? isRTL
                ? "روشتة"
                : "Prescription"
              : isRTL
                ? "تشخيص"
                : "Diagnosis";
    const RecordIcon =
      link.record_type === "lab"
        ? Beaker
        : link.record_type === "xray"
          ? ScanLine
          : link.record_type === "intake"
            ? ClipboardList
            : link.record_type === "prescription"
              ? Pill
              : Stethoscope;
    const title = link.title?.trim() || (isRTL ? "سجل طبي" : "Medical record");
    const legacyNote =
      item.text?.trim() && item.text.trim() !== title ? item.text.trim() : "";
    const noteText = link.note?.trim() || legacyNote;
    const showNote = !!noteText;

    body = (
      <View style={styles.medicalBody}>
        {showNote ? (
          <Text
            style={[
              styles.medicalNote,
              {
                color: textColor,
                textAlign: isRTL ? "right" : "left",
              },
            ]}
          >
            {noteText}
          </Text>
        ) : null}
        <Pressable
          onPress={openMedicalLink}
          onLongPress={onLongPress}
          delayLongPress={400}
          style={({ pressed }) => [
            styles.medicalCard,
            {
              flexDirection: rowDir,
              opacity: pressed ? 0.85 : 1,
              backgroundColor: `${colors.primary}08`,
              borderColor: `${colors.primary}22`,
            },
          ]}
        >
        <View
          style={[
            styles.medicalIconWrap,
            { backgroundColor: `${colors.primary}15` },
          ]}
        >
          <RecordIcon size={20} color={colors.primary} />
        </View>

        <View style={styles.medicalTextWrap}>
          <Text
            style={[
              styles.medicalType,
              { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
            ]}
          >
            {typeLabel}
          </Text>
          <Text
            style={[
              styles.medicalTitle,
              { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.medicalHint,
              { color: colors.primary, textAlign: isRTL ? "right" : "left" },
            ]}
          >
            {isRTL ? "اضغط للعرض" : "Tap to view"}
          </Text>
        </View>

        <ChevronRight size={18} color={colors.primary} />
        </Pressable>
        {item.editedAt ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 10,
              fontStyle: "italic",
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {isRTL ? "تم التعديل" : "Edited"}
          </Text>
        ) : null}
      </View>
    );
  } else if (isDocumentRequest && item.documentRequest) {
    const req = item.documentRequest;
    const typeLabel =
      req.request_type === "xray"
        ? isRTL
          ? "طلب أشعة"
          : "X-ray request"
        : isRTL
          ? "طلب تحليل"
          : "Lab request";
    const RecordIcon = req.request_type === "xray" ? ScanLine : Beaker;
    const title = req.title?.trim() || (isRTL ? "طلب مستند" : "Document request");
    const desc = req.description?.trim();

    const openRequest = () => {
      if (req.status === "fulfilled") {
        const documentId = req.fulfilled_document_id?.trim();
        if (!documentId) return;
        openMedicalRecord(documentId);
        return;
      }
      if (req.status === "cancelled") return;
      const requestId = req.request_id?.trim();
      if (!requestId) return;
      router.push({
        pathname: "/medical/request/[id]",
        params: {
          id: requestId,
          ...(isDoctor && patientUserId?.trim()
            ? { patientUserId: patientUserId.trim() }
            : {}),
        },
      } as never);
    };

    body = (
      <View style={styles.medicalBody}>
        <Pressable
          onPress={openRequest}
          onLongPress={onLongPress}
          delayLongPress={400}
          style={({ pressed }) => [
            styles.medicalCard,
            styles.documentRequestCard,
            {
              flexDirection: rowDir,
              alignItems: "flex-start",
              opacity: pressed ? 0.88 : 1,
              backgroundColor: `${colors.primary}14`,
              borderColor: `${colors.primary}55`,
            },
          ]}
        >
          <View
            style={[
              styles.medicalIconWrap,
              { backgroundColor: `${colors.primary}22` },
            ]}
          >
            <RecordIcon size={20} color={colors.primary} />
          </View>

          <View style={styles.medicalTextWrap}>
            <Text
              style={[
                styles.medicalType,
                { color: colors.primary, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {typeLabel}
            </Text>
            <Text
              style={[
                styles.medicalTitle,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>
            {desc ? (
              <Text
                style={[
                  styles.medicalHint,
                  {
                    color: colors.mutedForeground,
                    textAlign: isRTL ? "right" : "left",
                    marginTop: 4,
                  },
                ]}
                numberOfLines={3}
              >
                {desc}
              </Text>
            ) : null}
            <Text
              style={[
                styles.medicalHint,
                { color: colors.primary, textAlign: isRTL ? "right" : "left", marginTop: 6 },
              ]}
            >
              {req.status === "fulfilled"
                ? isRTL
                  ? "تم رفع النتيجة — اضغط للعرض"
                  : "Result uploaded — tap to view"
                : req.status === "cancelled"
                  ? isRTL
                    ? "تم إلغاء الطلب"
                    : "Request cancelled"
                  : isRTL
                    ? "اضغط لعرض التفاصيل"
                    : "Tap to view details"}
            </Text>
          </View>

          {req.status === "cancelled" ||
          (req.status === "fulfilled" && !req.fulfilled_document_id?.trim()) ? null : (
            <ChevronRight
              size={18}
              color={colors.primary}
              style={styles.documentRequestChevron}
            />
          )}
        </Pressable>
      </View>
    );
  }

  if (item.failed) {
    body = (
      <Text style={{ color: "#ef4444", fontSize: 13 }}>
        {isRTL ? "تعذر إرسال الرسالة" : "Failed to send"}
      </Text>
    );
  }

  if (isConsultationAction && item.consultationAction) {
    const meta = item.consultationAction;
    const CONSULTATION_TITLES: Record<string, { en: string; ar: string }> = {
      accept: {
        en: "Doctor accepted the consultation",
        ar: "قبل الطبيب الاستشارة",
      },
      reject: {
        en: "Doctor declined the consultation request",
        ar: "رفض الطبيب طلب الاستشارة",
      },
      end: { en: "Consultation ended", ar: "انتهت الاستشارة" },
      cancel: { en: "Consultation cancelled", ar: "أُلغيت الاستشارة" },
      payment_request: {
        en: "Payment required to start the consultation",
        ar: "مطلوب الدفع لبدء الاستشارة",
      },
      payment_submitted: {
        en: "Payment receipt sent",
        ar: "تم إرسال إيصال الدفع",
      },
      payment_approved: {
        en: "Payment approved — consultation started",
        ar: "تم اعتماد الدفع — بدأت الاستشارة",
      },
      payment_rejected: {
        en: "Payment receipt rejected",
        ar: "تم رفض إيصال الدفع",
      },
    };
    const titleCopy = CONSULTATION_TITLES[meta.action] ?? CONSULTATION_TITLES.cancel;
    const title =
      meta.action === "start"
        ? // A request now waits for the doctor rather than starting outright.
          meta.status === "pending"
          ? isRTL
            ? "طلب استشارة — بانتظار رد الطبيب"
            : "Consultation request — waiting for the doctor"
          : isRTL
            ? "بدأت الاستشارة"
            : "Consultation started"
        : isRTL
          ? titleCopy.ar
          : titleCopy.en;
    const reasonType = meta.cancel_reason_type;
    const reasonLabel =
      reasonType === "video_consultation"
        ? isRTL
          ? "يتطلب استشارة فيديو"
          : "Needs a video consultation"
        : reasonType === "onsite_visit"
          ? isRTL
            ? "يتطلب زيارة العيادة"
            : "Needs an on-site visit"
          : reasonType === "other"
            ? isRTL
              ? "سبب آخر"
              : "Other reason"
            : null;
    const accent =
      meta.action === "cancel" ||
      meta.action === "reject" ||
      meta.action === "payment_rejected"
        ? "#dc2626"
        : meta.action === "accept" || meta.action === "payment_approved"
          ? "#10b981"
          : meta.action === "end"
            ? "#0d9488"
            : colors.primary;
    const detail = meta.action === "start" ? null : reasonLabel;
    // Where the patient actually was when they asked (resolved from their IP).
    const patientCountryCode: string = meta.patient_country?.trim() ?? "";
    // patientCountryLabel() defaults to Egypt for unknown codes — show the raw
    // code instead rather than name the wrong country.
    const patientCountryNames =
      PATIENT_COUNTRY_LABELS[patientCountryCode.toUpperCase()];
    const patientCountryLine =
      meta.action === "start" && patientCountryCode
        ? `${isRTL ? "بلد المريض" : "Patient country"}: ${countryFlagEmoji(
            patientCountryCode,
          )} ${
            patientCountryNames
              ? isRTL
                ? patientCountryNames.ar
                : patientCountryNames.en
              : patientCountryCode.toUpperCase()
          }`.trim()
        : null;
    const canOpenDiagnosis =
      meta.action === "end" && !!meta.diagnosis_id?.trim();
    // The doctor answers the request right here in the thread.
    const canAnswerRequest =
      isDoctor &&
      meta.action === "start" &&
      meta.status === "pending" &&
      !!onConsultationAction;
    const card = (
      <>
        <View style={[styles.medicalIconWrap, { backgroundColor: `${accent}22` }]}>
          <Stethoscope size={20} color={accent} />
        </View>
        <View style={styles.medicalTextWrap}>
          <View style={[styles.consultRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {/* Titles like "Consultation request — waiting for the doctor" are
                longer than one line on a phone; let them wrap. */}
            <Text style={[styles.medicalTitle, styles.consultTitle, { color: colors.foreground }]}>
              {title}
            </Text>
            {detail ? (
              <Text style={[styles.consultMeta, { color: accent }]}>{detail}</Text>
            ) : null}
          </View>
          {patientCountryLine ? (
            <Text
              style={[
                styles.consultDesc,
                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {patientCountryLine}
            </Text>
          ) : null}
          {item.text?.trim() ? (
            <Text
              style={[
                styles.consultDesc,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {item.text.trim()}
            </Text>
          ) : null}
          {meta.action === "end" && meta.diagnosis_summary ? (
            <View style={styles.consultDiagnosis}>
              <Text
                style={[
                  styles.consultDiagnosisHeading,
                  { color: accent, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {isRTL ? "التشخيص" : "Diagnosis"}
              </Text>
              <Text
                style={[
                  styles.consultDiagnosisDesc,
                  { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {meta.diagnosis_summary.desc}
              </Text>
              {meta.diagnosis_summary.symptoms?.length ? (
                <View style={styles.consultDiagnosisBlock}>
                  <Text
                    style={[
                      styles.consultDiagnosisSub,
                      { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {isRTL ? "الأعراض" : "Symptoms"}
                  </Text>
                  {meta.diagnosis_summary.symptoms.map((symptom, index) => (
                    <Text
                      key={`${symptom.desc}-${index}`}
                      style={[
                        styles.consultDiagnosisLine,
                        { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                      ]}
                    >
                      • {symptom.desc}
                    </Text>
                  ))}
                </View>
              ) : null}
              {meta.diagnosis_summary.linked_records?.length ? (
                <View style={styles.consultDiagnosisBlock}>
                  <Text
                    style={[
                      styles.consultDiagnosisSub,
                      { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {isRTL ? "نتائج مرتبطة" : "Linked results"}
                  </Text>
                  {meta.diagnosis_summary.linked_records.map((record) => {
                    const typeLabel =
                      record.record_type === "lab"
                        ? isRTL
                          ? "مختبر"
                          : "Lab"
                        : isRTL
                          ? "أشعة"
                          : "X-ray";
                    return (
                      <Text
                        key={record.id}
                        style={[
                          styles.consultDiagnosisLine,
                          { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                        ]}
                      >
                        {typeLabel}: {record.title}
                      </Text>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}
          {canOpenDiagnosis ? (
            <Text
              style={[
                styles.medicalHint,
                { color: accent, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {isRTL ? "اضغط لعرض التشخيص" : "Tap to view diagnosis"}
            </Text>
          ) : null}
          {meta.action === "cancel_request" ? (
            <PendingChangePanel
              meta={meta}
              kind="cancel"
              selfUserId={selfUserId}
              busy={consultationActionBusy}
              onReply={(reply) =>
                onChangeReply?.(
                  {
                    kind: "consultation",
                    id: meta.consultation_id,
                    change: "cancel",
                  },
                  reply,
                )
              }
            />
          ) : null}
          <PaymentActionPanel
            meta={meta}
            isDoctor={isDoctor}
            busy={consultationActionBusy}
            onReply={(reply) =>
              onPaymentReply?.(
                { kind: "consultation", id: meta.consultation_id },
                reply,
              )
            }
          />
        </View>
        {canOpenDiagnosis ? <ChevronRight size={18} color={accent} /> : null}
      </>
    );
    body = (
      <View style={styles.medicalBody}>
        {canOpenDiagnosis ? (
          <Pressable
            onPress={openConsultationDiagnosis}
            onLongPress={onLongPress}
            delayLongPress={400}
            style={({ pressed }) => [
              styles.medicalCard,
              {
                flexDirection: rowDir,
                opacity: pressed ? 0.85 : 1,
                backgroundColor: `${accent}0F`,
                borderColor: `${accent}33`,
              },
            ]}
          >
            {card}
          </Pressable>
        ) : (
          <View
            style={[
              styles.medicalCard,
              {
                flexDirection: rowDir,
                backgroundColor: `${accent}0F`,
                borderColor: `${accent}33`,
              },
            ]}
          >
            {card}
          </View>
        )}

        {canAnswerRequest ? (
          <View style={[styles.apptActions, { flexDirection: rowDir }]}>
            <Pressable
              disabled={consultationActionBusy}
              onPress={() =>
                onConsultationAction?.(meta.consultation_id, "accept")
              }
              style={[
                styles.apptBtn,
                {
                  backgroundColor: "#10b981",
                  opacity: consultationActionBusy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.apptBtnText}>{isRTL ? "قبول" : "Accept"}</Text>
            </Pressable>
            <Pressable
              disabled={consultationActionBusy}
              onPress={() =>
                onConsultationAction?.(meta.consultation_id, "accept_paid")
              }
              style={[
                styles.apptBtn,
                {
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: colors.primary,
                  opacity: consultationActionBusy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.apptBtnText, { color: colors.primary }]}>
                {isRTL ? "قبول مع طلب الدفع" : "Accept & request payment"}
              </Text>
            </Pressable>
            <Pressable
              disabled={consultationActionBusy}
              onPress={() =>
                onConsultationAction?.(meta.consultation_id, "reject")
              }
              style={[
                styles.apptBtn,
                {
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: "#dc2626",
                  opacity: consultationActionBusy ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.apptBtnText, { color: "#dc2626" }]}>
                {isRTL ? "رفض" : "Decline"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  if (isAccessAction) {
    const textAlign = isRTL ? "right" : "left";
    return (
      <View
        style={[
          styles.actionRow,
          {
            alignSelf: mine ? "flex-end" : "flex-start",
            maxWidth: maxBubbleWidth,
          },
        ]}
      >
        <View style={[styles.actionPill, { backgroundColor: `${colors.muted}cc` }]}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              lineHeight: 17,
              textAlign,
              fontWeight: "600",
            }}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  if (isAppointmentAction && item.appointmentAction) {
    const meta = item.appointmentAction;
    const status = appointmentStatus?.status ?? meta.status ?? "pending";
    const meetingLink = appointmentStatus?.meetingLink ?? meta.meeting_link;
    const joinableStatuses = new Set(["confirmed", "waiting", "active"]);
    const canRespond =
      meta.action === "request" && status === "pending" && isDoctor && !mine;
    const hasPendingChange = !!(
      appointmentStatus?.pendingBy ?? meta.pending_by
    );
    const canReschedule =
      showAppointmentControls &&
      status === "confirmed" &&
      !hasPendingChange &&
      isAppointmentStartInFuture(meta.date, meta.time);
    const canCancel =
      showAppointmentControls &&
      (status === "pending" || status === "confirmed") &&
      !hasPendingChange;
    // Past its slot the room is closed server-side, so drop the join link
    // rather than offering a dead door.
    const roomState = appointmentRoomState(meta.date, meta.time, meta.duration_minutes);
    const canJoinMeeting =
      !!meetingLink &&
      showAppointmentControls &&
      !canRespond &&
      roomState !== "over" &&
      joinableStatuses.has(status);

    const textAlign = isRTL ? "right" : "left";

    return (
      <View
        style={[
          styles.actionRow,
          {
            alignSelf: mine ? "flex-end" : "flex-start",
            maxWidth: maxBubbleWidth,
          },
        ]}
      >
        <View style={[styles.actionPill, { backgroundColor: `${colors.muted}cc`, gap: 10 }]}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              lineHeight: 17,
              textAlign,
              fontWeight: "600",
            }}
          >
            {item.text}
          </Text>
          {isDoctor && meta.patient_insight ? (
            <View
              style={[
                styles.apptInsight,
                { backgroundColor: colors.card, borderColor: colors.primary },
              ]}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 11,
                  fontWeight: "800",
                  marginBottom: 4,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {isRTL ? "ملخص الذكاء الاصطناعي عن المريض" : "AI patient insight"}
              </Text>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 12.5,
                  lineHeight: 18,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {meta.patient_insight}
              </Text>
            </View>
          ) : null}
          {showPendingChangePanel &&
          (meta.action === "reschedule_request" || meta.action === "cancel_request") ? (
            <PendingChangePanel
              meta={meta}
              kind={meta.action === "reschedule_request" ? "reschedule" : "cancel"}
              selfUserId={selfUserId}
              busy={appointmentActionBusy}
              onReply={(reply) =>
                onChangeReply?.(
                  {
                    kind: "appointment",
                    id: meta.appointment_id,
                    change:
                      meta.action === "reschedule_request" ? "reschedule" : "cancel",
                  },
                  reply,
                )
              }
            />
          ) : null}
          <PaymentActionPanel
            meta={meta}
            isDoctor={isDoctor}
            busy={appointmentActionBusy}
            inactive={status === "cancelled" || status === "rejected"}
            onReply={(reply) =>
              onPaymentReply?.(
                { kind: "appointment", id: meta.appointment_id },
                reply,
              )
            }
          />
          {canRespond ? (
            <View style={[styles.apptActions, { flexDirection: rowDir }]}>
              <Pressable
                disabled={appointmentActionBusy}
                onPress={() => onAppointmentAction?.(meta.appointment_id, "confirm")}
                style={[styles.apptBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.apptBtnText}>{isRTL ? "قبول" : "Accept"}</Text>
              </Pressable>
              <Pressable
                disabled={appointmentActionBusy}
                onPress={() => onAppointmentAction?.(meta.appointment_id, "reject")}
                style={[styles.apptBtn, { backgroundColor: colors.destructive }]}
              >
                <Text style={styles.apptBtnText}>{isRTL ? "رفض" : "Reject"}</Text>
              </Pressable>
            </View>
          ) : null}
          {canReschedule && onRescheduleRequest ? (
            <Pressable
              disabled={appointmentActionBusy}
              onPress={() => onRescheduleRequest(meta.appointment_id)}
              style={[styles.apptBtnOutline, { borderColor: colors.primary }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>
                {isRTL ? "تغيير الموعد" : "Change time"}
              </Text>
            </Pressable>
          ) : null}
          {canCancel && onAppointmentAction ? (
            <Pressable
              disabled={appointmentActionBusy}
              onPress={() => onAppointmentAction(meta.appointment_id, "cancel")}
              style={[styles.apptBtnOutline, { borderColor: colors.destructive }]}
            >
              <Text style={{ color: colors.destructive, fontWeight: "700", fontSize: 12 }}>
                {status === "confirmed"
                  ? isRTL
                    ? "طلب إلغاء الموعد"
                    : "Request cancellation"
                  : isRTL
                    ? "إلغاء الموعد"
                    : "Cancel appointment"}
              </Text>
            </Pressable>
          ) : null}
          {canJoinMeeting ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/video-call",
                  params: {
                    meetingUrl: meetingLink,
                    ...(meta.duration_minutes
                      ? { durationMinutes: String(meta.duration_minutes) }
                      : {}),
                    ...(conversationPeerId || patientUserId
                      ? { peerUserId: conversationPeerId ?? patientUserId }
                      : {}),
                  },
                })
              }
              style={[styles.apptBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.apptBtnText}>{isRTL ? "انضم للاجتماع" : "Join meeting"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const isVoice = isVoiceMsg;
  const bubbleStyle = [
    styles.bubble,
    isVoice && styles.voiceBubble,
    isImage && styles.imageBubble,
    isVideo && styles.imageBubble,
    isMedicalLink && styles.medicalBubble,
    isDocumentRequest && styles.documentRequestBubble,
    isConsultationAction && styles.medicalBubble,
    bubbleColors,
    isMedicalLink && { width: medicalBubbleWidth, maxWidth: "100%" as const },
    isDocumentRequest && {
      width: documentCardWidth,
      maxWidth: "100%" as const,
      flexShrink: 0,
    },
    isConsultationAction && {
      width: consultationBubbleWidth,
      maxWidth: "100%" as const,
    },
    highlighted && {
      borderWidth: 2,
      borderColor: colors.primary,
    },
  ];

  const readTicks =
    mine && !item.pending && !isAccessAction ? (
      <View style={[styles.readRow, { flexDirection: rowDir }]}>
        {item.readAt ? (
          <CheckCheck
            size={14}
            color={
              isVoice || isImage || isVideo
                ? colors.primary
                : "rgba(255,255,255,0.9)"
            }
          />
        ) : (
          <Check
            size={14}
            color={
              isVoice || isImage || isVideo
                ? colors.mutedForeground
                : "rgba(255,255,255,0.65)"
            }
          />
        )}
      </View>
    ) : null;

  return (
    <View
      style={[
        styles.wrap,
        {
          alignSelf: mine ? "flex-end" : "flex-start",
          maxWidth: isDocumentRequest
            ? documentCardWidth
            : (isMedicalLink || isConsultationAction) && wideActionCards
              ? cardBubbleWidth
              : maxBubbleWidth,
          ...(isDocumentRequest ? { width: documentCardWidth } : null),
        },
        (item.emotions?.length ?? 0) > 0 && styles.wrapWithReactions,
      ]}
    >
      {/* Voice uses View so the scrubber PanResponder isn't blocked by Pressable. */}
      {isVoice ? (
        <View style={bubbleStyle}>
          {body}
          {readTicks}
        </View>
      ) : (
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={400}
          disabled={!onLongPress}
          style={({ pressed }) => [
            ...bubbleStyle,
            pressed && onLongPress ? { opacity: 0.92 } : null,
          ]}
        >
          {body}
          {readTicks}
        </Pressable>
      )}
      <MessageEmotionsBar
        emotions={item.emotions ?? []}
        selfUserId={selfUserId}
        align={mine ? "left" : "right"}
        onToggle={onEmotionToggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    flexShrink: 1,
  },
  wrapWithReactions: {
    marginBottom: 10,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    flexShrink: 1,
  },
  voiceBubble: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 200,
  },
  imageBubble: {
    padding: 0,
    borderRadius: 12,
    overflow: "visible",
    borderWidth: 0,
  },
  webMediaFrame: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  mediaBlock: {
    alignSelf: "stretch",
    overflow: "visible",
  },
  mediaShadow: {
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#1a2132",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    boxShadow: "0 4px 14px rgba(26, 33, 50, 0.16)",
  },
  mediaCaptionText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  mediaWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  mediaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  media: {
    borderRadius: 12,
  },
  mediaHidden: {
    opacity: 0,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
  },
  readRow: {
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  medicalBubble: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  documentRequestBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    overflow: "visible",
  },
  medicalBody: {
    width: "100%",
    gap: 8,
  },
  medicalNote: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  medicalCard: {
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  documentRequestCard: {
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  documentRequestChevron: {
    flexShrink: 0,
    marginTop: 2,
  },
  medicalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  medicalTextWrap: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  medicalType: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  medicalTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  medicalHint: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  consultRow: {
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  // Wrapping needs a flexible basis, or the title is squeezed to an ellipsis.
  consultTitle: {
    flexShrink: 1,
    minWidth: 0,
  },
  consultMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  consultDesc: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  consultDiagnosis: {
    marginTop: 10,
    gap: 4,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  consultDiagnosisHeading: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  consultDiagnosisDesc: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
  consultDiagnosisBlock: {
    marginTop: 6,
    gap: 2,
  },
  consultDiagnosisSub: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  consultDiagnosisLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexShrink: 1,
    paddingVertical: 4,
    width: "100%",
  },
  actionPill: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  apptActions: {
    gap: 8,
    justifyContent: "flex-start",
  },
  apptInsight: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  apptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  apptBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  apptBtnOutline: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
