import React from "react";
import { StyleSheet, View } from "react-native";
import { DocumentationPageContent } from "@/components/documentation/DocumentationPageContent";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { useColors } from "@/hooks/useColors";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function DocumentationWebScreen() {
  const colors = useColors();
  const { isDesktop } = useWebLayout();

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <DocumentationPageContent
        isDesktop={isDesktop}
        nativeScrollId={BRAND_SCROLL_NATIVE_ID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0 },
});
