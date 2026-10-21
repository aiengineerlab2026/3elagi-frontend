import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { PublicFaqSection } from "@/components/marketing/PublicFaqSection";
import { BRAND_SCROLL_NATIVE_ID } from "@/components/web/globalWebStyles";
import { useColors } from "@/hooks/useColors";

export default function FaqScreen() {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView
        nativeID={BRAND_SCROLL_NATIVE_ID}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        <PublicFaqSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 40 },
});
