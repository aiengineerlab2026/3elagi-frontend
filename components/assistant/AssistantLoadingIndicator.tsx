import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { AssistantAvatar } from "@/components/assistant/AssistantAvatar";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  /** Smaller layout for message bubbles. */
  compact?: boolean;
  style?: ViewStyle;
  /** History fetch vs AI generating a reply. */
  variant?: "history" | "response";
  /** TTS playback — pulse the 3elagi mark while speaking. */
  isTalking?: boolean;
}

function LoadingDots({ color, size }: { color: string; size: number }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((index) => {
        const opacity = progress.interpolate({
          inputRange: [0, 0.2, 0.45, 0.7, 1],
          outputRange:
            index === 0
              ? [0.25, 1, 0.25, 0.25, 0.25]
              : index === 1
                ? [0.25, 0.25, 1, 0.25, 0.25]
                : [0.25, 0.25, 0.25, 1, 0.25],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 0.2, 0.45, 0.7, 1],
          outputRange:
            index === 0
              ? [0, -3, 0, 0, 0]
              : index === 1
                ? [0, 0, -3, 0, 0]
                : [0, 0, 0, -3, 0],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function AssistantLoadingIndicator({
  compact = false,
  style,
  variant = "response",
  isTalking = false,
}: Props) {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTalking) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [float, isTalking]);

  const logoTranslateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const logoScale = float.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const logoSize = compact ? 28 : 36;
  const dotSize = compact ? 4 : 5;
  const label =
    variant === "history"
      ? t.common.loading
      : isRTL
        ? "جاري إنشاء الإجابة"
        : "Generating answer";

  return (
    <View
      style={[
        styles.row,
        compact ? styles.rowCompact : styles.rowDefault,
        isRTL && styles.rowRtl,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <Animated.View
        style={
          isTalking
            ? undefined
            : {
                transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
              }
        }
      >
        <AssistantAvatar
          height={logoSize}
          isTalking={isTalking}
          webClassName="assistant-avatar"
        />
      </Animated.View>

      <View style={[styles.labelRow, isRTL && styles.labelRowRtl]}>
        <Text
          style={[
            compact ? styles.labelCompact : styles.label,
            { color: colors.mutedForeground },
          ]}
        >
          {label}
        </Text>
        <LoadingDots color={colors.primary} size={dotSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowCompact: {
    gap: 10,
    paddingVertical: 2,
  },
  rowDefault: {
    gap: 12,
    paddingVertical: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  labelRowRtl: {
    flexDirection: "row-reverse",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  labelCompact: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  dot: {},
});
