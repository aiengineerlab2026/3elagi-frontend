import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  APPOINTMENT_EVENTS,
  type AppointmentReminderPayload,
  type AppointmentUpdatedPayload,
} from "@/domains/appointments/events";
import { useAuthStore } from "@/domains/auth/store";
import { on } from "@/utils/eventBus";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

const DISMISS_MS = 8000;
type NoticeState =
  | { kind: "reminder"; payload: AppointmentReminderPayload }
  | { kind: "cancel"; payload: AppointmentUpdatedPayload };

export function AppointmentNotifications() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selfId = useAuthStore((s) => s.profile?.id ?? null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
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
    (nextNotice: NoticeState) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setNotice(nextNotice);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      hideTimer.current = setTimeout(hide, DISMISS_MS);
    },
    [hide, opacity, translateY],
  );

  useEffect(() => {
    const unsubscribe = on(APPOINTMENT_EVENTS.REMINDER, (payload: AppointmentReminderPayload) => {
      show({ kind: "reminder", payload });
    });
    return unsubscribe;
  }, [show]);

  useEffect(() => {
    const unsubscribe = on(APPOINTMENT_EVENTS.UPDATED, (payload: AppointmentUpdatedPayload) => {
      if (payload.action !== "cancel") return;
      if (payload.actorId && selfId && payload.actorId === selfId) return;
      show({ kind: "cancel", payload });
    });
    return unsubscribe;
  }, [selfId, show]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (!notice) return null;

  const title =
    notice.kind === "reminder"
      ? isRTL
        ? "موعدك بعد 5 دقائق"
        : "Your meeting is in 5 minutes"
      : isRTL
        ? "تم إلغاء الموعد"
        : "Appointment cancelled";
  const body =
    notice.kind === "reminder"
      ? isRTL
        ? `موعدك مع ${notice.payload.otherParticipantName ?? "الطرف الآخر"} بعد 5 دقائق. اذهب إلى المواعيد للعثور على رابط الغرفة.`
        : `Your meeting with ${notice.payload.otherParticipantName ?? "the other participant"} is in 5 minutes. Go to Appointments to find the room link.`
      : isRTL
        ? `${notice.payload.actorName ?? "الطرف الآخر"} ألغى موعد ${notice.payload.date ?? ""} ${notice.payload.time ?? ""}`.trim()
        : `${notice.payload.actorName ?? "The other person"} cancelled your appointment ${notice.payload.date ?? ""} ${notice.payload.time ?? ""}`.trim();

  const openMeeting = () => {
    hide();
    router.push("/(tabs)/appointments");
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          top: (Platform.OS === "web" ? 72 : insets.top + 68) as number,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={openMeeting}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary,
            shadowColor: colors.foreground,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
          {body}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
  },
  preview: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
});
