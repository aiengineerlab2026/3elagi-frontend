import React from "react";
import { StyleSheet, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { DocumentationPageContent } from "@/components/documentation/DocumentationPageContent";
import { useColors } from "@/hooks/useColors";

export default function DocumentationScreen() {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <DocumentationPageContent />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
