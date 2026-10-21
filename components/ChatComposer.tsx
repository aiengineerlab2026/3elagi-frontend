import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { ClipboardList, Mic, Paperclip, Send, Trash2, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";

import { ChatActionsMenu, type ChatAction } from "@/components/chat/ChatActionsMenu";
import { VoiceMessagePlayer } from "@/components/chat/VoiceMessagePlayer";
import { ChatAttachMenu } from "@/components/chat/ChatAttachMenu";
import { ChatAttachmentPreview } from "@/components/chat/ChatAttachmentPreview";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { FullscreenVideoViewer } from "@/components/FullscreenVideoViewer";
import {
  MOBILE_WEB_COMPOSER_FOOTER_GAP,
  mobileWebComposerStyles,
} from "@/constants/mobileWebComposer";
import { uploadFile, createMedicalRecordFromChatImage } from "@/domains/medical/api";
import { getApiLang } from "@/domains/i18n/store";
import type { ChatMessage, SendMessageInput } from "@/domains/chat/types";
import {
  MedicalImageAttachOptions,
  type MedicalImageAttachOptionsValue,
} from "@/components/medical/MedicalImageAttachOptions";
import { useFieldDictation } from "@/hooks/useFieldDictation";
import {
  emitConversationStopTyping,
  emitConversationTyping,
} from "@/domains/chat/conversationSocket";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";
import { handleEnterToSendMessage } from "@/utils/enterToSendMessage";
import { isNativeWebViewShell } from "@/utils/nativeWebViewBridge";
import {
  cameraErrorMessage,
  pickNativeShellCamera,
} from "@/utils/nativeWebViewMedia";
import type { NativeShellCameraMediaResult } from "@/constants/nativeWebViewBridge";
import {
  CHAT_VIDEO_PICKER_OPTIONS,
  getChatVideoLimitViolation,
} from "@/utils/chatVideoLimits";
import { scanDocumentPage } from "@/utils/documentScanner";
import { chatFlexRow } from "@/utils/rtl";
import { showSuccessToast } from "@/utils/toast";

interface Props {
  isRTL: boolean;
  isPatient: boolean;
  selfId: string;
  accessToken: string;
  peerId: string;
  sending: boolean;
  bottomInset: number;
  onSend: (input: SendMessageInput, replaceTempId?: string) => Promise<void>;
  onAddPending: (message: ChatMessage) => void;
  onFailPending: (tempId: string) => void;
  onPickMedical: () => void;
  /** Extra chat actions listed in the plus menu (diagnosis, booking, Ask AI…). */
  actions?: ChatAction[];
  /** Rendered beside the plus button (start/end consultation pill). */
  inlineAction?: React.ReactNode;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  onEdit?: (messageId: string, content: string) => Promise<void>;
  onComposerFocus?: () => void;
  onComposerBlur?: () => void;
  disabled?: boolean;
  disabledHint?: string;
  /** Replaces the disabled hint with centered call-to-action buttons. */
  disabledActions?: ChatAction[];
  /** Patient-only: show medical record + AI insight options on image attach. */
  canStoreImageInMedicalRecord?: boolean;
  medicalRecordPatientUserId?: string;
  onMedicalRecordCreated?: () => void;
}

/** A finished recording awaiting the user's review. */
type PendingVoice = {
  uri: string;
  mimeType: string;
  fileName: string;
  webFile?: File | Blob;
};

type PendingAttachment = {
  uri: string;
  mimeType: string;
  fileName: string;
  type: "image" | "video";
  webFile?: File | Blob;
  preUploadedUrl?: string;
};

function mimeFromUri(uri: string, fallback: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "m4a") return "audio/m4a";
  if (ext === "caf") return "audio/x-caf";
  if (ext === "3gp") return "audio/3gpp";
  if (ext === "aac") return "audio/aac";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "webm") return "audio/webm";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "wav") return "audio/wav";
  return fallback;
}

