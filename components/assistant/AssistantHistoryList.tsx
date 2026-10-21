import { Trash2 } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { AiConversation } from "@/domains/ai/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  conversations: AiConversation[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string, isEn: boolean) {
  try {
    return new Date(iso).toLocaleDateString(isEn ? "en-US" : "ar-EG", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/** Scrollable AI conversation list — used in the widget and history modal. */
export function AssistantHistoryList({
  conversations,
  activeId,
  loading,
  onSelect,
  onNewChat,
  onDelete,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const isEn = !isRTL;

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {isEn ? "No conversations yet" : "لا توجد محادثات بعد"}
        </Text>
        <Pressable
          onPress={onNewChat}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>
            {isEn ? "Start a chat" : "ابدأ محادثة"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.listScroll}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
    >
      {conversations.map((c) => {
        const selected = c.id === activeId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[
              styles.item,
              {
                backgroundColor: selected ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.itemBody}>
              <Text
                numberOfLines={2}
                style={[styles.itemTitle, { color: colors.foreground }]}
              >
                {c.title}
              </Text>
              <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                {formatDate(c.updatedAt, isEn)}
              </Text>
            </View>
            {!c.id.startsWith("draft-") ? (
              <Pressable
                onPress={() => onDelete(c.id)}
                hitSlop={8}
                style={styles.deleteBtn}
              >
                <Trash2 size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyText: { fontSize: 15, textAlign: "center" },
  newBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newBtnText: { fontSize: 15, fontWeight: "600" },
  listScroll: { flex: 1 },
  list: { paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 16, gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: "600" },
  itemDate: { fontSize: 12 },
  deleteBtn: { padding: 4 },
});
