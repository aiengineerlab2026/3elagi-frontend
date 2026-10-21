import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { INTAKE_EXAM_EVENTS, type IntakeExamReminderPayload } from "@/domains/intake-exams/events";
import { on } from "@/utils/eventBus";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

const DISMISS_MS = 8000;

export function IntakeExamNotifications() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<IntakeExamReminderPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -12, duration: 180, useNativeDriver: true }),
    ]).start(() => setNotice(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (payload: IntakeExamReminderPayload) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setNotice(payload);
      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      hideTimer.current = setTimeout(hide, DISMISS_MS);
    },
    [hide, opacity, translateY],
  );

  useEffect(() => {
    const unsub = on(INTAKE_EXAM_EVENTS.REMINDER, (payload: IntakeExamReminderPayload) => {
      show(payload);
    });
    return () => {
      unsub();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [show]);

  if (!notice) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          top: insets.top + (Platform.OS === "web" ? 12 : 8),
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => {
          hide();
          router.push(`/medical/${notice.instanceId}`);
        }}
        style={[styles.banner, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "800" }}>{notice.title}</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>
          {notice.body ||
            (isRTL
              ? `فحص "${notice.examName}" من د. ${notice.doctorName}`
              : `"${notice.examName}" from Dr. ${notice.doctorName} is due soon`)}
        </Text>
        <Text style={{ color: colors.primary, fontWeight: "700", marginTop: 8 }}>
          {isRTL ? "فتح الفحص" : "Open exam"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9998,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
});
