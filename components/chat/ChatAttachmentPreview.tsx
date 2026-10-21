import { Image } from "expo-image";
import { Maximize2, Play, RefreshCw, X } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  ContainedVideo,
  type ContainedVideoHandle,
} from "@/components/chat/ContainedVideo";
import { useColors } from "@/hooks/useColors";
import { chatFlexRow } from "@/utils/rtl";

export type AttachmentPreviewItem = {
  uri: string;
  type: "image" | "video";
};

interface Props {
  attachment: AttachmentPreviewItem;
  isRTL: boolean;
  onRemove: () => void;
  onReplace: () => void;
  onExpandImage: (uri: string) => void;
  onExpandVideo: (uri: string) => void;
}

export function ChatAttachmentPreview({
  attachment,
  isRTL,
  onRemove,
  onReplace,
  onExpandImage,
  onExpandVideo,
}: Props) {
  const colors = useColors();
  const rowDir = chatFlexRow();
  const { width: screenWidth } = useWindowDimensions();
  const previewWidth = Math.max(200, screenWidth - 24);
  const previewHeight = 220;
  const videoRef = useRef<ContainedVideoHandle>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const toggleVideoPreview = async () => {
    if (attachment.type !== "video") return;
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

  return (
    <View style={styles.wrap}>
      <View style={styles.mediaShell}>
        {attachment.type === "image" ? (
          <Pressable
            onPress={() => onExpandImage(attachment.uri)}
            style={[styles.mediaPressable, { width: previewWidth, height: previewHeight }]}
          >
            <Image
              source={{ uri: attachment.uri }}
              style={styles.media}
              contentFit="cover"
            />
            <View style={styles.expandHint}>
              <Maximize2 size={16} color="#fff" />
            </View>
          </Pressable>
        ) : (
          <View style={[styles.mediaPressable, { width: previewWidth, height: previewHeight }]}>
            <ContainedVideo
              ref={videoRef}
              uri={attachment.uri}
              width={previewWidth}
              height={previewHeight}
              controls={false}
              onEnded={() => setVideoPlaying(false)}
            />
            {!videoPlaying ? (
              <Pressable style={styles.playOverlay} onPress={() => void toggleVideoPreview()}>
                <View style={styles.playCircle}>
                  <Play size={26} color="#fff" fill="#fff" />
                </View>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.expandHint}
              onPress={() => onExpandVideo(attachment.uri)}
              hitSlop={8}
            >
              <Maximize2 size={16} color="#fff" />
            </Pressable>
          </View>
        )}

        <Pressable
          style={styles.removeBtn}
          onPress={onRemove}
          hitSlop={8}
          accessibilityLabel={isRTL ? "إزالة المرفق" : "Remove attachment"}
        >
          <X size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={[styles.actions, { flexDirection: rowDir }]}>
        <Pressable
          onPress={onReplace}
          style={({ pressed }) => [
            styles.actionBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <RefreshCw size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {isRTL ? "استبدال" : "Replace"}
          </Text>
        </Pressable>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {isRTL ? "أضف تعليقاً اختيارياً ثم أرسل" : "Add an optional caption, then send"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  mediaShell: {
    position: "relative",
    borderRadius: 14,
    overflow: "hidden",
  },
  mediaPressable: {
    backgroundColor: "#000",
    alignSelf: "center",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  expandHint: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  hint: {
    flex: 1,
    fontSize: 12,
    textAlign: "center",
  },
});
