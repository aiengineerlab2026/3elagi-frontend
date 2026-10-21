import React from "react";
import { StyleSheet, View, type ScrollViewProps } from "react-native";

type Props = ScrollViewProps & {
  children: React.ReactNode;
};

/** On web, auth pages scroll via the outer page shell — no nested scroll views. */
export function KeyboardSafeScrollView({
  children,
  contentContainerStyle,
  style,
}: Props) {
  return (
    <View style={[styles.root, style]}>
      <View style={[styles.content, contentContainerStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "stretch",
  },
  content: {
    flexGrow: 1,
    minHeight: 0,
    width: "100%",
  },
});
