import { router } from "expo-router";
import { Bot, ChevronRight } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

export function AiAssistantHomeCard() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const isEn = !isRTL;

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/assistant")}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "14" }]}>
        <Bot color={colors.primary} size={22} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isEn ? "AI Medical Assistant" : "المساعد الطبي الذكي"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {isEn
            ? "Ask about your allergies, labs, and prescriptions"
            : "اسأل عن حساسيتك، تحاليلك، وأدويتك"}
        </Text>
      </View>
      <ChevronRight
        color={colors.mutedForeground}
        size={20}
        style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 18 },
});
