import React from "react";
import { StyleSheet, View } from "react-native";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props {
  children: React.ReactNode;
  maxWidth?: number;
}

export function WebStackScreen({ children, maxWidth = WEB_MAX_WIDTH.stack }: Props) {
  const colors = useColors();
  const { isDesktop } = useWebLayout();

  if (!isDesktop) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.panel,
          {
            maxWidth,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  shell: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  panel: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
});
