import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  count: number;
  expanded: boolean;
  isRTL: boolean;
  onToggle: () => void;
  label: string;
  countLabel: (count: number) => string;
};

export function ArchivedMessagesToggle({
  count,
  expanded,
  onToggle,
  label,
  countLabel,
}: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="link"
        accessibilityState={{ expanded }}
        hitSlop={8}
        style={({ pressed }) => [styles.linkHit, pressed && { opacity: 0.65 }]}
      >
        <Text style={[styles.link, { color: colors.primary }]}>
          {`${label} ${countLabel(count)}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  linkHit: {
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
