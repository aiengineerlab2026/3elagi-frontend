import * as Clipboard from "expo-clipboard";
import { Check, Copy, ThumbsDown, ThumbsUp, Volume2 } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import type { AiFeedbackType } from "@/domains/emotions/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  content: string;
  myFeedback?: AiFeedbackType | null;
  onFeedback?: (emotion: AiFeedbackType) => void;
  onReadAloud?: () => void;
  isReadingAloud?: boolean;
  disabled?: boolean;
}

export function AssistantMessageActions({
  content,
  myFeedback,
  onFeedback,
  onReadAloud,
  isReadingAloud = false,
  disabled = false,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = content.trim();
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert(
        isRTL ? "تعذر النسخ" : "Could not copy",
        isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    }
  }, [content, isRTL]);

  const iconColor = colors.mutedForeground;
  const activeColor = colors.primary;

  return (
    <View style={[styles.row, isRTL && styles.rowRtl]}>
      {onReadAloud ? (
        <Pressable
          onPress={onReadAloud}
          disabled={disabled || !content.trim()}
          hitSlop={8}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityLabel={isRTL ? "قراءة بصوت عالٍ" : "Read aloud"}
        >
          <Volume2
            size={16}
            color={isReadingAloud ? activeColor : iconColor}
            fill={isReadingAloud ? activeColor : "transparent"}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => void handleCopy()}
        disabled={disabled || !content.trim()}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityLabel={isRTL ? "نسخ" : "Copy"}
      >
        {copied ? (
          <Check size={16} color={activeColor} strokeWidth={2.2} />
        ) : (
          <Copy size={16} color={iconColor} strokeWidth={2} />
        )}
      </Pressable>

      <Pressable
        onPress={() => onFeedback?.("like")}
        disabled={disabled || !onFeedback}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityLabel={isRTL ? "إعجاب" : "Like"}
      >
        <ThumbsUp
          size={16}
          color={myFeedback === "like" ? activeColor : iconColor}
          fill={myFeedback === "like" ? activeColor : "transparent"}
          strokeWidth={2}
        />
      </Pressable>

      <Pressable
        onPress={() => onFeedback?.("dislike")}
        disabled={disabled || !onFeedback}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityLabel={isRTL ? "لم يعجبني" : "Dislike"}
      >
        <ThumbsDown
          size={16}
          color={myFeedback === "dislike" ? activeColor : iconColor}
          fill={myFeedback === "dislike" ? activeColor : "transparent"}
          strokeWidth={2}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingLeft: 2,
  },
  rowRtl: {
    flexDirection: "row-reverse",
    paddingLeft: 0,
    paddingRight: 2,
  },
  btn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  btnPressed: {
    opacity: 0.65,
  },
});
