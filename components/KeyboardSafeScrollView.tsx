import React from "react";
import { StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import type { ScrollViewProps } from "react-native";

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** Extra space between the keyboard and the focused field. */
  bottomOffset?: number;
};

/** ScrollView that keeps focused inputs visible when the keyboard opens. */
export function KeyboardSafeScrollView({
  children,
  keyboardShouldPersistTaps = "handled",
  keyboardDismissMode = "interactive",
  bottomOffset = 24,
  contentContainerStyle,
  style,
  ...rest
}: Props) {
  return (
    <KeyboardAwareScrollView
      style={[styles.flex, style]}
      contentContainerStyle={contentContainerStyle}
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      {...rest}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
