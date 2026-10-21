import { Maximize2, Play } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  ContainedVideo,
  type ContainedVideoHandle,
} from "@/components/chat/ContainedVideo";

interface Props {
  uri: string;
  width: number;
  height: number;
  isRTL: boolean;
  pending?: boolean;
  onExpand: (uri: string) => void;
  onLongPress?: () => void;
}

export function ChatInlineVideo({
  uri,
  width,
  height,
  isRTL,
  pending = false,
  onExpand,
  onLongPress,
}: Props) {
  const videoRef = useRef<ContainedVideoHandle>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const startInlinePlayback = async () => {
    if (pending) return;
    setPlaying(true);
    try {
      await videoRef.current?.play();
    } catch {
      setPlaying(false);
    }
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={pending}
      style={{ width, height }}
    >
      <View style={[styles.wrap, { width, height }]}>
        <ContainedVideo
          ref={videoRef}
          uri={uri}
          width={width}
          height={height}
          controls={false}
          onLoaded={() => setLoading(false)}
          onEnded={() => setPlaying(false)}
        />

        {loading || pending ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
            {pending ? (
              <Text style={styles.overlayText}>
                {isRTL ? "جاري إرسال الفيديو…" : "Sending video…"}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!playing && !pending && !loading ? (
          <Pressable style={styles.overlay} onPress={() => void startInlinePlayback()}>
            <View style={styles.playCircle}>
              <Play size={28} color="#fff" fill="#fff" />
            </View>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.expandBtn}
          onPress={() => onExpand(uri)}
          hitSlop={8}
          accessibilityLabel={isRTL ? "عرض بحجم كامل" : "Fullscreen"}
        >
          <Maximize2 size={16} color="#fff" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  overlayText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 8,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  expandBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
