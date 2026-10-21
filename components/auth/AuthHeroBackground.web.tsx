import React from "react";
import { StyleSheet, View } from "react-native";
import { AuthHeroMedia } from "@/components/auth/AuthHeroMedia";

interface Props {
  children: React.ReactNode;
  /** 0–1 primary wash over the hero image. */
  overlayOpacity?: number;
}

/** Full-viewport auth hero image — web only. */
export function AuthHeroBackground({ children, overlayOpacity = 0.48 }: Props) {
  return (
    <View style={styles.page}>
      <AuthHeroMedia overlayOpacity={overlayOpacity} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: "100vh" as unknown as number,
    width: "100%",
    backgroundColor: "#eef4fc",
  },
});
