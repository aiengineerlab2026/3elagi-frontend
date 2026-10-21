import { Audio, type AVPlaybackStatus } from "expo-av";
import { Pause, Play } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";

type Props = {
  uri: string | null | undefined;
  pending?: boolean;
  color: string;
  trackColor: string;
  fillColor: string;
  isRTL: boolean;
  /** Ignored — voice layout uses `isRTL` so Arabic is always right-to-left. */
  rowDir?: "row" | "row-reverse";
  onLongPress?: () => void;
};

/** Decorative waveform heights (0–1). Looks like real audio without needing peaks. */
const WAVE_BARS = [
  0.32, 0.48, 0.72, 0.4, 0.88, 0.55, 0.7, 0.38, 0.92, 0.5, 0.65, 0.78, 0.42,
  0.85, 0.58, 0.68, 0.36, 0.8, 0.52, 0.74, 0.45, 0.9, 0.48, 0.62, 0.34, 0.76,
  0.56, 0.7,
];

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** WhatsApp-style voice bubble: large play control + waveform scrubber. */
export function VoiceMessagePlayer({
  uri,
  pending,
  color,
  trackColor,
  fillColor,
  isRTL,
  onLongPress,
}: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const durationRef = useRef(0);
  const scrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const playingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    durationRef.current = durationMs;
  }, [durationMs]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    return () => {
      const sound = soundRef.current;
      soundRef.current = null;
      if (sound) void sound.unloadAsync();
    };
  }, []);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (status.durationMillis) {
      durationRef.current = status.durationMillis;
      setDurationMs(status.durationMillis);
    }
    if (!scrubbingRef.current) {
      setPositionMs(status.positionMillis ?? 0);
    }
    if (status.didJustFinish) {
      setPlaying(false);
      setPositionMs(0);
      // Rewinding alone restarted the clip: playAsync left the player in
      // shouldPlay state, so seeking back to 0 immediately played it again.
      // Clear shouldPlay and rewind in one status update.
      void soundRef.current?.setStatusAsync({
        shouldPlay: false,
        positionMillis: 0,
      });
    } else {
      setPlaying(status.isPlaying);
    }
  };

  const ensureSound = async () => {
    if (!uri) return null;
    if (soundRef.current) return soundRef.current;
    setLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 80 },
        onStatus,
      );
      soundRef.current = sound;
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        durationRef.current = status.durationMillis;
        setDurationMs(status.durationMillis);
      }
      return sound;
    } finally {
      setLoading(false);
    }
  };

  const measureTrack = () => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackPageXRef.current = x;
      if (width > 0) trackWidthRef.current = width;
    });
  };

  const ratioFromPageX = (pageX: number) => {
    const w = trackWidthRef.current || 1;
    const raw = Math.max(0, Math.min(1, (pageX - trackPageXRef.current) / w));
    return isRTL ? 1 - raw : raw;
  };

  const ratioFromEvent = (e: GestureResponderEvent) => {
    if (typeof e.nativeEvent.pageX === "number") {
      return ratioFromPageX(e.nativeEvent.pageX);
    }
    const x = e.nativeEvent.locationX;
    const w = trackWidthRef.current || 1;
    const raw = Math.max(0, Math.min(1, x / w));
    return isRTL ? 1 - raw : raw;
  };

  const applyScrubPreview = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const duration = durationRef.current;
    if (duration > 0) {
      setPositionMs(clamped * duration);
    } else {
      setPositionMs(clamped);
    }
  };

  const seekToRatio = async (ratio: number, resumeIfWasPlaying?: boolean) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const sound = await ensureSound();
    const duration = durationRef.current;
    if (!sound || !duration) {
      applyScrubPreview(clamped);
      return;
    }
    const next = clamped * duration;
    setPositionMs(next);
    try {
      await sound.setPositionAsync(next);
      if (resumeIfWasPlaying) {
        await sound.playAsync();
        setPlaying(true);
      }
    } catch {
      /* ignore */
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !pending && !!uri,
        onMoveShouldSetPanResponder: () => !pending && !!uri,
        onStartShouldSetPanResponderCapture: () => !pending && !!uri,
        onMoveShouldSetPanResponderCapture: () => !pending && !!uri,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          scrubbingRef.current = true;
          setScrubbing(true);
          wasPlayingRef.current = playingRef.current;
          measureTrack();
          const ratio = ratioFromEvent(e);
          applyScrubPreview(ratio);
          void (async () => {
            const sound = await ensureSound();
            if (sound && playingRef.current) {
              try {
                await sound.pauseAsync();
              } catch {
                /* ignore */
              }
            }
            void seekToRatio(ratio);
          })();
        },
        onPanResponderMove: (e) => {
          applyScrubPreview(ratioFromEvent(e));
        },
        onPanResponderRelease: (e) => {
          const ratio = ratioFromEvent(e);
          scrubbingRef.current = false;
          setScrubbing(false);
          void seekToRatio(ratio, wasPlayingRef.current);
        },
        onPanResponderTerminate: () => {
          scrubbingRef.current = false;
          setScrubbing(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pan handlers use latest refs
    [pending, uri, isRTL],
  );

  const togglePlay = async () => {
    if (!uri || pending) return;
    try {
      const sound = await ensureSound();
      if (!sound) return;
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await sound.pauseAsync();
        setPlaying(false);
        return;
      }
      if (
        status.didJustFinish ||
        (status.durationMillis &&
          status.positionMillis >= status.durationMillis - 40)
      ) {
        await sound.setPositionAsync(0);
        setPositionMs(0);
      }
      await sound.playAsync();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setLoading(false);
    }
  };

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;
  const elapsedLabel = formatMs(positionMs);
  const durationLabel = durationMs > 0 ? formatMs(durationMs) : "0:00";
  const timeLabel = pending
    ? isRTL
      ? "جاري الإرسال…"
      : "Sending…"
    : playing || positionMs > 0 || scrubbing
      ? elapsedLabel
      : durationLabel;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
    measureTrack();
  };

  const knobSize = scrubbing ? 14 : 11;
  const knobOffset = knobSize / 2;
  // Voice player follows locale RTL even though chat chrome stays LTR.
  const voiceRowDir: "row" | "row-reverse" = isRTL ? "row-reverse" : "row";

  const iconColor = "#ffffff";

  return (
    <View style={[styles.row, { flexDirection: voiceRowDir }]}>
      <Pressable
        onPress={() => void togglePlay()}
        onLongPress={onLongPress}
        delayLongPress={400}
        disabled={pending || !uri || loading}
        hitSlop={10}
        style={({ pressed }) => [
          styles.playBtn,
          {
            backgroundColor: fillColor,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        {pending || loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : playing ? (
          <Pause size={15} color={iconColor} fill={iconColor} />
        ) : (
          <View style={[styles.playIconWrap, isRTL && styles.playIconWrapRtl]}>
            <Play size={15} color={iconColor} fill={iconColor} />
          </View>
        )}
      </Pressable>

      <View style={styles.trackBlock}>
        <View
          ref={trackRef}
          onLayout={onTrackLayout}
          style={[styles.trackHit, Platform.OS === "web" && styles.trackHitWeb]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.waveRow, { flexDirection: voiceRowDir }]}>
            {WAVE_BARS.map((h, i) => {
              // Progress grows from the start edge: left in LTR, right in RTL.
              const barProgress = (i + 0.5) / WAVE_BARS.length;
              const active = barProgress <= progress;
              return (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: 4 + h * 12,
                      backgroundColor: active ? fillColor : trackColor,
                      opacity: active ? 1 : 0.7,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.scrubRail} pointerEvents="none">
            <View
              style={[
                styles.knob,
                {
                  width: knobSize,
                  height: knobSize,
                  borderRadius: knobSize / 2,
                  backgroundColor: fillColor,
                  borderColor: "#ffffff",
                  [isRTL ? "right" : "left"]: `${progress * 100}%`,
                  marginLeft: isRTL ? 0 : -knobOffset,
                  marginRight: isRTL ? -knobOffset : 0,
                  transform: [{ scale: scrubbing ? 1.1 : 1 }],
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.timeRow, { flexDirection: voiceRowDir }]}>
          <Text style={[styles.time, { color, textAlign: isRTL ? "right" : "left" }]}>
            {timeLabel}
          </Text>
          {!pending && durationMs > 0 && (playing || positionMs > 0 || scrubbing) ? (
            <Text
              style={[styles.timeMuted, { color, textAlign: isRTL ? "left" : "right" }]}
            >
              {durationLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 8,
    minWidth: 190,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  playIconWrap: {
    marginLeft: 1,
  },
  playIconWrapRtl: {
    marginLeft: 0,
    marginRight: 1,
  },
  trackBlock: {
    flex: 1,
    gap: 1,
    minWidth: 120,
  },
  trackHit: {
    height: 26,
    justifyContent: "center",
  },
  trackHitWeb: {
    // @ts-expect-error web-only cursor
    cursor: "pointer",
    userSelect: "none",
  },
  waveRow: {
    alignItems: "center",
    justifyContent: "space-between",
    height: 18,
    gap: 1.5,
  },
  waveBar: {
    flex: 1,
    maxWidth: 3,
    minWidth: 2,
    borderRadius: 1.5,
  },
  scrubRail: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  knob: {
    position: "absolute",
    borderWidth: 1.5,
    zIndex: 2,
    shadowColor: "#0F766E",
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  timeRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  time: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    opacity: 0.85,
    letterSpacing: 0.2,
    lineHeight: 13,
  },
  timeMuted: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    opacity: 0.5,
    lineHeight: 12,
  },
});
