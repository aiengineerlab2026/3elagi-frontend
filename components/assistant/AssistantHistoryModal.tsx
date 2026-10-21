import { Plus, X } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AssistantHistoryList } from "@/components/assistant/AssistantHistoryList";
import type { AiConversation } from "@/domains/ai/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  visible: boolean;
  conversations: AiConversation[];
  activeId: string | null;
  loading: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export function AssistantHistoryModal({
  visible,
  conversations,
  activeId,
  loading,
  onClose,
  onSelect,
  onNewChat,
  onDelete,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isRTL } = useI18n();
  const isEn = !isRTL;

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View style={[styles.header, isRTL && styles.headerRtl]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.iconBtn}>
            <X color={colors.foreground} size={22} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isEn ? "AI Chats" : "محادثات الذكاء الاصطناعي"}
          </Text>
          <Pressable onPress={handleNewChat} hitSlop={10} style={styles.iconBtn}>
            <Plus color={colors.primary} size={22} />
          </Pressable>
        </View>

        <AssistantHistoryList
          conversations={conversations}
          activeId={activeId}
          loading={loading}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
          onDelete={onDelete}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRtl: { flexDirection: "row-reverse" },
  iconBtn: { width: 36, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700" },
});
