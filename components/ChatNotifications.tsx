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
import { Logo3elagi } from "@/components/Logo3elagi";
import { CHAT_EVENTS, type ChatMessageReceivedPayload } from "@/domains/chat/events";
import { chatNotificationTitle } from "@/utils/chatNotifications";
import { on } from "@/utils/eventBus";
import { useI18n } from "@/hooks/useI18n";
import { useColors } from "@/hooks/useColors";

const DISMISS_MS = 5000;

export function ChatNotifications() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<ChatMessageReceivedPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentIds = useRef<Set<string>>(new Set());

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
    (payload: ChatMessageReceivedPayload) => {
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

  const showBrowserNotification = useCallback(
    async (payload: ChatMessageReceivedPayload) => {
      if (Platform.OS !== "web" || typeof window === "undefined") return false;
      if (!("Notification" in window)) return false;

      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return false;

      // Prefer native browser notifications when the tab is in the background.
      if (!document.hidden) return false;

      const title = chatNotificationTitle(payload.senderName);
      const notification = new Notification(title, {
        body: payload.preview,
        tag: `chat-${payload.peerId}`,
      });
      notification.onclick = () => {
        window.focus();
        router.push(`/chat/${payload.peerId}`);
        notification.close();
      };
      return true;
    },
    [router],
  );

  useEffect(() => {
    const unsubscribe = on(CHAT_EVENTS.MESSAGE_RECEIVED, (payload) => {
      if (payload.messageId && recentIds.current.has(payload.messageId)) return;
      if (payload.messageId) {
        recentIds.current.add(payload.messageId);
        setTimeout(() => recentIds.current.delete(payload.messageId), 8000);
      }

      void (async () => {
        const usedBrowser = await showBrowserNotification(payload);
        if (!usedBrowser) show(payload);
      })();
    });
    return unsubscribe;
  }, [show, showBrowserNotification]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (!notice) return null;

  const title = chatNotificationTitle(notice.senderName);
  const actionLabel = isRTL ? "فتح المحادثة" : "Open chat";
  const brandLabel = "3elagi";

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
        onPress={() => {
          hide();
          router.push(`/chat/${notice.peerId}`);
        }}
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
              {brandLabel}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
              {notice.preview}
            </Text>
            <Text style={[styles.link, { color: colors.primary }]} numberOfLines={1}>
              {actionLabel}
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
    zIndex: 10000,
    elevation: 10000,
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
  link: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
  },
});
