import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useAuthStore } from "@/domains/auth/store";
import { blobToBase64, transcribeAssistantAudio } from "@/domains/ai/stt";
import { useI18n } from "@/hooks/useI18n";
import {
  createWebSpeechSession,
  isWebSpeechRecognitionSupported,
  WebMediaRecorderSession,
  type WebSpeechSession,
} from "@/utils/assistantSpeechRecognition";
import { NativeAssistantRecorder } from "@/utils/assistantVoiceAudio";
import {
  pickSpeechLocaleFromBrowser,
  resolveWebSpeechLang,
} from "@/utils/webSpeechLang";
import { showAppAlert } from "@/utils/appAlert";

type Options = {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * Mic dictation for a text field.
 * Web: built-in SpeechRecognition API (Chrome / Edge / Safari).
 * Native / fallback: record + backend STT.
 */
export function useFieldDictation({ value, onChangeText }: Options) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { locale, isRTL } = useI18n();
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);

  const valueRef = useRef(value);
  const baseRef = useRef("");
  const webSpeechRef = useRef<WebSpeechSession | null>(null);
  const webMediaRef = useRef<WebMediaRecorderSession | null>(null);
  const nativeRef = useRef<NativeAssistantRecorder | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      webSpeechRef.current?.abort();
      webSpeechRef.current = null;
      void webMediaRef.current?.stop().catch(() => undefined);
      webMediaRef.current = null;
      void nativeRef.current?.cancel();
      nativeRef.current = null;
    };
  }, []);

  const applyTranscript = useCallback(
    (spoken: string) => {
      const spokenTrim = spoken.trim();
      if (!spokenTrim) return;
      const base = baseRef.current.trim();
      onChangeText(base ? `${base} ${spokenTrim}` : spokenTrim);
    },
    [onChangeText],
  );

  const previewTranscript = useCallback(
    (spoken: string) => {
      const spokenTrim = spoken.trim();
      const base = baseRef.current.trim();
      if (!spokenTrim) {
        onChangeText(base);
        return;
      }
      onChangeText(base ? `${base} ${spokenTrim}` : spokenTrim);
    },
    [onChangeText],
  );

  const stopMediaOrNative = useCallback(async () => {
    setBusy(true);
    try {
      if (!accessToken) {
        throw new Error(isRTL ? "سجّل الدخول أولاً" : "Sign in first");
      }
      if (Platform.OS === "web" && webMediaRef.current) {
        const session = webMediaRef.current;
        webMediaRef.current = null;
        const { blob, mimeType } = await session.stop();
        const base64 = await blobToBase64(blob);
        const text = await transcribeAssistantAudio(
          accessToken,
          base64,
          mimeType,
          "auto",
        );
        applyTranscript(text);
        return;
      }
      if (nativeRef.current) {
        const recorder = nativeRef.current;
        nativeRef.current = null;
        const { base64, mimeType } = await recorder.stop();
        const text = await transcribeAssistantAudio(
          accessToken,
          base64,
          mimeType,
          "auto",
        );
        applyTranscript(text);
      }
    } catch (err) {
      showAppAlert(
        isRTL ? "تعذر التعرف على الصوت" : "Could not recognize speech",
        (err as Error).message,
      );
    } finally {
      setListening(false);
      setBusy(false);
    }
  }, [accessToken, applyTranscript, isRTL]);

  const stop = useCallback(async () => {
    if (webSpeechRef.current) {
      const session = webSpeechRef.current;
      webSpeechRef.current = null;
      setBusy(true);
      try {
        const text = await session.stop();
        applyTranscript(text);
      } catch {
        /* ignore */
      } finally {
        setListening(false);
        setBusy(false);
      }
      return;
    }
    await stopMediaOrNative();
  }, [applyTranscript, stopMediaOrNative]);

  const startMediaFallback = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const session = new WebMediaRecorderSession();
        await session.start();
        webMediaRef.current = session;
        setListening(true);
        return;
      }
      const recorder = new NativeAssistantRecorder();
      await recorder.start();
      nativeRef.current = recorder;
      setListening(true);
    } catch (err) {
      setListening(false);
      showAppAlert(
        isRTL ? "إذن الميكروفون مطلوب" : "Microphone permission needed",
        (err as Error).message,
      );
    }
  }, [isRTL]);

  const start = useCallback(async () => {
    if (listening || busy) return;
    baseRef.current = valueRef.current;

    // Web: prefer built-in SpeechRecognition API.
    if (Platform.OS === "web" && isWebSpeechRecognitionSupported()) {
      const speechLocale = locale || pickSpeechLocaleFromBrowser();
      const session = createWebSpeechSession({
        lang: resolveWebSpeechLang(speechLocale),
        continuous: false,
        onStart: () => setListening(true),
        onTranscript: previewTranscript,
        onNaturalEnd: (text) => {
          webSpeechRef.current = null;
          applyTranscript(text);
          setListening(false);
        },
        onEnd: () => {
          if (!webSpeechRef.current) setListening(false);
        },
        onError: (message) => {
          webSpeechRef.current = null;
          setListening(false);
          if (message === "no-speech" || message === "aborted") return;
          if (message === "network" || message === "service-not-allowed") {
            void startMediaFallback();
            return;
          }
          if (message === "not-allowed") {
            showAppAlert(
              isRTL ? "إذن الميكروفون مطلوب" : "Microphone permission needed",
              isRTL
                ? "اسمح بالوصول إلى الميكروفون من إعدادات المتصفح."
                : "Allow microphone access in your browser settings.",
            );
            return;
          }
          showAppAlert(
            isRTL ? "تعذر التعرف على الصوت" : "Could not recognize speech",
            message,
          );
        },
      });
      if (session) {
        webSpeechRef.current = session;
        return;
      }
    }

    await startMediaFallback();
  }, [
    applyTranscript,
    busy,
    isRTL,
    listening,
    locale,
    previewTranscript,
    startMediaFallback,
  ]);

  const toggle = useCallback(() => {
    if (listening || busy) {
      void stop();
      return;
    }
    void start();
  }, [busy, listening, start, stop]);

  return { listening, busy, toggle };
}
