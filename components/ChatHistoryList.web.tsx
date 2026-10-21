import { ChatHistoryList as NativeChatHistoryList } from "./ChatHistoryList.tsx";
import React from "react";
import { StyleSheet, View } from "react-native";
import type { ComponentProps } from "react";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";

type Props = ComponentProps<typeof NativeChatHistoryList>;

export function ChatHistoryList(props: Props) {
  const colors = useColors();
  const { isDesktop } = useWebLayout();

  if (!isDesktop) {
    return <NativeChatHistoryList {...props} />;
  }

  return (
    <View style={styles.shell}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <NativeChatHistoryList {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  panel: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
});
