import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
  Upload,
} from "lucide-react-native";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { ContainedVideo } from "@/components/chat/ContainedVideo";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { FullscreenVideoViewer } from "@/components/FullscreenVideoViewer";
import { uploadFile } from "@/domains/medical/api";
import type { IntakeQuestion } from "@/domains/intake-exams/types";
import { useColors } from "@/hooks/useColors";
import { webConfirm } from "@/utils/webConfirm";

interface Props {
  isRTL: boolean;
  questions: IntakeQuestion[];
  answers: Record<string, string[]>;
  readOnly?: boolean;
  previewMode?: boolean;
  accessToken?: string;
  onChange: (answers: Record<string, string[]>) => void;
}

/** Upload any in-progress voice preview before draft/submit. */
export type IntakeExamTakerHandle = {
  flushPendingAudio: () => Promise<void>;
};

type MediaKind = "image" | "video" | "audio";

type AudioSession =
  | { phase: "recording"; questionId: string; paused: boolean }
  | { phase: "preview"; questionId: string; uri: string };

function isMediaType(type: IntakeQuestion["type"]): type is MediaKind {
  return type === "image" || type === "video" || type === "audio";
}

function formatMs(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const IntakeExamTaker = forwardRef<IntakeExamTakerHandle, Props>(
  function IntakeExamTaker(
    {
      isRTL,
      questions,
      answers,
      readOnly = false,
      previewMode = false,
      accessToken,
      onChange,
    },
    ref,
  ) {
  const colors = useColors();
  const textAlign = isRTL ? "right" : "left";
  const rowDir = isRTL ? "row-reverse" : "row";
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [zoomVideoUri, setZoomVideoUri] = useState<string | null>(null);
  const [audioSession, setAudioSession] = useState<AudioSession | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const startedAtRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  const audioSessionRef = useRef(audioSession);
  const uploadingRef = useRef<string | null>(null);
  answersRef.current = answers;
  audioSessionRef.current = audioSession;
  uploadingRef.current = uploadingQuestionId;

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startTick = () => {
    clearTick();
    tickRef.current = setInterval(() => {
      setElapsedMs(accumulatedMsRef.current + (Date.now() - startedAtRef.current));
    }, 200);
  };

  const stopPlayback = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setPlayingAudioId(null);
    if (!sound) return;
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTick();
      void stopPlayback();
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) void rec.stopAndUnloadAsync().catch(() => undefined);
    };
  }, [stopPlayback]);

  const setAnswer = useCallback(
    (questionId: string, values: string[]) => {
      if (readOnly) return;
      const next = { ...answersRef.current };
      if (values.length === 0) {
        delete next[questionId];
      } else {
        next[questionId] = values;
      }
      answersRef.current = next;
      onChange(next);
    },
    [onChange, readOnly],
  );

  const clearAnswer = (questionId: string) => {
    if (readOnly) return;
    const title = isRTL ? "حذف المرفق" : "Remove attachment";
    const message = isRTL ? "هل تريد حذف هذا المرفق؟" : "Remove this uploaded file?";
    const doClear = () => {
      void stopPlayback();
      if (
        audioSessionRef.current?.phase === "preview" &&
        audioSessionRef.current.questionId === questionId
      ) {
        setAudioSession(null);
        setElapsedMs(0);
      }
      setAnswer(questionId, []);
    };
    // RN Web's Alert.alert often ignores action buttons — use window.confirm there.
    if (Platform.OS === "web") {
      if (webConfirm(title, message)) doClear();
      return;
    }
    Alert.alert(title, message, [
      { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
      {
        text: isRTL ? "حذف" : "Delete",
        style: "destructive",
        onPress: doClear,
      },
    ]);
  };

  const prepareRecordMode = async () => {
    if (Platform.OS === "web") return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  };

  const preparePlaybackMode = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });
  };

  const uploadMedia = async (
    questionId: string,
    uri: string,
    mimeType: string,
    fileName: string,
    webFile?: File | Blob,
  ): Promise<boolean> => {
    if (!accessToken) {
      Alert.alert(
        isRTL ? "غير مسجل" : "Not signed in",
        isRTL ? "أعد تسجيل الدخول ثم حاول مرة أخرى." : "Sign in again and try once more.",
      );
      return false;
    }
    setUploadingQuestionId(questionId);
    uploadingRef.current = questionId;
    try {
      const uploaded = await uploadFile(uri, mimeType, fileName, accessToken, webFile);
      const fileUrl = (uploaded?.url || uploaded?.objectPath || "").trim();
      if (!fileUrl) {
        throw new Error(isRTL ? "لم يتم إرجاع رابط الملف." : "Upload returned no file URL.");
      }
      setAnswer(questionId, [fileUrl]);
      setAudioSession(null);
      setElapsedMs(0);
      return true;
    } catch (e) {
      Alert.alert(isRTL ? "فشل الرفع" : "Upload failed", (e as Error).message);
      return false;
    } finally {
      setUploadingQuestionId(null);
      uploadingRef.current = null;
    }
  };

  const pickFromLibrary = async (questionId: string, kind: "image" | "video") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        isRTL ? "لا يوجد إذن" : "Permission needed",
        isRTL
          ? "اسمح بالوصول إلى المعرض لرفع الملفات."
          : "Allow photo library access to upload files.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        kind === "image"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mime =
      asset.mimeType ??
      (kind === "image" ? "image/jpeg" : "video/mp4");
    const name =
      asset.fileName ??
      (kind === "image" ? `exam-image-${Date.now()}.jpg` : `exam-video-${Date.now()}.mp4`);
    const webFile =
      Platform.OS === "web" ? (asset as { file?: File }).file : undefined;
    await uploadMedia(questionId, asset.uri, mime, name, webFile);
  };

  const startAudioRecording = async (questionId: string) => {
    if (audioSession || uploadingQuestionId) return;
    try {
      await stopPlayback();
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          isRTL ? "لا يوجد إذن" : "Permission needed",
          isRTL ? "اسمح بالوصول إلى الميكروفون." : "Allow microphone access to record audio.",
        );
        return;
      }
      await prepareRecordMode();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      accumulatedMsRef.current = 0;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setAudioSession({ phase: "recording", questionId, paused: false });
      startTick();
    } catch (e) {
      recordingRef.current = null;
      setAudioSession(null);
      Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
    }
  };

  const pauseOrResumeRecording = async () => {
    const recording = recordingRef.current;
    if (!recording || audioSession?.phase !== "recording") return;
    try {
      if (audioSession.paused) {
        await recording.startAsync();
        startedAtRef.current = Date.now();
        setAudioSession({ ...audioSession, paused: false });
        startTick();
      } else {
        await recording.pauseAsync();
        accumulatedMsRef.current += Date.now() - startedAtRef.current;
        clearTick();
        setElapsedMs(accumulatedMsRef.current);
        setAudioSession({ ...audioSession, paused: true });
      }
    } catch (e) {
      // Some platforms may not support pause — fall back to stop.
      Alert.alert(
        isRTL ? "تعذر الإيقاف المؤقت" : "Could not pause",
        (e as Error).message ||
          (isRTL
            ? "استخدم إيقاف لحفظ التسجيل."
            : "Use Stop to finish the recording."),
      );
    }
  };

  const uploadAudioUri = async (questionId: string, uri: string) => {
    try {
      let webFile: File | Blob | undefined;
      if (Platform.OS === "web") {
        const res = await fetch(uri);
        webFile = await res.blob();
      }
      return await uploadMedia(
        questionId,
        uri,
        Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
        `exam-audio-${Date.now()}.m4a`,
        webFile,
      );
    } catch (e) {
      Alert.alert(isRTL ? "فشل الرفع" : "Upload failed", (e as Error).message);
      return false;
    }
  };

  const stopRecordingToPreview = async () => {
    const recording = recordingRef.current;
    if (!recording || audioSession?.phase !== "recording") return;
    const questionId = audioSession.questionId;
    clearTick();
    if (!audioSession.paused) {
      accumulatedMsRef.current += Date.now() - startedAtRef.current;
    }
    setElapsedMs(accumulatedMsRef.current);
    recordingRef.current = null;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      await preparePlaybackMode();
      if (!uri) {
        setAudioSession(null);
        Alert.alert(
          isRTL ? "خطأ" : "Error",
          isRTL ? "تعذر حفظ التسجيل." : "Could not save recording.",
        );
        return;
      }
      if (accumulatedMsRef.current < 800) {
        setAudioSession(null);
        Alert.alert(
          isRTL ? "تسجيل قصير" : "Recording too short",
          isRTL
            ? "سجّل لفترة أطول ثم أعد المحاولة."
            : "Hold a little longer, then try again.",
        );
        return;
      }
      // Keep a local preview while uploading so draft/autosave can persist the URL.
      setAudioSession({ phase: "preview", questionId, uri });
      await uploadAudioUri(questionId, uri);
    } catch (e) {
      recordingRef.current = null;
      setAudioSession(null);
      Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
    }
  };

  const discardPreview = () => {
    if (audioSession?.phase !== "preview") return;
    void stopPlayback();
    setAudioSession(null);
    setElapsedMs(0);
  };

  const savePreview = async () => {
    if (audioSession?.phase !== "preview") return;
    const { questionId, uri } = audioSession;
    await uploadAudioUri(questionId, uri);
  };

  useImperativeHandle(ref, () => ({
    flushPendingAudio: async () => {
      const waitForUpload = async () => {
        const started = Date.now();
        while (uploadingRef.current && Date.now() - started < 60_000) {
          await new Promise((r) => setTimeout(r, 80));
        }
      };
      await waitForUpload();

      const session = audioSessionRef.current;
      if (session?.phase === "preview") {
        const ok = await uploadAudioUri(session.questionId, session.uri);
        if (!ok) {
          throw new Error(
            isRTL
              ? "تعذر رفع التسجيل الصوتي. حاول مرة أخرى."
              : "Could not upload the voice recording. Please try again.",
          );
        }
      }
      await waitForUpload();
    },
  }));

  const reRecord = async (questionId: string) => {
    await stopPlayback();
    if (audioSession?.phase === "preview" && audioSession.questionId === questionId) {
      setAudioSession(null);
      setElapsedMs(0);
    }
    // Clear uploaded answer so the new take replaces it after save.
    if ((answers[questionId] ?? [])[0]) {
      setAnswer(questionId, []);
    }
    await startAudioRecording(questionId);
  };

  const playAudio = async (questionId: string, uri: string) => {
    if (playingAudioId === questionId) {
      await stopPlayback();
      return;
    }
    await stopPlayback();
    setPlayingAudioId(questionId);
    try {
      await preparePlaybackMode();
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          soundRef.current = null;
          void sound.unloadAsync();
        }
      });
      await sound.playAsync();
    } catch (e) {
      setPlayingAudioId(null);
      soundRef.current = null;
      Alert.alert(isRTL ? "تعذر التشغيل" : "Playback failed", (e as Error).message);
    }
  };

  const mediaActionLabel = (kind: MediaKind, hasValue: boolean) => {
    if (kind === "image") {
      return hasValue
        ? isRTL
          ? "استبدال الصورة"
          : "Replace image"
        : isRTL
          ? "رفع صورة"
          : "Upload image";
    }
    if (kind === "video") {
      return hasValue
        ? isRTL
          ? "استبدال الفيديو"
          : "Replace video"
        : isRTL
          ? "رفع فيديو"
          : "Upload video";
    }
    return hasValue
      ? isRTL
        ? "إعادة التسجيل"
        : "Re-record"
      : isRTL
        ? "تسجيل صوت"
        : "Record audio";
  };

  const renderAudioControls = (questionId: string, mediaUrl: string) => {
    const uploading = uploadingQuestionId === questionId;
    const isRecordingHere =
      audioSession?.phase === "recording" && audioSession.questionId === questionId;
    const isPreviewHere =
      audioSession?.phase === "preview" && audioSession.questionId === questionId;
    const previewUri = isPreviewHere ? audioSession.uri : null;
    const playUri = previewUri ?? mediaUrl;
    const busyElsewhere =
      !!audioSession && audioSession.questionId !== questionId;

    if (previewMode) {
      return (
        <View style={[styles.mediaBtn, { borderColor: colors.border, opacity: 0.7 }]}>
          <Text style={{ color: colors.mutedForeground, fontWeight: "600", textAlign }}>
            {mediaActionLabel("audio", false)} ({isRTL ? "معاينة فقط" : "preview only"})
          </Text>
        </View>
      );
    }

    if (isRecordingHere) {
      const paused = audioSession.paused;
      return (
        <View
          style={[
            styles.previewCard,
            { borderColor: colors.destructive, backgroundColor: `${colors.destructive}10` },
          ]}
        >
          <View style={[styles.audioStatusRow, { flexDirection: rowDir }]}>
            <View
              style={[
                styles.recDot,
                { backgroundColor: paused ? colors.mutedForeground : colors.destructive },
              ]}
            />
            <Text style={{ color: colors.foreground, fontWeight: "800", flex: 1, textAlign }}>
              {paused
                ? isRTL
                  ? "متوقف مؤقتًا"
                  : "Paused"
                : isRTL
                  ? "جاري التسجيل…"
                  : "Recording…"}
            </Text>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
              {formatMs(elapsedMs)}
            </Text>
          </View>
          <View style={[styles.mediaActions, { flexDirection: rowDir }]}>
            <Pressable
              onPress={() => void pauseOrResumeRecording()}
              style={[
                styles.mediaBtn,
                styles.mediaBtnGrow,
                { borderColor: colors.primary, flexDirection: rowDir },
              ]}
            >
              {paused ? (
                <Mic size={16} color={colors.primary} />
              ) : (
                <Pause size={16} color={colors.primary} />
              )}
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {paused
                  ? isRTL
                    ? "متابعة"
                    : "Resume"
                  : isRTL
                    ? "إيقاف مؤقت"
                    : "Pause"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void stopRecordingToPreview()}
              style={[
                styles.mediaBtn,
                styles.mediaBtnGrow,
                { borderColor: colors.destructive, flexDirection: rowDir },
              ]}
            >
              <Square size={15} color={colors.destructive} fill={colors.destructive} />
              <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                {isRTL ? "إيقاف" : "Stop"}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (isPreviewHere || mediaUrl) {
      return (
        <View style={{ gap: 10 }}>
          <View
            style={[
              styles.previewCard,
              { borderColor: colors.border, backgroundColor: colors.muted },
            ]}
          >
            <Pressable
              onPress={() => void playAudio(questionId, playUri)}
              style={[styles.audioPlayBtn, { flexDirection: rowDir }]}
            >
              {playingAudioId === questionId ? (
                <>
                  <Square size={16} color={colors.primary} fill={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {isRTL ? "إيقاف التشغيل" : "Stop playback"}
                  </Text>
                </>
              ) : (
                <>
                  <Play size={18} color={colors.primary} fill={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {isPreviewHere
                      ? isRTL
                        ? "تشغيل المعاينة"
                        : "Play preview"
                      : isRTL
                        ? "تشغيل التسجيل"
                        : "Play recording"}
                  </Text>
                </>
              )}
            </Pressable>
            {isPreviewHere ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign }}>
                {uploading
                  ? isRTL
                    ? "جاري رفع التسجيل…"
                    : "Uploading recording…"
                  : isRTL
                    ? `المدة ${formatMs(elapsedMs)} — احفظ أو احذف أو أعد التسجيل`
                    : `${formatMs(elapsedMs)} — save, delete, or re-record`}
              </Text>
            ) : null}
          </View>

          <View style={[styles.mediaActions, { flexDirection: rowDir }]}>
            {isPreviewHere ? (
              <Pressable
                onPress={() => void savePreview()}
                disabled={uploading || busyElsewhere}
                style={[
                  styles.mediaBtn,
                  styles.mediaBtnGrow,
                  {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}14`,
                    flexDirection: rowDir,
                    opacity: uploading ? 0.7 : 1,
                  },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <Upload size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>
                      {isRTL ? "حفظ التسجيل" : "Save recording"}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => void reRecord(questionId)}
              disabled={uploading || busyElsewhere}
              style={[
                styles.mediaBtn,
                styles.mediaBtnGrow,
                {
                  borderColor: colors.primary,
                  flexDirection: rowDir,
                  opacity: uploading || busyElsewhere ? 0.55 : 1,
                },
              ]}
            >
              <Mic size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {isRTL ? "إعادة التسجيل" : "Re-record"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                isPreviewHere ? discardPreview() : clearAnswer(questionId)
              }
              disabled={uploading}
              style={[
                styles.mediaBtn,
                {
                  borderColor: colors.destructive,
                  flexDirection: rowDir,
                },
              ]}
              accessibilityLabel={isRTL ? "حذف" : "Delete"}
            >
              <Trash2 size={16} color={colors.destructive} />
              <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                {isRTL ? "حذف" : "Delete"}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        onPress={() => void startAudioRecording(questionId)}
        disabled={uploading || busyElsewhere}
        style={[
          styles.mediaBtn,
          {
            borderColor: colors.primary,
            flexDirection: rowDir,
            opacity: uploading || busyElsewhere ? 0.55 : 1,
          },
        ]}
      >
        <Mic size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "700" }}>
          {isRTL ? "تسجيل صوت" : "Record audio"}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      {questions.map((q, index) => {
        if (q.type === "guidance") {
          return (
            <View
              key={q.id}
              style={[styles.card, { backgroundColor: `${colors.primary}10`, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, textAlign }}>{q.text}</Text>
            </View>
          );
        }

        const value = answers[q.id] ?? [];
        const mediaUrl = value[0] ?? "";
        const uploading = uploadingQuestionId === q.id;
        const mediaKind = isMediaType(q.type) ? q.type : null;

        return (
          <View
            key={q.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", textAlign }}>
              {index + 1}. {q.text}
              {q.required ? " *" : ""}
            </Text>

            {q.type === "text" ? (
              <AppTextInput
                value={value[0] ?? ""}
                onChangeText={(text) => setAnswer(q.id, text ? [text] : [])}
                editable={!readOnly}
                multiline
                placeholder={isRTL ? "اكتب إجابتك" : "Type your answer"}
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.input,
                  { color: colors.foreground, borderColor: colors.border, textAlign },
                ]}
              />
            ) : null}

            {q.type === "single_choice"
              ? q.options.map((opt) => {
                  const selected = value[0] === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      disabled={readOnly}
                      onPress={() => setAnswer(q.id, [opt.id])}
                      style={[styles.optionRow, { flexDirection: rowDir }]}
                    >
                      <View
                        style={[
                          styles.radio,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary : "transparent",
                          },
                        ]}
                      />
                      <Text style={{ color: colors.foreground, flex: 1, textAlign }}>{opt.text}</Text>
                    </Pressable>
                  );
                })
              : null}

            {q.type === "multi_choice"
              ? q.options.map((opt) => {
                  const selected = value.includes(opt.id);
                  return (
                    <Pressable
                      key={opt.id}
                      disabled={readOnly}
                      onPress={() => {
                        const next = selected
                          ? value.filter((v) => v !== opt.id)
                          : [...value, opt.id];
                        setAnswer(q.id, next);
                      }}
                      style={[styles.optionRow, { flexDirection: rowDir }]}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary : "transparent",
                          },
                        ]}
                      />
                      <Text style={{ color: colors.foreground, flex: 1, textAlign }}>{opt.text}</Text>
                    </Pressable>
                  );
                })
              : null}

            {mediaKind === "audio" ? (
              <View style={{ gap: 10, marginTop: 8 }}>
                {readOnly ? (
                  mediaUrl ? (
                    <Pressable
                      onPress={() => void playAudio(q.id, mediaUrl)}
                      style={[styles.audioPlayBtn, { flexDirection: rowDir }]}
                    >
                      {playingAudioId === q.id ? (
                        <Square size={16} color={colors.primary} fill={colors.primary} />
                      ) : (
                        <Play size={18} color={colors.primary} fill={colors.primary} />
                      )}
                      <Text style={{ color: colors.primary, fontWeight: "700" }}>
                        {playingAudioId === q.id
                          ? isRTL
                            ? "إيقاف التشغيل"
                            : "Stop playback"
                          : isRTL
                            ? "تشغيل التسجيل"
                            : "Play recording"}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={{ color: colors.mutedForeground, textAlign }}>
                      {isRTL ? "لا توجد إجابة" : "No answer"}
                    </Text>
                  )
                ) : (
                  renderAudioControls(q.id, mediaUrl)
                )}
              </View>
            ) : null}

            {mediaKind && mediaKind !== "audio" ? (
              <View style={{ gap: 10, marginTop: 8 }}>
                {mediaUrl ? (
                  <View
                    style={[
                      styles.previewCard,
                      { borderColor: colors.border, backgroundColor: colors.muted },
                    ]}
                  >
                    {mediaKind === "image" ? (
                      <Pressable onPress={() => setZoomImageUri(mediaUrl)}>
                        <Image
                          source={{ uri: mediaUrl }}
                          style={styles.imagePreview}
                          contentFit="cover"
                        />
                        <Text
                          style={[
                            styles.previewHint,
                            { color: colors.primary, textAlign },
                          ]}
                        >
                          {isRTL ? "اضغط للتكبير" : "Tap to enlarge"}
                        </Text>
                      </Pressable>
                    ) : null}

                    {mediaKind === "video" ? (
                      <View style={{ gap: 8 }}>
                        <ContainedVideo
                          uri={mediaUrl}
                          width={280}
                          height={180}
                          controls
                        />
                        <Pressable onPress={() => setZoomVideoUri(mediaUrl)}>
                          <Text
                            style={[
                              styles.previewHint,
                              { color: colors.primary, textAlign },
                            ]}
                          >
                            {isRTL ? "فتح بملء الشاشة" : "Open fullscreen"}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : readOnly ? (
                  <Text style={{ color: colors.mutedForeground, textAlign }}>
                    {isRTL ? "لا توجد إجابة" : "No answer"}
                  </Text>
                ) : null}

                {!readOnly ? (
                  previewMode ? (
                    <View style={[styles.mediaBtn, { borderColor: colors.border, opacity: 0.7 }]}>
                      <Text style={{ color: colors.mutedForeground, fontWeight: "600", textAlign }}>
                        {mediaActionLabel(mediaKind, false)} ({isRTL ? "معاينة فقط" : "preview only"})
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.mediaActions, { flexDirection: rowDir }]}>
                      <Pressable
                        onPress={() => void pickFromLibrary(q.id, mediaKind)}
                        disabled={uploading}
                        style={[
                          styles.mediaBtn,
                          styles.mediaBtnGrow,
                          {
                            borderColor: colors.primary,
                            flexDirection: rowDir,
                            opacity: uploading ? 0.7 : 1,
                          },
                        ]}
                      >
                        {uploading ? (
                          <ActivityIndicator color={colors.primary} />
                        ) : (
                          <>
                            <Upload size={16} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontWeight: "700" }}>
                              {mediaActionLabel(mediaKind, !!mediaUrl)}
                            </Text>
                          </>
                        )}
                      </Pressable>

                      {mediaUrl ? (
                        <Pressable
                          onPress={() => clearAnswer(q.id)}
                          disabled={uploading}
                          style={[
                            styles.mediaBtn,
                            {
                              borderColor: colors.destructive,
                              flexDirection: rowDir,
                            },
                          ]}
                          accessibilityLabel={isRTL ? "حذف" : "Delete"}
                        >
                          <Trash2 size={16} color={colors.destructive} />
                          <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                            {isRTL ? "حذف" : "Delete"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )
                ) : null}
              </View>
            ) : null}

            {readOnly &&
            q.type !== "image" &&
            q.type !== "video" &&
            q.type !== "audio" &&
            q.type !== "text" ? (
              <Text style={{ color: colors.mutedForeground, marginTop: 6, textAlign }}>
                {value.length
                  ? q.options
                      .filter((o) => value.includes(o.id))
                      .map((o) => o.text)
                      .join(", ")
                  : isRTL
                    ? "لا توجد إجابة"
                    : "No answer"}
              </Text>
            ) : null}
          </View>
        );
      })}

      <FullscreenImageViewer uri={zoomImageUri} onClose={() => setZoomImageUri(null)} />
      <FullscreenVideoViewer uri={zoomVideoUri} onClose={() => setZoomVideoUri(null)} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    textAlignVertical: "top",
    marginTop: 8,
  },
  optionRow: { alignItems: "center", gap: 10, marginTop: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2 },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    backgroundColor: "#0f172a22",
  },
  previewHint: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  audioStatusRow: { alignItems: "center", gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5 },
  audioPlayBtn: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  mediaActions: {
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  mediaBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaBtnGrow: {
    flexGrow: 1,
    minWidth: 120,
  },
});
