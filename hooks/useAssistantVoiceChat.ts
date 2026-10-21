import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { blobToBase64, transcribeAssistantAudio } from "@/domains/ai/stt";
import { fetchAssistantTts } from "@/domains/ai/tts";
import type { AiMessage } from "@/domains/ai/types";
import { useAuthStore } from "@/domains/auth/store";
import type { Locale } from "@/domains/i18n/store";
import { useI18nStore } from "@/domains/i18n/store";
import {
  createWebSpeechSession,
  isWebSpeechRecognitionSupported,
  WebMediaRecorderSession,
  type WebSpeechSession,
} from "@/utils/assistantSpeechRecognition";
import { resolveWebSpeechLang } from "@/utils/webSpeechLang";
import { stripMarkdownForTts } from "@/utils/stripMarkdownForTts";
import { splitSpokenWords } from "@/utils/spokenWords";
import {
  friendlyAssistantVoiceError,
  NativeAssistantRecorder,
  playAssistantTtsBuffer,
} from "@/utils/assistantVoiceAudio";

function getLatestAssistantMessage(messages: AiMessage[]): AiMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (
      message?.role === "assistant" &&
      !message.pending &&
      message.content?.trim()
    ) {
      return message;
    }
  }
  return null;
}

type StartRecordingOpts = {
  continuous?: boolean;
  /** Composer mic — speech-to-text into input, not voice talk. */
  dictation?: boolean;
  /** Override recognition language (e.g. after switching mid-session). */
  lang?: Locale;
};

type Options = {
  messages: AiMessage[];
  sending: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  /** @deprecated Use app locale from store; kept for callers that still pass it. */
  isRTL?: boolean;
};

export type SpokenHighlight = {
  messageId: string;
  wordIndex: number;
  words: string[];
};

