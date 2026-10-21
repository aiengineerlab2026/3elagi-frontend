import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";

type Props = {
  title: string;
  textAlign: "left" | "right" | "center";
  children: React.ReactNode;
  /** Wrap content in a polished surface card */
  card?: boolean;
};

export function DoctorProfileSection({ title, textAlign, children, card = false }: Props) {
  const colors = useColors();

  return (
    <View style={styles.root}>
      <Text style={[styles.title, UI.type.section, { color: colors.foreground, textAlign }]}>
        {title}
      </Text>
      {card ? (
        <View style={[styles.card, surfaceCard(colors.card, colors.border)]}>{children}</View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: UI.space.sm,
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
  },
  card: {
    padding: UI.space.md,
    gap: UI.space.sm,
    flex: 1,
  },
});
