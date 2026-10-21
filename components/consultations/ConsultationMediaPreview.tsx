import { Audio } from "expo-av";
import { Image } from "expo-image";
import { Maximize2, Mic, Play, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ContainedVideo,
  type ContainedVideoHandle,
} from "@/components/chat/ContainedVideo";
import type { useColors } from "@/hooks/useColors";

type Colors = ReturnType<typeof useColors>;

export type ConsultationMediaItem = {
  type: "image" | "video" | "voice";
  url: string;
  previewUri?: string;
};

interface Props {
  item: ConsultationMediaItem;
  isRTL: boolean;
  colors: Colors;
  onRemove: () => void;
  onExpandImage?: (uri: string) => void;
  onExpandVideo?: (uri: string) => void;
}

const THUMB = 72;

export function ConsultationMediaPreview({
  item,
  isRTL,
  colors,
  onRemove,
  onExpandImage,
  onExpandVideo,
}: Props) {
  const displayUri = item.previewUri ?? item.url;
  const voiceUri = item.url || item.previewUri;
  const rowDir = isRTL ? "row-reverse" : "row";
  const videoRef = useRef<ContainedVideoHandle>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);

  const stopVoice = async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    setVoicePlaying(false);
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {
        /* ignore */
      }
    }
  };

  const toggleVoice = async () => {
    if (voicePlaying) {
      await stopVoice();
      return;
    }
    setVoicePlaying(true);
    try {
      if (Platform.OS !== "web") {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      }
      const { sound } = await Audio.Sound.createAsync({ uri: voiceUri ?? displayUri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          void stopVoice();
        }
      });
      await sound.playAsync();
    } catch {
      await stopVoice();
    }
  };

  const toggleVideo = async () => {
    if (videoPlaying) {
      videoRef.current?.pause();
      setVideoPlaying(false);
      return;
    }
    setVideoPlaying(true);
    try {
      await videoRef.current?.play();
    } catch {
      setVideoPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      void stopVoice();
    };
  }, []);

  if (item.type === "voice") {
    return (
      <View
        style={[
          styles.voiceRow,
          { flexDirection: rowDir, borderColor: colors.border, backgroundColor: colors.muted },
        ]}
      >
        <Pressable
          onPress={() => void toggleVoice()}
          style={[styles.voicePlay, { backgroundColor: colors.primary }]}
          hitSlop={6}
        >
          {voicePlaying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Play size={16} color="#fff" fill="#fff" />
          )}
        </Pressable>
        <Mic size={16} color={colors.primary} />
        <Text
          style={[styles.voiceLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
        >
          {voicePlaying
            ? isRTL
              ? "جاري التشغيل…"
              : "Playing…"
            : isRTL
              ? "رسالة صوتية — اضغط للتشغيل"
              : "Voice message — tap to play"}
        </Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <X size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.mediaRow,
        { flexDirection: rowDir, borderColor: colors.border, backgroundColor: colors.muted },
      ]}
    >
      <View style={styles.thumbShell}>
        {item.type === "image" ? (
          <Pressable
            onPress={() => onExpandImage?.(displayUri)}
            style={styles.thumbPressable}
          >
            <Image source={{ uri: displayUri }} style={styles.thumb} contentFit="cover" />
            <View style={styles.expandHint}>
              <Maximize2 size={12} color="#fff" />
            </View>
          </Pressable>
        ) : (
          <View style={styles.thumbPressable}>
            <ContainedVideo
              ref={videoRef}
              uri={displayUri}
              width={THUMB}
              height={THUMB}
              controls={false}
              onEnded={() => setVideoPlaying(false)}
            />
            {!videoPlaying ? (
              <Pressable style={styles.playOverlay} onPress={() => void toggleVideo()}>
                <Play size={18} color="#fff" fill="#fff" />
              </Pressable>
            ) : null}
            <Pressable
              style={styles.expandHint}
              onPress={() => onExpandVideo?.(displayUri)}
              hitSlop={6}
            >
              <Maximize2 size={12} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>
      <View style={styles.mediaMeta}>
        <Text style={[styles.typeLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {item.type === "image" ? (isRTL ? "صورة" : "Image") : isRTL ? "فيديو" : "Video"}
        </Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={8}>
        <X size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mediaRow: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  thumbShell: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000",
    flexShrink: 0,
  },
  thumbPressable: {
    width: THUMB,
    height: THUMB,
    position: "relative",
  },
  thumb: {
    width: THUMB,
    height: THUMB,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  expandHint: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaMeta: {
    flex: 1,
    minWidth: 0,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  voiceRow: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voicePlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  voiceLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
});