function normalizeWebVoiceMime(rawType: string, fallbackMime: string): string {
  const base = rawType.split(";")[0].trim().toLowerCase();
  if (!base || base === "application/octet-stream") return fallbackMime;
  // MediaRecorder on Chrome may label audio-only captures as video/webm.
  if (base === "video/webm") return "audio/webm";
  return base;
}

async function resolveWebVoiceFile(
  uri: string,
  fallbackMime: string,
): Promise<{ webFile: File; mimeType: string; fileName: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const mimeType = normalizeWebVoiceMime(blob.type, fallbackMime);
  const ext =
    mimeType.includes("webm")
      ? "webm"
      : mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("wav")
          ? "wav"
          : mimeType.includes("mpeg")
            ? "mp3"
            : "m4a";
  const fileName = `voice-${Date.now()}.${ext}`;
  const webFile = new File([blob], fileName, { type: mimeType });
  return { webFile, mimeType, fileName };
}

export function ChatComposer({
  isRTL,
  isPatient,
  selfId,
  accessToken,
  peerId,
  sending,
  bottomInset,
  onSend,
  onAddPending,
  onFailPending,
  onPickMedical,
  actions = [],
  inlineAction,
  editingMessage = null,
  onCancelEdit,
  onEdit,
  onComposerFocus,
  onComposerBlur,
  disabled = false,
  disabledHint,
  disabledActions,
  canStoreImageInMedicalRecord = false,
  medicalRecordPatientUserId,
  onMedicalRecordCreated,
}: Props) {
  const colors = useColors();
  const { isMobile } = useWebLayout();
  const isMobileWeb = Platform.OS === "web" && isMobile;
  const [text, setText] = useState("");
  const dictation = useFieldDictation({ value: text, onChangeText: setText });
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [medicalImageOptions, setMedicalImageOptions] =
    useState<MedicalImageAttachOptionsValue>({
      addToMedicalRecords: true,
      generateAiInsight: true,
    });
  const [pendingVoice, setPendingVoice] = useState<PendingVoice | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const sendInFlightRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const rowDir = chatFlexRow();
  const hasDisabledActions = !!disabledActions?.length;

  useEffect(() => {
    if (pendingAttachment?.type !== "image" || !canStoreImageInMedicalRecord) return;
    setMedicalImageOptions({
      addToMedicalRecords: true,
      generateAiInsight: true,
    });
  }, [pendingAttachment?.uri, pendingAttachment?.type, canStoreImageInMedicalRecord]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (isTypingRef.current) {
        emitConversationStopTyping(peerId, selfId);
      }
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [peerId, selfId]);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      stopTyping();
    }
  }, [editingMessage?.id]);

  const notifyTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitConversationTyping(peerId, selfId);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      emitConversationStopTyping(peerId, selfId);
    }, 2000);
  };

  const stopTyping = () => {
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitConversationStopTyping(peerId, selfId);
    }
  };

  const openAttachMenu = () => {
    setAttachMenuVisible(true);
  };

  const createPending = (
    type: ChatMessage["type"],
    localAttachmentUrl?: string,
    caption?: string,
  ): string => {
    const tempId = `pending-${Date.now()}`;
    const defaultLabel =
      type === "image"
        ? "Photo"
        : type === "voice"
          ? "Voice message"
          : type === "video"
            ? "Video"
            : "";
    const label = caption?.trim() || defaultLabel;
    onAddPending({
      id: tempId,
      conversationId: peerId,
      senderId: "me",
      text: label,
      createdAt: new Date().toISOString(),
      type,
      localAttachmentUrl: localAttachmentUrl ?? null,
      pending: true,
    });
    return tempId;
  };

  const uploadAndSend = async (
    uri: string,
    mimeType: string,
    fileName: string,
    type: "image" | "video" | "voice",
    webFile?: File | Blob,
    caption?: string,
    preUploadedUrl?: string,
  ) => {
    if (sendInFlightRef.current || sending || uploading) return;

    const tempId =
      type === "image" || type === "voice" || type === "video"
        ? createPending(type, type === "voice" ? undefined : uri, caption)
        : undefined;

    sendInFlightRef.current = true;
    setUploading(true);
    try {
      const attachmentUrl =
        preUploadedUrl ??
        (await uploadFile(uri, mimeType, fileName, accessToken, webFile)).url;
      await onSend(
        {
          recipientId: peerId,
          type,
          content: caption?.trim() || undefined,
          attachmentUrl,
        },
        tempId,
      );
    } catch (e) {
      if (tempId) onFailPending(tempId);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : isRTL ? "تعذر إرسال الملف" : "Failed to send attachment",
      );
    } finally {
      sendInFlightRef.current = false;
      setUploading(false);
    }
  };

  const queueAttachment = (
    asset: ImagePicker.ImagePickerAsset,
    media: "image" | "video",
    preUploadedUrl?: string,
  ) => {
    setPendingAttachment({
      uri: asset.uri,
      mimeType: asset.mimeType ?? (media === "image" ? "image/jpeg" : "video/mp4"),
      fileName:
        asset.fileName ?? `${media}-${Date.now()}.${media === "video" ? "mp4" : "jpg"}`,
      type: media,
      webFile: asset.file,
      preUploadedUrl,
    });
    if (media === "image") {
      setMedicalImageOptions({
        addToMedicalRecords: true,
        generateAiInsight: true,
      });
    }
  };

  /** Native document scan → queued exactly like a camera photo. */
  const scanDocument = async () => {
    try {
      const page = await scanDocumentPage();
      if (!page) return;
      queueAttachment(
        {
          uri: page.uri,
          mimeType: page.mimeType,
          fileName: page.name,
        } as ImagePicker.ImagePickerAsset,
        "image",
      );
    } catch (e) {
      Alert.alert(
        isRTL ? "تعذر المسح" : "Scan failed",
        e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    }
  };

  const sendPendingAttachment = async () => {
    if (!pendingAttachment || sending || uploading) return;
    const caption = text.trim();
    const { uri, mimeType, fileName, type, webFile, preUploadedUrl } = pendingAttachment;
    const shouldCreateMedicalRecord =
      type === "image" &&
      canStoreImageInMedicalRecord &&
      medicalImageOptions.addToMedicalRecords;
    stopTyping();
    setPendingAttachment(null);
    setText("");
    await uploadAndSend(uri, mimeType, fileName, type, webFile, caption, preUploadedUrl);
    if (shouldCreateMedicalRecord) {
      try {
        await createMedicalRecordFromChatImage(
          {
            uri,
            mimeType,
            fileName,
            webFile,
            caption,
            patientUserId: medicalRecordPatientUserId,
            generateInsight: medicalImageOptions.generateAiInsight,
          },
          accessToken,
          getApiLang(),
        );
        onMedicalRecordCreated?.();
        showSuccessToast(
          medicalImageOptions.generateAiInsight
            ? isRTL
              ? "تم حفظ السجل الطبي مع التحليل الذكي"
              : "Medical record saved with AI insight"
            : isRTL
              ? "تم حفظ السجل الطبي"
              : "Medical record saved",
        );
      } catch (e) {
        Alert.alert(
          isRTL ? "تنبيه" : "Notice",
          e instanceof Error
            ? e.message
            : isRTL
              ? "تعذر إضافة السجل الطبي"
              : "Could not add medical record",
        );
      }
    }
  };

  const pickGallery = async (media: "image" | "video") => {
    try {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            isRTL ? "إذن مطلوب" : "Permission required",
            isRTL ? "يرجى السماح بالوصول إلى المعرض" : "Please allow gallery access.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: media === "image" ? ["images"] : ["videos"],
        quality: media === "image" ? 0.85 : CHAT_VIDEO_PICKER_OPTIONS.quality,
        allowsEditing: media === "image",
        ...(media === "video" ? CHAT_VIDEO_PICKER_OPTIONS : {}),
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (media === "video") {
        const violation = await getChatVideoLimitViolation(
          asset.duration ?? null,
          asset.uri,
          isRTL,
          asset.fileSize ?? null,
        );
        if (violation) {
          Alert.alert(violation.title, violation.body);
          return;
        }
      }
      queueAttachment(asset, media);
    } catch (e) {
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : isRTL ? "تعذر فتح المعرض" : "Could not open gallery.",
      );
    }
  };

  const pickCamera = async (media: "image" | "video") => {
    try {
      if (Platform.OS === "web") {
        if (isNativeWebViewShell()) {
          const asset = await pickNativeShellCamera(media);
          if (!asset) return;
          if (asset.mediaType === "image") {
            queueAttachment(
              {
                uri: asset.uri,
                mimeType: asset.mimeType,
                fileName: asset.fileName,
              } as ImagePicker.ImagePickerAsset,
              "image",
              asset.preUploadedUrl,
            );
          } else {
            setPendingAttachment({
              uri: asset.uri,
              mimeType: asset.mimeType,
              fileName: asset.fileName,
              type: asset.mediaType,
              preUploadedUrl: asset.preUploadedUrl,
            });
          }
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: media === "image" ? ["images"] : ["videos"],
          quality: media === "image" ? 0.85 : CHAT_VIDEO_PICKER_OPTIONS.quality,
          allowsEditing: media === "image",
          ...(media === "video" ? CHAT_VIDEO_PICKER_OPTIONS : {}),
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        if (media === "video") {
          const violation = await getChatVideoLimitViolation(
            asset.duration ?? null,
            asset.uri,
            isRTL,
            asset.fileSize ?? null,
          );
          if (violation) {
            Alert.alert(violation.title, violation.body);
            return;
          }
        }
        queueAttachment(asset, media);
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          isRTL ? "إذن مطلوب" : "Permission required",
          isRTL ? "يرجى السماح بالوصول إلى الكاميرا" : "Please allow camera access.",
        );
        return;
      }

      if (media === "video") {
        const mic = await Audio.requestPermissionsAsync();
        if (mic.status !== "granted") {
          Alert.alert(
            isRTL ? "إذن مطلوب" : "Permission required",
            isRTL
              ? "يرجى السماح بالوصول إلى الميكروفون لتسجيل الفيديو"
              : "Please allow microphone access to record video.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: media === "image" ? ["images"] : ["videos"],
        quality: media === "image" ? 0.85 : CHAT_VIDEO_PICKER_OPTIONS.quality,
        allowsEditing: media === "image",
        ...(media === "video" ? CHAT_VIDEO_PICKER_OPTIONS : {}),
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (media === "video") {
        const violation = await getChatVideoLimitViolation(
          asset.duration ?? null,
          asset.uri,
          isRTL,
          asset.fileSize ?? null,
        );
        if (violation) {
          Alert.alert(violation.title, violation.body);
          return;
        }
      }
      queueAttachment(asset, media);
    } catch (e) {
      if (Platform.OS === "web" && isNativeWebViewShell()) {
        const code =
          e instanceof Error
            ? (e.message as NativeShellCameraMediaResult["error"])
            : "failed";
        Alert.alert(
          isRTL ? "خطأ" : "Error",
          cameraErrorMessage(code, isRTL),
        );
        return;
      }
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : isRTL ? "تعذر فتح الكاميرا" : "Could not open camera.",
      );
    }
  };

  const prepareAudioMode = async () => {
    if (Platform.OS === "web") return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: Platform.OS === "android",
    });
  };

  const cancelRecording = async () => {
    const active = recordingRef.current ?? recording;
    if (!active) return;
    try {
      await active.stopAndUnloadAsync();
    } catch {
      /* already stopped */
    }
    setRecording(null);
    setRecordingStartedAt(null);
    try {
      await prepareAudioMode();
    } catch {
      /* ignore */
    }
  };

  const sendPendingVoice = async () => {
    if (!pendingVoice || uploading || sending) return;
    const clip = pendingVoice;
    setPendingVoice(null);
    await uploadAndSend(
      clip.uri,
      clip.mimeType,
      clip.fileName,
      "voice",
      clip.webFile,
    );
  };

  const discardPendingVoice = () => {
    if (uploading) return;
    setPendingVoice(null);
  };

  const toggleRecording = async () => {
    if (recording) {
      try {
        const startedAt = recordingStartedAt ?? Date.now();
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        setRecordingStartedAt(null);
        await prepareAudioMode();

        const durationMs = Date.now() - startedAt;
        if (!uri) {
          Alert.alert(
            isRTL ? "خطأ" : "Error",
            isRTL ? "تعذر حفظ التسجيل" : "Could not save recording.",
          );
          return;
        }
        if (durationMs < 800) {
          Alert.alert(
            isRTL ? "تسجيل قصير" : "Recording too short",
            isRTL
              ? "سجّل لفترة أطول قبل الإيقاف."
              : "Record a bit longer before stopping.",
          );
          return;
        }

        // Held for review rather than sent immediately: the user gets to hear
        // it back and discard it before it goes out.
        if (Platform.OS === "web") {
          const { webFile, mimeType, fileName } = await resolveWebVoiceFile(
            uri,
            "audio/webm",
          );
          setPendingVoice({ uri, mimeType, fileName, webFile });
        } else {
          const mime = mimeFromUri(uri, Platform.OS === "ios" ? "audio/m4a" : "audio/mp4");
          const ext = uri.split(".").pop() ?? "m4a";
          setPendingVoice({ uri, mimeType: mime, fileName: `voice-${Date.now()}.${ext}` });
        }
      } catch (e) {
        setRecording(null);
        setRecordingStartedAt(null);
        Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
      }
      return;
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          isRTL ? "إذن مطلوب" : "Permission required",
          isRTL ? "يرجى السماح بالوصول إلى الميكروفون" : "Please allow microphone access.",
        );
        return;
      }

      await prepareAudioMode();
      // After permission sheet, Android needs a beat before audio focus is ready.
      if (Platform.OS !== "web") {
        await new Promise((r) => setTimeout(r, 150));
      }

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
      setRecordingStartedAt(Date.now());
    } catch (e) {
      setRecording(null);
      setRecordingStartedAt(null);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        e instanceof Error ? e.message : isRTL ? "تعذر بدء التسجيل" : "Could not start recording.",
      );
    }
  };

  const sendText = async () => {
    const t = text.trim();
    if (!t || sending || uploading || sendInFlightRef.current) return;
    stopTyping();

    if (editingMessage && onEdit) {
      await onEdit(editingMessage.id, t);
      setText("");
      onCancelEdit?.();
      return;
    }

    sendInFlightRef.current = true;
    setText("");
    const tempId = createPending("text", undefined, t);

    try {
      await onSend({ recipientId: peerId, type: "text", content: t }, tempId);
    } catch {
      setText(t);
    } finally {
      sendInFlightRef.current = false;
    }
  };

  const sendMessage = async () => {
    if (sendInFlightRef.current || sending || uploading) return;
    if (pendingAttachment) {
      await sendPendingAttachment();
      return;
    }
    await sendText();
  };

  const busy = sending || uploading || disabled;
  const isEditing = !!editingMessage;
  const controlsDisabled = busy || !!recording || isEditing;
  const canSend = !!text.trim() || !!pendingAttachment;
  const composerPaddingBottom = isMobileWeb
    ? MOBILE_WEB_COMPOSER_FOOTER_GAP + Math.max(bottomInset, 0)
    : Math.max(bottomInset, 0) + 8;

  // Plus button sits beside the input; attach/medical + host actions open in its context window.
  // While messaging is disabled only the non-attachment actions stay reachable (e.g. start consult).
  const menuActions: ChatAction[] = disabled
    ? actions
    : [
        {
          key: "attach",
          label: isRTL ? "إرفاق صورة أو فيديو" : "Attach photo or video",
          Icon: Paperclip,
          onPress: openAttachMenu,
        },
        ...(isPatient
          ? [
              {
                key: "medical",
                label: isRTL ? "مشاركة سجل طبي" : "Share medical record",
                Icon: ClipboardList,
                onPress: onPickMedical,
              },
            ]
          : []),
        ...actions,
      ];

  const plusButton =
    !isEditing && menuActions.length > 0 ? (
      <ChatActionsMenu
        isRTL={isRTL}
        actions={menuActions}
        disabled={disabled ? false : controlsDisabled}
        buttonStyle={isMobileWeb ? mobileWebComposerStyles.iconBtn : styles.iconBtn}
      />
    ) : null;

  // Plus + start/end consultation sit together beside the input.
  const leadingControls =
    !isEditing && (plusButton || inlineAction) ? (
      <View style={[styles.leadingControls, { flexDirection: rowDir }]}>
        {plusButton}
        {inlineAction}
      </View>
    ) : null;

  const messageInput = (
    <AppTextInput
      value={text}
      onChangeText={(value) => {
        setText(value);
        if (value.trim()) notifyTyping();
        else stopTyping();
      }}
      onFocus={onComposerFocus}
      onBlur={() => {
        stopTyping();
        onComposerBlur?.();
      }}
      placeholder={
        pendingAttachment
          ? isRTL
            ? "أضف تعليقاً (اختياري)…"
            : "Add a caption (optional)…"
          : isRTL
            ? "اكتب رسالة…"
            : "Type a message…"
      }
      placeholderTextColor={colors.mutedForeground}
      style={[
        isMobileWeb ? mobileWebComposerStyles.input : styles.input,
        {
          backgroundColor: colors.muted,
          borderColor: colors.border,
          color: colors.foreground,
          textAlign: isRTL ? "right" : "left",
        },
      ]}
      multiline
      editable={!uploading && !disabled && !recording}
      blurOnSubmit={false}
      onKeyPress={(e) => handleEnterToSendMessage(e, sendMessage)}
    />
  );

  const micActive = !!recording || dictation.listening || dictation.busy;
  const sendOrMicButton = canSend ? (
    <Pressable
      onPress={() => void sendMessage()}
      disabled={busy}
      style={[
        isMobileWeb ? mobileWebComposerStyles.iconBtn : styles.iconBtn,
        {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          opacity: busy ? 0.6 : 1,
        },
      ]}
    >
      <Send size={18} color="#fff" />
    </Pressable>
  ) : isEditing ? null : (
    <Pressable
      onPress={() => {
        // Tap: record a voice message; tap again to stop and send it.
        if (dictation.listening) {
          dictation.toggle();
          return;
        }
        void toggleRecording();
      }}
      onLongPress={() => {
        // Long-press: multilingual speech-to-text into the input (ar/en/de/es).
        if (recording || dictation.busy) return;
        dictation.toggle();
      }}
      delayLongPress={350}
      disabled={
        uploading ||
        sending ||
        isEditing ||
        !!pendingAttachment ||
        !!pendingVoice ||
        dictation.busy
      }
      style={[
        isMobileWeb ? mobileWebComposerStyles.iconBtn : styles.iconBtn,
        {
          backgroundColor: micActive ? "#ef4444" : `${colors.primary}14`,
          borderColor: micActive ? "#ef4444" : `${colors.primary}3D`,
          opacity:
            uploading ||
            sending ||
            isEditing ||
            pendingAttachment ||
            pendingVoice ||
            dictation.busy
              ? 0.45
              : 1,
        },
      ]}
      hitSlop={6}
      accessibilityLabel={
        recording
          ? isRTL
            ? "إيقاف التسجيل"
            : "Stop recording"
          : dictation.listening
            ? isRTL
              ? "إيقاف الإملاء"
              : "Stop dictation"
            : isRTL
              ? "تسجيل رسالة صوتية — اضغط مطولاً للإملاء"
              : "Record voice message — long-press to dictate"
      }
    >
      {dictation.busy ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Mic size={18} color={micActive ? "#fff" : colors.primary} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.footer}>
      <ChatAttachMenu
        visible={attachMenuVisible}
        isRTL={isRTL}
        onClose={() => setAttachMenuVisible(false)}
        onPhotoGallery={() => void pickGallery("image")}
        onPhotoCamera={() => void pickCamera("image")}
        onScanDocument={() => void scanDocument()}
        onVideoGallery={() => void pickGallery("video")}
        onVideoCamera={() => void pickCamera("video")}
      />

      {isEditing ? (
        <View
          style={[
            styles.editBar,
            {
              backgroundColor: colors.muted,
              borderTopColor: colors.border,
              flexDirection: rowDir,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.primary,
                fontWeight: "700",
                fontSize: 13,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {isRTL ? "تعديل الرسالة" : "Editing message"}
            </Text>
          </View>
          <Pressable onPress={onCancelEdit} hitSlop={8}>
            <X size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : null}

      {pendingAttachment && !isEditing ? (
        <ChatAttachmentPreview
          attachment={{
            uri: pendingAttachment.uri,
            type: pendingAttachment.type,
          }}
          isRTL={isRTL}
          onRemove={() => setPendingAttachment(null)}
          onReplace={openAttachMenu}
          onExpandImage={setPreviewImageUri}
          onExpandVideo={setPreviewVideoUri}
        />
      ) : null}

      {pendingAttachment?.type === "image" &&
      canStoreImageInMedicalRecord &&
      !isEditing ? (
        <MedicalImageAttachOptions
          isRTL={isRTL}
          value={medicalImageOptions}
          onChange={setMedicalImageOptions}
          disabled={uploading || sending}
        />
      ) : null}

      <FullscreenImageViewer
        uri={previewImageUri}
        onClose={() => setPreviewImageUri(null)}
      />
      <FullscreenVideoViewer
        uri={previewVideoUri}
        onClose={() => setPreviewVideoUri(null)}
      />

      {recording ? (
        <View
          style={[
            styles.recordingBar,
            { flexDirection: rowDir },
          ]}
        >
          <Pressable
            onPress={() => void cancelRecording()}
            hitSlop={8}
            accessibilityLabel={isRTL ? "إلغاء التسجيل" : "Cancel recording"}
            style={[styles.recordingCancelBtn, { borderColor: "#ef4444" }]}
          >
            <X size={16} color="#ef4444" />
            <Text style={styles.recordingCancelText}>
              {isRTL ? "إلغاء" : "Cancel"}
            </Text>
          </Pressable>
          <Text style={styles.recordingHint}>
            {isRTL
              ? "جاري التسجيل… اضغط الميكروفون للإيقاف"
              : "Recording… tap mic to stop"}
          </Text>
        </View>
      ) : uploading ? (
        <Text
          style={{
            textAlign: "center",
            color: colors.mutedForeground,
            paddingBottom: 8,
            fontSize: 12,
          }}
        >
          {isRTL ? "جاري رفع الملف…" : "Uploading attachment…"}
        </Text>
      ) : null}
      {pendingVoice ? (
        <View
          style={[
            styles.voicePreview,
            {
              flexDirection: rowDir,
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={discardPendingVoice}
            disabled={uploading}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isRTL ? "حذف التسجيل" : "Delete recording"}
            style={[styles.voiceDiscard, { borderColor: "#ef4444" }]}
          >
            <Trash2 size={18} color="#ef4444" />
          </Pressable>

          <View style={styles.voicePlayer}>
            <VoiceMessagePlayer
              uri={pendingVoice.uri}
              color={colors.foreground}
              trackColor={colors.border}
              fillColor={colors.primary}
              isRTL={isRTL}
            />
          </View>

          <Pressable
            onPress={() => void sendPendingVoice()}
            disabled={uploading || sending}
            accessibilityRole="button"
            accessibilityLabel={isRTL ? "إرسال" : "Send"}
            style={[
              styles.voiceSend,
              {
                backgroundColor: colors.primary,
                opacity: uploading || sending ? 0.6 : 1,
              },
            ]}
          >
            {uploading || sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      ) : null}

      {disabled && !isEditing ? (
        <View
          style={[
            styles.disabledBar,
            {
              // With the CTA showing, the bar reads as a floating button over
              // the thread rather than a solid footer.
              backgroundColor: hasDisabledActions ? `${colors.card}B3` : colors.card,
              borderTopColor: colors.border,
              borderTopWidth: hasDisabledActions ? 0 : StyleSheet.hairlineWidth,
              paddingBottom: bottomInset + 12,
              flexDirection: rowDir,
            },
          ]}
        >
          {leadingControls}
          {hasDisabledActions ? (
            <View style={[styles.disabledActionWrap, { flexDirection: rowDir }]}>
              {disabledActions!.map((action) => {
                // Lead action keeps the accent; the rest sit quieter beside it.
                const tint = action.color ?? colors.primary;
                const isLead = action.key === disabledActions![0].key;
                return (
                  <Pressable
                    key={action.key}
                    onPress={action.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      styles.disabledActionBtn,
                      {
                        flexDirection: rowDir,
                        backgroundColor: isLead
                          ? `${tint}${pressed || hovered ? "2E" : "1F"}`
                          : pressed || hovered
                            ? colors.muted
                            : colors.card,
                        borderColor: isLead ? `${tint}55` : colors.border,
                      },
                    ]}
                  >
                    <action.Icon
                      size={18}
                      color={isLead ? tint : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.disabledActionLabel,
                        { color: isLead ? tint : colors.foreground },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text
              style={{
                flex: 1,
                color: colors.mutedForeground,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              {disabledHint ?? (isRTL ? "المحادثة محظورة" : "Chat is blocked")}
            </Text>
          )}
        </View>
      ) : (
        <View
          style={
            isMobileWeb
              ? [
                  mobileWebComposerStyles.shell,
                  {
                    paddingBottom: composerPaddingBottom,
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                  },
                ]
              : [
                  styles.composer,
                  {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    flexDirection: rowDir,
                    paddingBottom: composerPaddingBottom,
                  },
                ]
          }
        >
          {isMobileWeb ? (
            <View style={[mobileWebComposerStyles.row, { flexDirection: rowDir }]}>
              {leadingControls}
              {messageInput}
              {sendOrMicButton}
            </View>
          ) : (
            <>
              {leadingControls}
              {messageInput}
              {sendOrMicButton}
            </>
          )}
        </View>
      )}

      {dictation.listening && !recording ? (
        <View style={[styles.recordingBar, { flexDirection: rowDir }]}>
          <Text style={styles.recordingHint}>
            {isRTL
              ? "جاري الاستماع… تكلم ثم اضغط الميكروفون للإيقاف"
              : "Listening… speak, then tap mic to stop"}
          </Text>
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexShrink: 0,
  },
  editBar: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  composer: {
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  leadingControls: {
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    maxWidth: "48%",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  disabledBar: {
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  disabledActionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  disabledActionBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    cursor: "pointer" as "auto",
  },
  disabledActionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  voicePreview: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  voicePlayer: { flex: 1, minWidth: 0 },
  voiceDiscard: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingBar: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 2,
  },
  recordingHint: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  recordingCancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  recordingCancelText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
  },
});
