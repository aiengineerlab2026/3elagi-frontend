import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

export const RECORD_PULSE_COLOR = "#EF4444";
const HALO_COLOR = "rgba(239, 68, 68, 0.45)";

type Size = "sm" | "md" | "lg";

const SIZE_CFG: Record<
  Size,
  { core: number; halo: number; border: number }
> = {
  sm: { core: 10, halo: 18, border: 2 },
  md: { core: 14, halo: 26, border: 2.5 },
  lg: { core: 20, halo: 36, border: 3 },
};

type Props = {
  size?: Size;
  /** Absolute position for diagram markers. */
  left?: number;
  top?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared red pulsing indicator for zones/organs that already have medical records.
 */
export function RecordPulseDot({ size = "md", left, top, style }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const cfg = SIZE_CFG[size];

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const haloScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.55],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 0],
  });
  const coreScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });

  const positioned = left != null && top != null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.anchor,
        {
          width: cfg.halo,
          height: cfg.halo,
        },
        positioned
          ? {
              position: "absolute",
              left: left - cfg.halo / 2,
              top: top - cfg.halo / 2,
              zIndex: 40,
            }
          : null,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.halo,
          {
            width: cfg.halo,
            height: cfg.halo,
            borderRadius: cfg.halo / 2,
            backgroundColor: HALO_COLOR,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            width: cfg.core,
            height: cfg.core,
            borderRadius: cfg.core / 2,
            borderWidth: cfg.border,
            backgroundColor: RECORD_PULSE_COLOR,
            borderColor: "#fff",
            transform: [{ scale: coreScale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
  },
  core: {
    shadowColor: RECORD_PULSE_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 5,
    elevation: 5,
  },
});
