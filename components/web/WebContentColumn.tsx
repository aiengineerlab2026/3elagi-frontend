import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props extends ViewProps {
  children: React.ReactNode;
  maxWidth?: number;
  wide?: boolean;
  /** No width cap — lets an inner ScrollView keep its scrollbar on the page edge. */
  fluid?: boolean;
}

export function WebContentColumn({
  children,
  maxWidth,
  wide = false,
  fluid = false,
  style,
  ...rest
}: Props) {
  const { isDesktop } = useWebLayout();
  const limit = maxWidth ?? (wide ? WEB_MAX_WIDTH.wide : WEB_MAX_WIDTH.content);

  if (!isDesktop || fluid) {
    return (
      <View style={[styles.fill, style]} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.fill, styles.center, style]} {...rest}>
      <View style={[styles.column, { maxWidth: limit }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: "100%", minHeight: 0 },
  center: { alignItems: "center" },
  column: { flex: 1, width: "100%", minHeight: 0 },
});