export function useAssistantVoiceChat({
  messages,
  sending,
  streaming,
  onSend,
}: Options) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const appLocale = useI18nStore((s) => s.locale);
  const [speechLocale, setSpeechLocale] = useState<Locale>(appLocale);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [spokenHighlight, setSpokenHighlight] = useState<SpokenHighlight | null>(
    null,
  );

  const autoSpeakRef = useRef(false);
  const voiceTurnRef = useRef(0);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const stopPlaybackRef = useRef<(() => void) | null>(null);
  const webSpeechSessionRef = useRef<WebSpeechSession | null>(null);
  const webMediaRecorderRef = useRef<WebMediaRecorderSession | null>(null);
  const nativeRecorderRef = useRef<NativeAssistantRecorder | null>(null);
  const sentTranscriptRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const speechLocaleRef = useRef<Locale>(appLocale);
  const voiceLoopRef = useRef(false);
  const voiceSendInFlightRef = useRef(false);
  const dictationRef = useRef(false);
  const dictationCallbackRef = useRef<((text: string) => void) | null>(null);
  const isTalkingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isVoiceModeRef = useRef(false);
  const sendingRef = useRef(false);
  const startRecordingRef = useRef<
    ((opts?: StartRecordingOpts) => Promise<void>) | null
  >(null);

  useEffect(() => {
    speechLocaleRef.current = speechLocale;
  }, [speechLocale]);

  // Keep dictation/composer locale in sync — do not override voice-mode language pick.
  useEffect(() => {
    if (!isVoiceMode) {
      setSpeechLocale(appLocale);
      speechLocaleRef.current = appLocale;
    }
  }, [appLocale, isVoiceMode]);

  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    isTalkingRef.current = isTalking;
  }, [isTalking]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  const stopPlayback = useCallback(async () => {
    stopPlaybackRef.current?.();
    stopPlaybackRef.current = null;
    setIsTalking(false);
  }, []);

  const resetTranscriptState = useCallback(() => {
    liveTranscriptRef.current = "";
    setLiveTranscript("");
    sentTranscriptRef.current = false;
  }, []);

  const finishDictation = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const cb = dictationCallbackRef.current;
      webSpeechSessionRef.current = null;
      dictationRef.current = false;
      dictationCallbackRef.current = null;
      setIsDictating(false);
      setIsRecording(false);
      resetTranscriptState();
      if (trimmed && cb) cb(trimmed);
    },
    [resetTranscriptState],
  );

  const finishVoiceInput = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (dictationRef.current) {
        finishDictation(text);
        return;
      }
      if (!trimmed) {
        if (voiceLoopRef.current) {
          if (voiceSendInFlightRef.current) {
            setVoiceError("No speech detected.");
          }
          resetTranscriptState();
          return;
        }
        setVoiceError("No speech detected.");
        return;
      }
      if (sentTranscriptRef.current) return;
      void stopPlayback();
      voiceTurnRef.current += 1;
      sentTranscriptRef.current = true;
      autoSpeakRef.current = true;
      setSpokenHighlight(null);
      lastSpokenMessageIdRef.current = null;
      onSend(trimmed);
      liveTranscriptRef.current = "";
      setLiveTranscript("");
    },
    [finishDictation, onSend, resetTranscriptState, stopPlayback],
  );

  const finalizeWebSpeech = useCallback(
    async (session: WebSpeechSession, fallbackText = "") => {
      const captured =
        fallbackText.trim() || liveTranscriptRef.current.trim();
      let text = captured;
      try {
        const stopped = (await session.stop()).trim();
        text = stopped || captured;
      } catch {
        text = session.getTranscript().trim() || captured;
      }
      finishVoiceInput(text);
      setIsRecording(false);
      webSpeechSessionRef.current = null;
      voiceSendInFlightRef.current = false;
    },
    [finishVoiceInput],
  );

  const handleTranscriptUpdate = useCallback((text: string) => {
    liveTranscriptRef.current = text;
    if (!dictationRef.current) {
      if (voiceLoopRef.current && text.trim()) {
        setSpokenHighlight(null);
      }
      setLiveTranscript(text);
    }
  }, []);

  const speakText = useCallback(
    async (rawText: string, messageId: string) => {
      const turnAtStart = voiceTurnRef.current;
      const text = stripMarkdownForTts(rawText);
      if (!text || !accessToken) {
        sentTranscriptRef.current = false;
        return;
      }

      const words = splitSpokenWords(text);
      const applyHighlight = (highlight: SpokenHighlight | null) => {
        if (voiceTurnRef.current !== turnAtStart) return;
        setSpokenHighlight(highlight);
      };

      setVoiceError(null);
      applyHighlight({ messageId, wordIndex: 0, words });

      try {
        const audioBuffer = await fetchAssistantTts(accessToken, text);
        if (voiceTurnRef.current !== turnAtStart) return;

        const stop = await playAssistantTtsBuffer(audioBuffer, {
          onStart: () => {
            if (voiceTurnRef.current !== turnAtStart) return;
            setIsTalking(true);
          },
          onProgress: (ratio) => {
            if (voiceTurnRef.current !== turnAtStart) return;
            const wordIndex = Math.min(
              Math.max(0, words.length - 1),
              Math.floor(ratio * words.length),
            );
            applyHighlight({ messageId, wordIndex, words });
          },
          onEnd: () => {
            setIsTalking(false);
            stopPlaybackRef.current = null;
            if (voiceTurnRef.current !== turnAtStart) return;
            if (!isVoiceModeRef.current) {
              applyHighlight(null);
              return;
            }
            applyHighlight({
              messageId,
              wordIndex: Math.max(0, words.length - 1),
              words,
            });
          },
          onError: (message) => {
            setIsTalking(false);
            stopPlaybackRef.current = null;
            if (voiceTurnRef.current !== turnAtStart) return;
            applyHighlight(null);
            setVoiceError(message);
          },
        });
        stopPlaybackRef.current = stop;
      } catch (err) {
        setIsTalking(false);
        if (voiceTurnRef.current === turnAtStart) {
          applyHighlight(null);
          setVoiceError(
            friendlyAssistantVoiceError(err, "Voice playback failed."),
          );
        }
      }
    },
    [accessToken],
  );

  const armAutoSpeak = useCallback(() => {
    if (isVoiceMode) {
      autoSpeakRef.current = true;
    }
  }, [isVoiceMode]);

  const transcribeBlob = useCallback(
    async (blob: Blob, mimeType: string) => {
      if (!accessToken) {
        setVoiceError("Sign in to use voice chat.");
        return;
      }
      setIsTranscribing(true);
      try {
        const base64 = await blobToBase64(blob);
        // Auto-detect ar | en | de | es from what was spoken.
        const text = await transcribeAssistantAudio(
          accessToken,
          base64,
          mimeType,
          "auto",
        );
        finishVoiceInput(text);
      } catch (err) {
        setVoiceError((err as Error).message || "Could not transcribe audio.");
      } finally {
        setIsTranscribing(false);
      }
    },
    [accessToken, finishVoiceInput],
  );

  const clearDictationState = useCallback(() => {
    dictationRef.current = false;
    dictationCallbackRef.current = null;
    setIsDictating(false);
  }, []);

  const transcribeNative = useCallback(async () => {
    const recorder = nativeRecorderRef.current;
    if (!recorder?.active || !accessToken) {
      nativeRecorderRef.current = null;
      clearDictationState();
      setIsRecording(false);
      if (!accessToken) {
        setVoiceError("Sign in to use voice chat.");
      }
      return;
    }

    setIsTranscribing(true);
    try {
      const { base64, mimeType } = await recorder.stop();
      nativeRecorderRef.current = null;
      const text = await transcribeAssistantAudio(
        accessToken,
        base64,
        mimeType,
        "auto",
      );
      finishVoiceInput(text);
    } catch (err) {
      nativeRecorderRef.current = null;
      clearDictationState();
      setVoiceError((err as Error).message || "Could not transcribe audio.");
    } finally {
      setIsTranscribing(false);
      setIsRecording(false);
    }
  }, [accessToken, clearDictationState, finishVoiceInput]);

  const stopRecording = useCallback(
    async (fallbackText = "") => {
      const captured =
        fallbackText.trim() || liveTranscriptRef.current.trim();

      if (Platform.OS === "web") {
        const session = webSpeechSessionRef.current;
        if (session) {
          await finalizeWebSpeech(session, captured);
          return;
        }
        const mediaSession = webMediaRecorderRef.current;
        if (mediaSession) {
          setIsRecording(false);
          try {
            const { blob, mimeType } = await mediaSession.stop();
            webMediaRecorderRef.current = null;
            await transcribeBlob(blob, mimeType);
          } catch (err) {
            setVoiceError((err as Error).message || "Recording failed.");
          } finally {
            voiceSendInFlightRef.current = false;
          }
          return;
        }
        if (captured) {
          voiceSendInFlightRef.current = false;
          finishVoiceInput(captured);
        } else {
          voiceSendInFlightRef.current = false;
        }
        return;
      }

      await transcribeNative();
      voiceSendInFlightRef.current = false;
    },
    [finalizeWebSpeech, finishVoiceInput, transcribeBlob, transcribeNative],
  );

  const startRecording = useCallback(
    async (opts?: StartRecordingOpts) => {
      if (isRecordingRef.current || isTranscribing) return;
      if (sendingRef.current) return;
      if (isTalkingRef.current) return;

      setVoiceError(null);
      if (opts?.dictation) {
        dictationRef.current = true;
        setIsDictating(true);
      }
      resetTranscriptState();

      const continuous = opts?.dictation
        ? false
        : (opts?.continuous ?? voiceLoopRef.current);

      const beginMediaFallback = async () => {
        await stopPlayback();
        try {
          if (Platform.OS === "web") {
            const session = new WebMediaRecorderSession();
            await session.start();
            webMediaRecorderRef.current = session;
            setIsRecording(true);
            return;
          }
          const recorder = new NativeAssistantRecorder();
          await recorder.start();
          nativeRecorderRef.current = recorder;
          setIsRecording(true);
        } catch (err) {
          setVoiceError(
            (err as Error).message || "Microphone permission is required.",
          );
          setIsRecording(false);
          if (dictationRef.current) {
            dictationRef.current = false;
            dictationCallbackRef.current = null;
            setIsDictating(false);
          }
        }
      };

      if (Platform.OS === "web") {
        const lang = resolveWebSpeechLang(
          opts?.lang ?? speechLocaleRef.current,
        );

        // Prefer built-in Web Speech API (dictation + voice mode).
        // Fallback: MediaRecorder + backend STT if SpeechRecognition fails.

        if (isWebSpeechRecognitionSupported()) {
          if (webSpeechSessionRef.current) return;

          const session = createWebSpeechSession({
            lang,
            continuous,
            onStart: () => setIsRecording(true),
            onTranscript: handleTranscriptUpdate,
            onNaturalEnd: (text) => {
              if (dictationRef.current) {
                if (text.trim()) finishDictation(text);
                else {
                  dictationRef.current = false;
                  dictationCallbackRef.current = null;
                  setIsDictating(false);
                  setIsRecording(false);
                  webSpeechSessionRef.current = null;
                }
                return;
              }
              if (voiceLoopRef.current) return;
            },
            onEnd: () => {
              if (dictationRef.current) {
                webSpeechSessionRef.current = null;
                setIsRecording(false);
                return;
              }
              if (
                voiceLoopRef.current &&
                !voiceSendInFlightRef.current &&
                !sentTranscriptRef.current &&
                !sendingRef.current &&
                !isTalkingRef.current &&
                webSpeechSessionRef.current === session
              ) {
                webSpeechSessionRef.current = null;
                setIsRecording(false);
                setTimeout(() => {
                  void startRecordingRef.current?.({
                    continuous: true,
                    lang: speechLocaleRef.current,
                  });
                }, 200);
              }
            },
            onError: (message) => {
              if (message === "no-speech") {
                if (dictationRef.current) {
                  dictationRef.current = false;
                  dictationCallbackRef.current = null;
                  setIsDictating(false);
                  setIsRecording(false);
                  webSpeechSessionRef.current = null;
                  return;
                }
                return;
              }
              // Chrome's cloud speech service can fail (network / region /
              // corporate proxy). Recover by recording + backend transcription
              // instead of leaving the user with a dead mic.
              if (message === "network" || message === "service-not-allowed") {
                webSpeechSessionRef.current = null;
                setIsRecording(false);
                void beginMediaFallback();
                return;
              }
              if (message !== "aborted") {
                setVoiceError(message);
              }
              webSpeechSessionRef.current = null;
              setIsRecording(false);
              if (dictationRef.current) {
                dictationRef.current = false;
                dictationCallbackRef.current = null;
                setIsDictating(false);
              }
            },
          });
          if (session) {
            webSpeechSessionRef.current = session;
            void stopPlayback();
            return;
          }
        }

        await beginMediaFallback();
        return;
      }

      await stopPlayback();
      try {
        const recorder = new NativeAssistantRecorder();
        await recorder.start();
        nativeRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        setVoiceError(
          friendlyAssistantVoiceError(err, "Could not start recording."),
        );
        setIsRecording(false);
        if (dictationRef.current) {
          dictationRef.current = false;
          dictationCallbackRef.current = null;
          setIsDictating(false);
        }
      }
    },
    [
      finalizeWebSpeech,
      finishDictation,
      handleTranscriptUpdate,
      isTranscribing,
      resetTranscriptState,
      stopPlayback,
    ],
  );

  startRecordingRef.current = startRecording;

  const sendRecording = useCallback(
    async (fallbackText = "") => {
      const captured =
        fallbackText.trim() || liveTranscriptRef.current.trim();

      if (isRecordingRef.current) {
        voiceSendInFlightRef.current = true;
        await stopRecording(captured);
        return;
      }

      if (!captured) {
        if (voiceLoopRef.current) {
          setVoiceError("No speech detected.");
        }
        return;
      }
      if (sentTranscriptRef.current || sendingRef.current) return;

      voiceSendInFlightRef.current = true;
      voiceSendInFlightRef.current = false;
      finishVoiceInput(captured);
    },
    [finishVoiceInput, stopRecording],
  );

  const abortRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      webSpeechSessionRef.current?.abort();
      webSpeechSessionRef.current = null;
      webMediaRecorderRef.current = null;
    } else {
      void nativeRecorderRef.current?.cancel();
      nativeRecorderRef.current = null;
    }
    dictationRef.current = false;
    dictationCallbackRef.current = null;
    setIsDictating(false);
    setIsRecording(false);
    resetTranscriptState();
  }, [resetTranscriptState]);

  const toggleDictation = useCallback(
    (onComplete: (text: string) => void) => {
      if (isDictating || (isRecording && dictationRef.current)) {
        void stopRecording();
        return;
      }
      if (isRecording) return;
      dictationCallbackRef.current = onComplete;
      void startRecording({ dictation: true, continuous: false });
    },
    [isDictating, isRecording, startRecording, stopRecording],
  );

  const changeSpeechLocale = useCallback(
    async (locale: Locale) => {
      if (locale === speechLocaleRef.current && voiceLoopRef.current) {
        return;
      }
      setSpeechLocale(locale);
      speechLocaleRef.current = locale;
      if (!voiceLoopRef.current) return;

      webSpeechSessionRef.current?.abort();
      webSpeechSessionRef.current = null;
      setIsRecording(false);
      resetTranscriptState();
      sentTranscriptRef.current = false;
      voiceSendInFlightRef.current = false;

      await new Promise((r) => setTimeout(r, 350));
      if (!voiceLoopRef.current) return;
      void startRecordingRef.current?.({
        continuous: true,
        lang: locale,
      });
    },
    [resetTranscriptState],
  );

  const exitVoiceMode = useCallback(async () => {
    voiceLoopRef.current = false;
    await stopPlayback();
    await abortRecording();
    setSpokenHighlight(null);
    setIsVoiceMode(false);
    setVoiceError(null);
  }, [abortRecording, stopPlayback]);

  const enterVoiceMode = useCallback(() => {
    if (isVoiceMode) return;
    if (isDictating) {
      void abortRecording();
    }
    setSpeechLocale(appLocale);
    speechLocaleRef.current = appLocale;
    setIsVoiceMode(true);
    voiceLoopRef.current = true;
    setVoiceError(null);
    resetTranscriptState();
    sentTranscriptRef.current = false;
    void startRecording({ continuous: true, lang: appLocale });
  }, [
    abortRecording,
    appLocale,
    isDictating,
    isVoiceMode,
    resetTranscriptState,
    startRecording,
  ]);

  const toggleVoiceMode = useCallback(() => {
    if (isVoiceMode) {
      void exitVoiceMode();
      return;
    }
    enterVoiceMode();
  }, [enterVoiceMode, exitVoiceMode, isVoiceMode]);

  const toggleVoiceInput = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }
    if (isTalking) return;
    await startRecording({ continuous: voiceLoopRef.current });
  }, [isRecording, isTalking, startRecording, stopRecording]);

  useEffect(() => {
    if (!isVoiceMode || !autoSpeakRef.current || sending || streaming) return;
    const latest = getLatestAssistantMessage(messages);
    if (!latest?.content?.trim()) return;
    if (lastSpokenMessageIdRef.current === latest.id) return;

    lastSpokenMessageIdRef.current = latest.id;
    autoSpeakRef.current = false;
    const words = splitSpokenWords(stripMarkdownForTts(latest.content));
    if (words.length > 0) {
      setSpokenHighlight({
        messageId: latest.id,
        wordIndex: 0,
        words,
      });
    }
    void speakText(latest.content, latest.id);
  }, [isVoiceMode, messages, sending, streaming, speakText]);

  useEffect(() => {
    if (!isVoiceMode || !voiceLoopRef.current || sending || streaming || isTalking) {
      return;
    }
    if (isRecordingRef.current || voiceSendInFlightRef.current) return;
    sentTranscriptRef.current = false;
    void startRecording({
      continuous: true,
      lang: speechLocaleRef.current,
    });
  }, [isVoiceMode, sending, streaming, isTalking, startRecording]);

  useEffect(() => {
    return () => {
      voiceLoopRef.current = false;
      void stopPlayback();
      webSpeechSessionRef.current?.abort();
      webSpeechSessionRef.current = null;
      void nativeRecorderRef.current?.cancel();
      nativeRecorderRef.current = null;
    };
  }, [stopPlayback]);

  const readAloudMessage = useCallback(
    async (messageId: string, rawContent: string) => {
      const playingThisMessage =
        spokenHighlight?.messageId === messageId && isTalking;
      voiceTurnRef.current += 1;
      await stopPlayback();
      if (playingThisMessage) {
        setSpokenHighlight(null);
        return;
      }
      setSpokenHighlight(null);
      await speakText(rawContent, messageId);
    },
    [isTalking, speakText, spokenHighlight?.messageId, stopPlayback],
  );

  return {
    isRecording,
    isTranscribing,
    isTalking,
    isVoiceMode,
    isDictating,
    voiceLoading: isTranscribing,
    voiceError,
    liveTranscript,
    spokenHighlight,
    speechLocale,
    setSpeechLocale: changeSpeechLocale,
    enterVoiceMode,
    exitVoiceMode,
    toggleVoiceMode,
    armAutoSpeak,
    toggleDictation,
    sendRecording,
    toggleVoiceInput,
    stopPlayback,
    readAloudMessage,
    clearVoiceError: () => setVoiceError(null),
  };
}
