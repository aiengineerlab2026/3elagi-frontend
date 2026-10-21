import React from "react";
import { StyleSheet, View } from "react-native";

/** Lets auth screens size to content inside the web scroll shell instead of filling the viewport. */
export function AuthScreenRoot({ children }: { children: React.ReactNode }) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignSelf: "stretch",
    flexGrow: 0,
    flexShrink: 0,
  },
});
