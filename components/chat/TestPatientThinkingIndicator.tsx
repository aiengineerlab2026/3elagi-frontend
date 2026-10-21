import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";
import { useColors } from "@/hooks/useColors";

interface Props {
  isRTL: boolean;
  rowDir: "row" | "row-reverse";
  style?: ViewStyle;
}

/** Shown while the AI demo patient is composing a reply. */
export function TestPatientThinkingIndicator({ isRTL, rowDir, style }: Props) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.row, { flexDirection: rowDir }, style]}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Logo3elagi height={22} markOnly />
      </Animated.View>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.muted,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {isRTL ? "المريض يفكر…" : "Patient is thinking…"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 6,
    width: "100%",
  },
  bubble: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
