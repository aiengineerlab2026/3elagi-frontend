import { Bot } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  isDoctor: boolean;
  disabled?: boolean;
  onSuggestion: (text: string) => void;
}

function suggestions(isDoctor: boolean, isEn: boolean): string[] {
  if (isDoctor) {
    return isEn
      ? [
          "Which patients have I treated?",
          "Summarize my recent diagnoses",
          "What records did I add this month?",
          "Who needs a follow-up?",
        ]
      : [
          "من المرضى الذين عالجتهم؟",
          "لخّص تشخيصاتي الأخيرة",
          "ما السجلات التي أضفتها هذا الشهر؟",
          "من يحتاج متابعة؟",
        ];
  }
  return isEn
    ? [
        "What allergies do I have?",
        "Summarize my lab results",
        "What prescriptions am I on?",
        "Explain my latest diagnosis",
      ]
    : [
        "ما هي حساسيتي؟",
        "لخّص نتائج تحاليلي",
        "ما الأدوية التي أتناولها؟",
        "اشرح آخر تشخيص لي",
      ];
}

export function AssistantEmptyState({ isDoctor, disabled, onSuggestion }: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const isEn = !isRTL;
  const chips = suggestions(isDoctor, isEn);

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: colors.primary + "14" }]}>
        <Bot color={colors.primary} size={32} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {isEn ? "How can 3elagi help you today?" : "كيف يمكن لـ 3elagi مساعدتك اليوم؟"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {isDoctor
          ? isEn
            ? "Ask about patients, diagnoses, and records"
            : "اسأل عن المرضى والتشخيصات والسجلات"
          : isEn
            ? "Ask about your health records and history"
            : "اسأل عن سجلاتك الصحية وتاريخك الطبي"}
      </Text>
      <View style={[styles.chips, isRTL && styles.chipsRtl]}>
        {chips.map((chip) => (
          <Pressable
            key={chip}
            disabled={disabled}
            onPress={() => onSuggestion(chip)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.foreground }]} numberOfLines={2}>
              {chip}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
    minHeight: 360,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  chips: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chipsRtl: {
    flexDirection: "row-reverse",
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  chipText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
