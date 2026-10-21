import { Send, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";
import type { Locale } from "@/domains/i18n/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { LanguageDropdown } from "@/components/language/LanguageDropdown";

interface Props {
  isRecording: boolean;
  isTranscribing: boolean;
  isTalking: boolean;
  sending: boolean;
  streaming: boolean;
  voiceError: string | null;
  liveTranscript?: string;
  speechLocale: Locale;
  onSpeechLocaleChange: (locale: Locale) => void;
  onSend: () => void;
  onExit: () => void;
  onClearError: () => void;
}

export function AssistantVoiceModeView({
  isRecording,
  isTranscribing,
  isTalking,
  sending,
  streaming,
  voiceError,
  liveTranscript = "",
  speechLocale,
  onSpeechLocaleChange,
  onSend,
  onExit,
  onClearError,
}: Props) {
  const colors = useColors();
  const { isRTL, locale: uiLocale } = useI18n();
  const isEn = !isRTL;
  const recordPulse = useRef(new Animated.Value(1)).current;
  const talkPulse = useRef(new Animated.Value(1)).current;

  const isProcessing = isTranscribing || sending || streaming;
  const isActive = isRecording || isProcessing || isTalking;
  const voiceText = liveTranscript.trim();
  const sendDisabled = isProcessing || isTalking || (!voiceText && !isRecording);

  useEffect(() => {
    if (!isRecording) {
      recordPulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(recordPulse, {
          toValue: 1.12,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(recordPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isRecording, recordPulse]);

  useEffect(() => {
    if (!isTalking) {
      talkPulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(talkPulse, {
          toValue: 1.1,
          duration: 420,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(talkPulse, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isTalking, talkPulse]);

  const pulse = isTalking ? talkPulse : recordPulse;

  const statusText = (() => {
    if (isRecording && liveTranscript.trim())
      return isEn ? "Listening…" : "جاري الاستماع…";
    if (isRecording) return isEn ? "Speak now…" : "تحدث الآن…";
    if (isTranscribing)
      return isEn ? "Processing speech…" : "جاري معالجة الصوت…";
    if (sending || streaming) return isEn ? "Thinking…" : "جاري التفكير…";
    if (isTalking) return isEn ? "Speaking…" : "جاري الرد…";
    return isEn
      ? "Mic — tap send when done"
      : "الميكروفون — اضغط إرسال عند الانتهاء";
  })();

  const webLogoProps =
    Platform.OS === "web"
      ? ({
          className: [
            "assistant-voice-logo",
            isRecording ? "is-recording" : null,
            isTalking ? "is-talking" : null,
          ]
            .filter(Boolean)
            .join(" "),
        } as { className?: string })
      : {};

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Pressable
        onPress={onExit}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={isEn ? "Exit mic mode" : "إغلاق وضع الميكروفون"}
        style={[styles.closeBtn, isRTL && styles.closeBtnRtl]}
      >
        <X color={colors.mutedForeground} size={22} />
      </Pressable>

      <View style={styles.center}>
        <Animated.View
          style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}
          {...webLogoProps}
        >
          <Logo3elagi height={120} markOnly centered />
          {isRecording ? (
            <View
              style={[styles.recordingRing, { borderColor: colors.primary }]}
            />
          ) : null}
        </Animated.View>

        <View style={styles.statusRow}>
          {isActive && !isRecording ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : null}
          <Text style={[styles.status, { color: colors.foreground }]}>
            {statusText}
          </Text>
        </View>

        <View style={styles.langRow}>
          <LanguageDropdown
            compact
            value={speechLocale}
            onChange={onSpeechLocaleChange}
          />
        </View>
        <Text style={[styles.langHint, { color: colors.mutedForeground }]}>
          {uiLocale === "ar"
            ? "اختر اللغة التي ستتحدث بها"
            : uiLocale === "de"
              ? "Wählen Sie die Sprache, in der Sie sprechen"
              : uiLocale === "es"
                ? "Elige el idioma en el que hablarás"
                : "Choose the language you will speak"}
        </Text>

        {voiceError ? (
          <Pressable onPress={onClearError} style={styles.errorWrap}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {voiceError}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={onSend}
          disabled={sendDisabled}
          accessibilityRole="button"
          accessibilityLabel={isEn ? "Send message" : "إرسال الرسالة"}
          accessibilityState={{ disabled: sendDisabled }}
          style={[
            styles.sendBtn,
            {
              backgroundColor: colors.primary,
              opacity: sendDisabled ? 0.45 : 1,
            },
          ]}
        >
          {isTranscribing ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Send color={colors.primaryForeground} size={22} />
          )}
        </Pressable>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {sendDisabled && (sending || streaming || isTalking)
            ? isEn
              ? "Wait for the AI to finish responding"
              : "انتظر حتى ينتهي المساعد من الرد"
            : isEn
              ? "Finish speaking, then tap send"
              : "انتهِ من الكلام ثم اضغط إرسال"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 16,
    zIndex: 2,
    padding: 8,
  },
  closeBtnRtl: {
    right: undefined,
    left: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  recordingRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    opacity: 0.35,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  status: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  langRow: {
    flexDirection: "row",
    gap: 10,
  },
  langBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  langHint: {
    fontSize: 12,
    textAlign: "center",
  },
  errorWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 10,
  },
  sendBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
  },
});
