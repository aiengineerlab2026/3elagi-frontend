import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo3elagi } from "@/components/Logo3elagi";
import {
  SYSTEM_NOTIFICATION_EVENTS,
  type SystemNotificationPayload,
} from "@/domains/system-notifications/events";
import { on } from "@/utils/eventBus";
import { useColors } from "@/hooks/useColors";

const DISMISS_MS = 5000;

export function SystemNotifications() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<SystemNotificationPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setNotice(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (payload: SystemNotificationPayload) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setNotice(payload);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      hideTimer.current = setTimeout(hide, DISMISS_MS);
    },
    [hide, opacity, translateY],
  );

  useEffect(() => {
    const unsubscribe = on(SYSTEM_NOTIFICATION_EVENTS.RECEIVED, (payload) => {
      show(payload as SystemNotificationPayload);
    });
    return unsubscribe;
  }, [show]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (!notice) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          top: (Platform.OS === "web" ? 12 : insets.top + 8) as number,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={hide}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.foreground,
          },
        ]}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.logoWrap,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Logo3elagi height={22} markOnly />
          </View>
          <View style={styles.content}>
            <Text style={[styles.brand, { color: colors.primary }]} numberOfLines={1}>
              3elagi
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {notice.title?.trim() || "Notification"}
            </Text>
            <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
              {notice.body}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 10001,
    elevation: 10001,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "700",
  },
  preview: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
});
