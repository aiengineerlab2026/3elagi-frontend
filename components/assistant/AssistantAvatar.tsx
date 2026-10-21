import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";

interface Props {
  height?: number;
  /** Pulse scale while TTS audio is playing. */
  isTalking?: boolean;
  style?: ViewStyle;
  /** Web-only class hook for CSS animation fallback. */
  webClassName?: string;
}

export function AssistantAvatar({
  height = 28,
  isTalking = false,
  style,
  webClassName,
}: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!isTalking) {
      animationRef.current?.stop();
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 420,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 420,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animationRef.current = animation;
    animation.start();
    return () => animation.stop();
  }, [isTalking, pulse]);

  const webProps =
    Platform.OS === "web"
      ? ({
          className: [webClassName, isTalking ? "is-talking" : null]
            .filter(Boolean)
            .join(" "),
        } as { className?: string })
      : {};

  return (
    <View style={[styles.wrap, style]} {...webProps}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Logo3elagi height={height} markOnly />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
