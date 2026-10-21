import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  emotionEmoji,
  type MessageEmotionItem,
  type MessageEmotionType,
} from "@/domains/emotions/types";
import { useColors } from "@/hooks/useColors";

interface Props {
  emotions: MessageEmotionItem[];
  selfUserId?: string | null;
  /** Which corner of the bubble the pill hugs (inner = toward chat center). */
  align?: "left" | "right";
  onToggle?: (emotion: MessageEmotionType) => void;
}

export function MessageEmotionsBar({
  emotions,
  selfUserId,
  align = "left",
  onToggle,
}: Props) {
  const colors = useColors();

  const groups = useMemo(() => {
    const map = new Map<MessageEmotionType, number>();
    for (const item of emotions) {
      map.set(item.emotion, (map.get(item.emotion) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [emotions]);

  if (!groups.length) return null;

  const myEmotion = emotions.find((item) => item.userId === selfUserId)?.emotion;

  return (
    <View
      style={[
        styles.anchor,
        align === "right" ? styles.anchorRight : styles.anchorLeft,
      ]}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.foreground,
          },
        ]}
      >
        {groups.map(([emotion, count]) => {
          const selected = myEmotion === emotion;
          return (
            <Pressable
              key={emotion}
              disabled={!onToggle}
              onPress={() => onToggle?.(emotion)}
              style={[
                styles.item,
                selected && { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Text style={styles.emoji}>{emotionEmoji(emotion)}</Text>
              {count > 1 ? (
                <Text style={[styles.count, { color: colors.mutedForeground }]}>
                  {count}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    bottom: -10,
    zIndex: 2,
  },
  anchorLeft: {
    left: 8,
  },
  anchorRight: {
    right: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 2,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  emoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  count: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
});
