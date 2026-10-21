import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  MESSAGE_EMOTION_OPTIONS,
  type MessageEmotionType,
} from "@/domains/emotions/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  currentEmotion?: MessageEmotionType | null;
  onSelect: (emotion: MessageEmotionType) => void;
  onClose?: () => void;
  onMore?: () => void;
}

export function MessageEmotionPicker({
  currentEmotion,
  onSelect,
  onClose,
  onMore,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.foreground,
        },
        isRTL && styles.wrapRtl,
      ]}
    >
      {MESSAGE_EMOTION_OPTIONS.map((option) => {
        const selected = currentEmotion === option.type;
        return (
          <Pressable
            key={option.type}
            onPress={() => onSelect(option.type)}
            style={[
              styles.item,
              selected && { backgroundColor: colors.muted },
            ]}
            accessibilityLabel={isRTL ? option.labelAr : option.labelEn}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
          </Pressable>
        );
      })}
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={8} style={styles.moreBtn}>
          <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>⋯</Text>
        </Pressable>
      ) : null}
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  wrapRtl: {
    flexDirection: "row-reverse",
  },
  item: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
});
