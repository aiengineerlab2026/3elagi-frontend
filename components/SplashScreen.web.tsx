import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Logo3elagi } from "@/components/Logo3elagi";
import { en } from "@/constants/translations";
import { useColors } from "@/hooks/useColors";

const SPLASH_TAGLINE = en.app.tagline;

export function AppSplash({ onDone }: { onDone: () => void }) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const logoHeight = Math.min(Math.round(screenWidth * 0.2), 84);

  const logoScale = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1.06,
        speed: 14,
        bounciness: 14,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        speed: 16,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [logoScale, onDone, taglineOpacity, taglineTranslateY]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.View style={{ transform: [{ scale: logoScale }] }}>
        <Logo3elagi height={logoHeight} centered />
      </Animated.View>

      <Animated.Text
        style={[
          styles.tagline,
          {
            color: colors.mutedForeground,
            opacity: taglineOpacity,
            transform: [{ translateY: taglineTranslateY }],
          },
        ]}
      >
        {SPLASH_TAGLINE}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    fontSize: 14,
    marginTop: 18,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
