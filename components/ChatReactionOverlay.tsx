import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MessageEmotionPicker } from "@/components/MessageEmotionPicker";
import type { ChatMessage } from "@/domains/chat/types";
import type { MessageEmotionType } from "@/domains/emotions/types";

export interface ReactionAnchor {
  top: number;
  left: number;
  width: number;
  mine: boolean;
}

interface Props {
  anchor: ReactionAnchor;
  message: ChatMessage;
  selfUserId?: string | null;
  onSelect: (emotion: MessageEmotionType) => void;
  onClose: () => void;
  onMore?: () => void;
}

export function ChatReactionOverlay({
  anchor,
  message,
  selfUserId,
  onSelect,
  onClose,
  onMore,
}: Props) {
  const currentEmotion = message.emotions?.find((row) => row.userId === selfUserId)?.emotion;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        pointerEvents="box-none"
        style={[
          styles.anchor,
          {
            top: anchor.top,
            left: anchor.left,
            width: anchor.width,
            alignItems: anchor.mine ? "flex-end" : "flex-start",
          },
        ]}
      >
        <MessageEmotionPicker
          currentEmotion={currentEmotion}
          onSelect={onSelect}
          onClose={onClose}
          onMore={onMore}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  anchor: {
    position: "absolute",
  },
});
