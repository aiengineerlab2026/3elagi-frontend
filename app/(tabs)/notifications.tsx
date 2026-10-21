import { useFocusEffect } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import type { AppNotification } from "@/domains/notifications/api";
import { useNotificationsStore } from "@/domains/notifications/store";
import { navigateFromPushNotification } from "@/domains/push/navigation";
import { parsePushNotificationData } from "@/domains/push/types";
import { openAsk3elagiAiWithChat } from "@/domains/ai/widget-store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

function formatWhen(iso: string, isRTL: boolean): string {
  try {
    return new Date(iso).toLocaleString(isRTL ? "ar" : undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function NotificationsTab() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const items = useNotificationsStore((s) => s.items);
  const loading = useNotificationsStore((s) => s.loading);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const load = useNotificationsStore((s) => s.load);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      void load(accessToken);
    }, [accessToken, load]),
  );

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  const openNotification = async (item: AppNotification) => {
    if (!accessToken) return;
    if (!item.read_at) {
      await markRead(accessToken, item.id);
    }
    const parsed = parsePushNotificationData(item.data);
    if (parsed?.type === "ai") {
      openAsk3elagiAiWithChat(parsed.chatId);
      return;
    }
    if (parsed) {
      navigateFromPushNotification(router, parsed);
      return;
    }
    // Fallback: chat / AI ids in data without type.
    const chatId = item.data.chatId || item.data.chat_id;
    if (item.type === "ai" && chatId) {
      openAsk3elagiAiWithChat(String(chatId));
      return;
    }
    if (chatId) {
      router.push(`/chat/${chatId}`);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <View style={[styles.toolbar, { flexDirection: dir }]}>
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {t.tabs.notifications}
        </Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => accessToken && void markAllRead(accessToken)}
            hitSlop={8}
          >
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
              {t.inbox.markAllRead}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
            {t.inbox.empty}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const unread = !item.read_at;
            return (
              <Pressable
                onPress={() => void openNotification(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    flexDirection: dir,
                    backgroundColor: unread
                      ? `${colors.primary}10`
                      : colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: unread ? "#ef4444" : "transparent",
                    },
                  ]}
                />
                <View style={styles.body}>
                  <Text
                    style={[
                      styles.rowTitle,
                      {
                        color: colors.foreground,
                        textAlign,
                        fontWeight: unread ? "800" : "700",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.rowBody,
                      { color: colors.mutedForeground, textAlign },
                    ]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                  <Text
                    style={[
                      styles.when,
                      { color: colors.mutedForeground, textAlign },
                    ]}
                  >
                    {formatWhen(item.created_at, isRTL)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "800", flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  row: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  body: { flex: 1, gap: 4, minWidth: 0 },
  rowTitle: { fontSize: 15 },
  rowBody: { fontSize: 13, lineHeight: 18 },
  when: { fontSize: 11, marginTop: 2 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
});
