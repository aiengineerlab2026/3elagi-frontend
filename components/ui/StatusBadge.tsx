import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { statusBadge } from "@/constants/uiTokens";

type Props = {
  label: string;
  color: string;
  muted?: boolean;
};

export function StatusBadge({ label, color, muted = false }: Props) {
  return (
    <View style={[statusBadge(color, `${color}${muted ? "12" : "18"}`)]}>
      <Text style={[styles.text, { color, opacity: muted ? 0.75 : 1 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
});
