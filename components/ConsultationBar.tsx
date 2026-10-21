import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import {
  Check,
  CircleAlert,
  CircleStop,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Square,
  Stethoscope,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { MedicalRecordPicker } from "@/components/MedicalRecordPicker";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { FullscreenVideoViewer } from "@/components/FullscreenVideoViewer";
import {
  ConsultationMediaPreview,
  type ConsultationMediaItem,
} from "@/components/consultations/ConsultationMediaPreview";
import { DiagnosisChatModal } from "@/components/DiagnosisChatModal";
import { uploadFile } from "@/domains/medical/api";
import {
  fetchComplaintStatus,
  fileComplaint,
  type ComplaintStatus,
} from "@/domains/complaints/api";
import { mimeFromUri, resolveWebVoiceFile } from "@/utils/chatMedia";
import {
  acceptConsultation,
  cancelConsultation,
  endConsultation,
  rejectConsultation,
  fetchActiveConsultation,
  startConsultation,
  type Consultation,
} from "@/domains/consultations/api";
import type {
  ConsultationActionMeta,
  ConsultationCancelReasonType,
} from "@/domains/chat/types";
import { useChatStore } from "@/domains/chat/store";
import { fetchAllMedicalHistory } from "@/domains/medical/api";
import type { MedicalRecord } from "@/domains/medical/types";
import type { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import type { ChatAction } from "@/components/chat/ChatActionsMenu";
import { useI18n } from "@/hooks/useI18n";
import { useRemoveConsultation } from "@/hooks/useRemoveConsultation";

type SelectedRecord = { record: MedicalRecord; note?: string };
type MediaAttachment = ConsultationMediaItem;

type Colors = ReturnType<typeof useColors>;

interface Props {
  peerId: string;
  isPatient: boolean;
  isDoctor: boolean;
  enabled: boolean;
  token: string;
  isRTL: boolean;
  colors: Colors;
  /** Current user's own id and role (needed to send attached records). */
  selfId: string;
  selfRole: string;
  /** Most recent consultation_action from the live message list, if any. */
  latestAction?: ConsultationActionMeta | null;
  /** Reports whether a consultation is currently open between the pair. */
  onOpenChange?: (open: boolean) => void;
  /** Fired after a request is sent or answered, so the thread can scroll. */
  onThreadUpdated?: () => void;
  /** Active open consultation (for diagnosis AI draft / linking). */
  onActiveChange?: (consultation: Consultation | null) => void;
  /** Render the pills bare (no bar wrapper) so they can sit inside another row. */
  compact?: boolean;
  /**
   * Hide inline pills and publish them as chat-menu actions instead
   * (plus-button context window). Modals still render here.
   */
  menuOnly?: boolean;
  onMenuActionsChange?: (actions: ChatAction[]) => void;
  /** Explicit consultation to remove (e.g. from consultations list deep link). */
  removeConsultationId?: string | null;
}

const CANCEL_REASONS: {
  key: ConsultationCancelReasonType;
  en: string;
  ar: string;
}[] = [
  { key: "video_consultation", en: "Needs video consultation", ar: "يتطلب استشارة فيديو" },
  { key: "onsite_visit", en: "Needs on-site visit", ar: "يتطلب زيارة العيادة" },
  { key: "other", en: "Other", ar: "أخرى" },
];

export function ConsultationBar({
  peerId,
  isPatient,
  isDoctor,
  enabled,
  token,
  isRTL,
  colors,
  selfId,
  selfRole,
  latestAction,
  onOpenChange,
  onActiveChange,
  onThreadUpdated,
  compact = false,
  menuOnly = false,
  onMenuActionsChange,
  removeConsultationId,
}: Props) {
  const { t } = useI18n();
  const { remove: removeConsultationById } = useRemoveConsultation();
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [active, setActive] = useState<Consultation | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<null | "start" | "end" | "cancel">(null);
  const [submitting, setSubmitting] = useState(false);

  // attachments for the start dialog
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<SelectedRecord[]>([]);
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const recordingStartedAt = useRef(0);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);

  // complaint state (patient, after an ended consultation)
  const [complaintStatus, setComplaintStatus] = useState<ComplaintStatus | null>(null);
  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintReason, setComplaintReason] = useState("");

  // form state
  const [description, setDescription] = useState("");
  const [reasonType, setReasonType] = useState<ConsultationCancelReasonType>(
    "video_consultation",
  );
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!enabled || !peerId || !token) return;
    try {
      const c = await fetchActiveConsultation(peerId, token);
      setActive(c);
    } catch {
      setActive(null);
    } finally {
      setLoaded(true);
    }
  }, [enabled, peerId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Sync with realtime consultation_action messages arriving in the thread.
  useEffect(() => {
    if (!latestAction) return;
    // Payment steps keep the consultation alive: it is pending until the
    // doctor approves the receipt, and open the moment they do.
    const OPENS = ["accept", "payment_approved"];
    const PENDS = ["start", "payment_request", "payment_submitted", "payment_rejected"];
    const opens = OPENS.includes(latestAction.action);
    if (opens || PENDS.includes(latestAction.action)) {
      const status = opens ? "open" : "pending";
      setActive((prev) =>
        prev?.id === latestAction.consultation_id && prev.status === status
          ? prev
          : ({
              ...(prev?.id === latestAction.consultation_id ? prev : {}),
              id: latestAction.consultation_id,
              status,
              reserved_points: latestAction.reserved_points ?? 0,
            } as Consultation),
      );
    } else {
      setActive(null);
    }
  }, [latestAction]);

  // Never report "no consultation" before the first load has answered. The
  // composer swaps layout on that flag, which remounts this bar and resets
  // `active` — reporting the reset state back flipped it straight again and
  // the chat flickered between the two composer layouts forever.
  useEffect(() => {
    if (!loaded) return;
    onOpenChange?.(active?.status === "open");
    onActiveChange?.(active?.status === "open" ? active : null);
  }, [active, loaded, onOpenChange, onActiveChange]);

  // A patient may complain about the most recently ended consultation.
  const endedConsultationId =
    latestAction?.action === "end" ? latestAction.consultation_id : null;
  useEffect(() => {
    if (!isPatient || !endedConsultationId) {
      setComplaintStatus(null);
      return;
    }
    fetchComplaintStatus(token, endedConsultationId)
      .then((r) => setComplaintStatus(r.exists ? r.status ?? null : null))
      .catch(() => setComplaintStatus(null));
  }, [isPatient, endedConsultationId, token]);

  // Load the patient's own records once the start dialog opens.
  useEffect(() => {
    if (modal !== "start" || !isPatient || !selfId || records.length > 0) return;
    setRecordsLoading(true);
    fetchAllMedicalHistory(selfId, token, selfRole)
      .then(setRecords)
      .catch(() => setRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [modal, isPatient, selfId, token, selfRole, records.length]);

  const label = (en: string, ar: string) => (isRTL ? ar : en);

  const closeStart = () => {
    setModal(null);
    setSelectedRecords([]);
    setMedia([]);
    setPreviewImageUri(null);
    setPreviewVideoUri(null);
  };

  const pickMedia = async (kind: "image" | "video") => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          showErrorToast(label("Permission required", "الإذن مطلوب"));
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === "image" ? ["images"] : ["videos"],
        quality: 0.85,
        allowsEditing: kind === "image",
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const uploaded = await uploadFile(
        asset.uri,
        asset.mimeType ?? (kind === "image" ? "image/jpeg" : "video/mp4"),
        asset.fileName ?? `${kind}-${Date.now()}.${kind === "video" ? "mp4" : "jpg"}`,
        token,
        asset.file,
      );
      setMedia((prev) => [
        ...prev,
        { type: kind, url: uploaded.url, previewUri: asset.uri },
      ]);
    } catch (e) {
      showErrorToast(label("Upload failed", "تعذر الرفع"), (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      try {
        const startedAt = recordingStartedAt.current || Date.now();
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        if (!uri || Date.now() - startedAt < 800) return;
        setUploading(true);
        let uploaded;
        if (Platform.OS === "web") {
          const { webFile, mimeType, fileName } = await resolveWebVoiceFile(uri, "audio/webm");
          uploaded = await uploadFile(uri, mimeType, fileName, token, webFile);
        } else {
          const mime = mimeFromUri(uri, Platform.OS === "ios" ? "audio/m4a" : "audio/mp4");
          const ext = uri.split(".").pop() ?? "m4a";
          uploaded = await uploadFile(uri, mime, `voice-${Date.now()}.${ext}`, token);
        }
        setMedia((prev) => [...prev, { type: "voice", url: uploaded.url, previewUri: uri }]);
      } catch (e) {
        setRecording(null);
        showErrorToast(label("Recording failed", "تعذر التسجيل"), (e as Error).message);
      } finally {
        setUploading(false);
      }
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        showErrorToast(label("Microphone permission required", "إذن الميكروفون مطلوب"));
        return;
      }
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });
      }
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingStartedAt.current = Date.now();
      setRecording(rec);
    } catch (e) {
      setRecording(null);
      showErrorToast(label("Could not start recording", "تعذر بدء التسجيل"), (e as Error).message);
    }
  };

  const submitStart = async () => {
    setSubmitting(true);
    try {
      const res = await startConsultation(peerId, description.trim(), token);
      setActive(res.consultation);
      // Consultation is now open, so these pass the messaging gate.
      for (const { type, url } of media) {
        await sendMessage(
          peerId,
          { recipientId: peerId, type, attachmentUrl: url },
          token,
          selfId,
          selfRole,
        ).catch(() => undefined);
      }
      for (const { record, note: recNote } of selectedRecords) {
        await sendMessage(
          peerId,
          {
            recipientId: peerId,
            type: "medical_link",
            content: recNote?.trim() || record.title,
            medicalLink: {
              record_type: record.category,
              record_id: record.id,
              title: record.title,
              ...(recNote?.trim() ? { note: recNote.trim() } : {}),
            },
          },
          token,
          selfId,
          selfRole,
        ).catch(() => undefined);
      }
      setModal(null);
      setDescription("");
      setSelectedRecords([]);
      setMedia([]);
      showSuccessToast(t.consultations.consultationStarted);
      // The request lands in the thread — put the patient on it.
      onThreadUpdated?.();
    } catch (e) {
      showErrorToast(t.consultations.couldNotStart, (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitEnd = async (
    payload: import("@/components/DiagnosisChatForm").DiagnosisSubmitPayload,
  ) => {
    if (!active) return;
    setSubmitting(true);
    try {
      const desc = payload.description.trim();
      await endConsultation(
        active.id,
        {
          note: payload.note?.trim(),
          diagnosis_details: {
            desc,
            body_part: payload.bodyPart,
            symptoms: payload.symptoms.map((s) => ({ desc: s })),
            document_ids:
              payload.documentIds.length > 0 ? payload.documentIds : undefined,
            prescription_id: payload.prescription_id,
            prescription: payload.prescription,
            intake_exam_assignment_id: payload.intake_exam_assignment_id,
            intake_exam: payload.intake_exam,
          },
        },
        token,
      );
      setActive(null);
      setModal(null);
      showSuccessToast(label("Consultation ended", "انتهت الاستشارة"));
    } catch (e) {
      showErrorToast(label("Could not end", "تعذر الإنهاء"), (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitCancel = async () => {
    if (!active) return;
    if (reasonType === "other" && !reason.trim()) {
      showErrorToast(label("Reason required", "السبب مطلوب"));
      return;
    }
    setSubmitting(true);
    try {
      await cancelConsultation(active.id, { reason_type: reasonType, reason: reason.trim() }, token);
      setActive(null);
      setModal(null);
      setReason("");
      showSuccessToast(label("Consultation cancelled", "أُلغيت الاستشارة"));
    } catch (e) {
      showErrorToast(label("Could not cancel", "تعذر الإلغاء"), (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitComplaint = async () => {
    if (!endedConsultationId || complaintReason.trim().length < 3) {
      showErrorToast(label("Reason required", "السبب مطلوب"));
      return;
    }
    setSubmitting(true);
    try {
      const r = await fileComplaint(token, endedConsultationId, complaintReason.trim());
      setComplaintStatus(r.status);
      setComplaintModal(false);
      setComplaintReason("");
      showSuccessToast(label("Complaint submitted", "تم إرسال الشكوى"));
    } catch (e) {
      showErrorToast(label("Could not submit", "تعذر الإرسال"), (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  /** Doctor answers a pending request; the patient is told either way. */
  const answerRequest = async (answer: "accept" | "reject") => {
    if (!active || submitting) return;
    setSubmitting(true);
    try {
      const res =
        answer === "accept"
          ? await acceptConsultation(active.id, token)
          : await rejectConsultation(active.id, token);
      setActive(answer === "accept" ? res.consultation : null);
      onThreadUpdated?.();
      showSuccessToast(
        answer === "accept"
          ? label("Consultation accepted", "تم قبول الاستشارة")
          : label("Request declined", "تم رفض الطلب"),
      );
    } catch (e) {
      showErrorToast(
        e instanceof Error
          ? e.message
          : label("Could not answer the request", "تعذر الرد على الطلب"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const dir = isRTL ? "row-reverse" : "row";
  const isOpen = active?.status === "open";
  // Waiting on the doctor: the patient cannot start another, and the doctor
  // gets accept / decline instead of "end".
  const isPending = active?.status === "pending";
  const removableConsultationId =
    removeConsultationId ?? active?.id ?? latestAction?.consultation_id ?? null;

  const handleRemoveConsultation = useCallback(() => {
    if (!removableConsultationId) return;
    removeConsultationById(removableConsultationId, peerId, () => {
      setActive(null);
      onOpenChange?.(false);
      onActiveChange?.(null);
      onThreadUpdated?.();
    });
  }, [
    removableConsultationId,
    removeConsultationById,
    peerId,
    onOpenChange,
    onActiveChange,
    onThreadUpdated,
  ]);
  const complaintLabel =
    complaintStatus === "pending"
      ? label("Complaint under review", "الشكوى قيد المراجعة")
      : complaintStatus === "accepted"
        ? label("Complaint accepted — refunded", "تم قبول الشكوى — تم الاسترداد")
        : complaintStatus === "rejected"
          ? label("Complaint rejected", "تم رفض الشكوى")
          : null;

  // Compact mode drops the standalone bar so the pills sit in the chat actions row.
  const Bar = ({ children }: { children: React.ReactNode }) =>
    compact ? (
      <>{children}</>
    ) : (
      <View style={[styles.bar, { flexDirection: dir, borderTopColor: colors.border }]}>
        {children}
      </View>
    );

  useEffect(() => {
    if (!enabled || !onMenuActionsChange) {
      onMenuActionsChange?.([]);
      return;
    }

    const next: ChatAction[] = [];
    if (isPatient && !isOpen && !isPending) {
      next.push({
        key: "consult-start",
        label: label("Start consultation", "بدء استشارة"),
        Icon: Stethoscope,
        color: colors.primary,
        onPress: () => setModal("start"),
      });
      if (endedConsultationId && !complaintLabel) {
        next.push({
          key: "consult-complaint",
          label: label("File a complaint", "تقديم شكوى"),
          Icon: CircleAlert,
          color: "#dc2626",
          onPress: () => setComplaintModal(true),
        });
      }
    }
    if (isDoctor && isPending) {
      next.push({
        key: "consult-accept",
        label: label("Accept request", "قبول الطلب"),
        Icon: Check,
        color: "#10b981",
        onPress: () => void answerRequest("accept"),
      });
      next.push({
        key: "consult-reject",
        label: label("Decline request", "رفض الطلب"),
        Icon: X,
        color: "#dc2626",
        onPress: () => void answerRequest("reject"),
      });
    }
    if (isDoctor && isOpen) {
      next.push({
        key: "consult-end",
        label: label("End consultation", "إنهاء الاستشارة"),
        Icon: CircleStop,
        color: colors.primary,
        onPress: () => setModal("end"),
      });
    }
    if (removableConsultationId) {
      next.push({
        key: "consult-remove",
        label: t.consultations.removeConsultation,
        Icon: Trash2,
        color: "#dc2626",
        onPress: handleRemoveConsultation,
      });
    }
    onMenuActionsChange(next);
  }, [
    enabled,
    onMenuActionsChange,
    isPatient,
    isDoctor,
    isOpen,
    isPending,
    endedConsultationId,
    complaintLabel,
    removableConsultationId,
    handleRemoveConsultation,
    t.consultations.removeConsultation,
    colors.primary,
    isRTL,
  ]);

  useEffect(() => {
    if (!onMenuActionsChange) return;
    return () => onMenuActionsChange([]);
  }, [onMenuActionsChange]);

  if (!enabled) return null;

  return (
    <>
      {/* Patient: start (+ complaint after an ended consultation). Doctor: end. */}
      {!menuOnly && isPatient && !isOpen ? (
        <Bar>
          <Pill
            label={label("Start consultation", "بدء استشارة")}
            color={colors.primary}
            filled
            onPress={() => setModal("start")}
            Icon={Stethoscope}
          />
          {endedConsultationId ? (
            complaintLabel ? (
              <Text
                style={[
                  styles.status,
                  {
                    color: colors.mutedForeground,
                    textAlign: isRTL ? "right" : "left",
                    flexShrink: 1,
                  },
                ]}
              >
                {complaintLabel}
              </Text>
            ) : (
              <Pill
                label={label("File a complaint", "تقديم شكوى")}
                color="#dc2626"
                onPress={() => setComplaintModal(true)}
                Icon={CircleAlert}
              />
            )
          ) : null}
        </Bar>
      ) : null}

      {!menuOnly && isDoctor && isOpen ? (
        <Bar>
          <Pill
            label={label("End consultation", "إنهاء الاستشارة")}
            color={colors.primary}
            filled
            onPress={() => setModal("end")}
            Icon={CircleStop}
          />
        </Bar>
      ) : null}

      {/* Start modal */}
      <FormModal
        visible={modal === "start"}
        title={label("Start consultation", "بدء استشارة")}
        onClose={closeStart}
        onSubmit={submitStart}
        submitting={submitting}
        submitLabel={label("Start", "بدء")}
        colors={colors}
        isRTL={isRTL}
      >
        <FieldLabel colors={colors} isRTL={isRTL}>
          {label("Describe your problem", "صف مشكلتك")}
        </FieldLabel>
        <Input
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={label("Symptoms, duration, concerns...", "الأعراض، المدة، مخاوفك...")}
          colors={colors}
          isRTL={isRTL}
        />

        <FieldLabel colors={colors} isRTL={isRTL}>
          {label("Attachments", "المرفقات")}
        </FieldLabel>
        <View style={[styles.attachRow, { flexDirection: dir }]}>
          <AttachChip
            Icon={ImageIcon}
            text={label("Image", "صورة")}
            onPress={() => void pickMedia("image")}
            disabled={uploading || !!recording}
            colors={colors}
          />
          <AttachChip
            Icon={VideoIcon}
            text={label("Video", "فيديو")}
            onPress={() => void pickMedia("video")}
            disabled={uploading || !!recording}
            colors={colors}
          />
          <AttachChip
            Icon={recording ? Square : Mic}
            text={recording ? label("Stop", "إيقاف") : label("Voice", "صوت")}
            onPress={() => void toggleRecording()}
            disabled={uploading}
            active={!!recording}
            colors={colors}
          />
        </View>
        {uploading ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {label("Uploading…", "جاري الرفع…")}
          </Text>
        ) : null}
        {media.map((m, i) => (
          <ConsultationMediaPreview
            key={`${m.type}-${m.url}-${i}`}
            item={m}
            isRTL={isRTL}
            colors={colors}
            onRemove={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
            onExpandImage={setPreviewImageUri}
            onExpandVideo={setPreviewVideoUri}
          />
        ))}

        <FieldLabel colors={colors} isRTL={isRTL}>
          {label("Medical records", "السجلات الطبية")}
        </FieldLabel>
        {selectedRecords.map(({ record }) => (
          <View
            key={record.id}
            style={[styles.recordRow, { flexDirection: dir, borderColor: colors.border }]}
          >
            <FileText size={16} color={colors.primary} />
            <Text
              style={[styles.recordName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={1}
            >
              {record.title}
            </Text>
            <Pressable
              onPress={() =>
                setSelectedRecords((prev) => prev.filter((r) => r.record.id !== record.id))
              }
              hitSlop={8}
            >
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.attachBtn, { borderColor: colors.primary, flexDirection: dir }]}
        >
          <Paperclip size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            {label("Attach medical record", "إرفاق سجل طبي")}
          </Text>
        </Pressable>

      </FormModal>

      <FullscreenImageViewer
        uri={previewImageUri}
        onClose={() => setPreviewImageUri(null)}
      />
      <FullscreenVideoViewer
        uri={previewVideoUri}
        onClose={() => setPreviewVideoUri(null)}
      />

      <MedicalRecordPicker
        visible={pickerOpen}
        records={records}
        loading={recordsLoading}
        isRTL={isRTL}
        includeIntake
        onClose={() => setPickerOpen(false)}
        onSelect={(record, note) => {
          setSelectedRecords((prev) =>
            prev.some((r) => r.record.id === record.id)
              ? prev
              : [...prev, { record, note }],
          );
          setPickerOpen(false);
        }}
      />

      {/* End modal — diagnosis (optional) + closing note, then end consultation */}
      <DiagnosisChatModal
        visible={modal === "end"}
        isRTL={isRTL}
        patientUserId={peerId}
        accessToken={token}
        consultationId={active?.id}
        saving={submitting}
        title={label("End consultation", "إنهاء الاستشارة")}
        submitLabel={label("End consultation", "إنهاء الاستشارة")}
        noteLabel={label("Closing note (optional)", "ملاحظة ختامية (اختياري)")}
        notePlaceholder={label("Summary for the patient...", "ملخص للمريض...")}
        requireDescription
        onClose={() => {
          if (submitting) return;
          setModal(null);
        }}
        onSubmit={(payload) => void submitEnd(payload)}
      />

      {/* Cancel modal */}
      <FormModal
        visible={modal === "cancel"}
        title={label("Cancel consultation", "إلغاء الاستشارة")}
        onClose={() => setModal(null)}
        onSubmit={submitCancel}
        submitting={submitting}
        submitLabel={label("Cancel consultation", "إلغاء الاستشارة")}
        destructive
        colors={colors}
        isRTL={isRTL}
      >
        <FieldLabel colors={colors} isRTL={isRTL}>
          {label("Reason", "السبب")}
        </FieldLabel>
        <View style={styles.reasonWrap}>
          {CANCEL_REASONS.map((r) => {
            const activeSel = reasonType === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setReasonType(r.key)}
                style={[
                  styles.reasonChip,
                  {
                    backgroundColor: activeSel ? `${colors.primary}18` : colors.muted,
                    borderColor: activeSel ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: activeSel ? colors.primary : colors.foreground,
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {label(r.en, r.ar)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Input
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder={label("Add details (required for Other)...", "أضف تفاصيل (مطلوب لأخرى)...")}
          colors={colors}
          isRTL={isRTL}
        />
      </FormModal>

      {/* Complaint modal (patient) */}
      <FormModal
        visible={complaintModal}
        title={label("File a complaint", "تقديم شكوى")}
        onClose={() => setComplaintModal(false)}
        onSubmit={submitComplaint}
        submitting={submitting}
        submitLabel={label("Submit complaint", "إرسال الشكوى")}
        destructive
        colors={colors}
        isRTL={isRTL}
      >
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {t.consultations.complaintHint}
        </Text>
        <Input
          value={complaintReason}
          onChangeText={setComplaintReason}
          multiline
          placeholder={label("Describe the issue...", "صف المشكلة...")}
          colors={colors}
          isRTL={isRTL}
        />
      </FormModal>
    </>
  );
}

function Pill({
  label,
  color,
  filled,
  onPress,
  Icon = Stethoscope,
}: {
  label: string;
  color: string;
  filled?: boolean;
  onPress: () => void;
  Icon?: typeof Stethoscope;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: filled ? color : "transparent",
          borderColor: color,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon size={15} color={filled ? "#fff" : color} strokeWidth={2.4} />
      <Text style={{ color: filled ? "#fff" : color, fontWeight: "800", fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function AttachChip({
  Icon,
  text,
  onPress,
  disabled,
  active,
  colors,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  text: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  colors: Colors;
}) {
  const tint = active ? "#dc2626" : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.attachChip,
        {
          borderColor: active ? "#dc2626" : colors.border,
          backgroundColor: active ? "#dc26261a" : colors.muted,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Icon size={16} color={tint} />
      <Text style={{ color: active ? "#dc2626" : colors.foreground, fontWeight: "700", fontSize: 12 }}>
        {text}
      </Text>
    </Pressable>
  );
}

function FormModal({
  visible,
  title,
  children,
  onClose,
  onSubmit,
  submitting,
  submitLabel,
  destructive,
  colors,
  isRTL,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  submitting: boolean;
  submitLabel: string;
  destructive?: boolean;
  colors: Colors;
  isRTL: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sheetHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {children}
          <Pressable
            onPress={() => {
              void Promise.resolve(onSubmit());
            }}
            disabled={submitting}
            style={[
              styles.submit,
              { backgroundColor: destructive ? "#dc2626" : colors.primary, opacity: submitting ? 0.7 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{submitLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function FieldLabel({
  children,
  colors,
  isRTL,
}: {
  children: React.ReactNode;
  colors: Colors;
  isRTL: boolean;
}) {
  return (
    <Text
      style={[
        styles.fieldLabel,
        { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
      ]}
    >
      {children}
    </Text>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  colors,
  isRTL,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  colors: Colors;
  isRTL: boolean;
}) {
  return (
    <AppTextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      multiline={multiline}
      style={[
        styles.input,
        multiline && styles.inputMultiline,
        {
          color: colors.foreground,
          borderColor: colors.border,
          backgroundColor: colors.background,
          textAlign: isRTL ? "right" : "left",
          textAlignVertical: multiline ? "top" : "center",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  status: { fontSize: 13, fontWeight: "600" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  sheetHead: { alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 84, paddingTop: 11 },
  hint: { fontSize: 12, lineHeight: 17 },
  recordRow: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recordName: { flex: 1, fontSize: 14, fontWeight: "600" },
  attachBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 11,
  },
  attachRow: { gap: 8, flexWrap: "wrap" },
  attachChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reasonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  submit: {
    marginTop: 6,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
