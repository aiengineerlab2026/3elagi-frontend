import { Sparkles } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { MedicalAiInsight, MedicalRecord } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  record: MedicalRecord;
  generating?: boolean;
  onGenerate?: () => void;
}

function hasInsight(insight?: MedicalAiInsight | null): boolean {
  return Boolean(
    insight?.description?.trim() || insight?.possible_diseases?.trim(),
  );
}

export function MedicalRecordAiInsightSection({
  record,
  generating = false,
  onGenerate,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const isEn = !isRTL;
  const insight = record.aiInsight;
  const showGenerate =
    !hasInsight(insight) &&
    onGenerate &&
    record.category !== "intake";

  if (!hasInsight(insight) && !showGenerate) return null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Sparkles size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isEn ? "AI insight" : "تحليل الذكاء الاصطناعي"}
        </Text>
      </View>

      {hasInsight(insight) ? (
        <>
          {insight?.description?.trim() ? (
            <Text style={[styles.body, { color: colors.foreground }]}>
              {insight.description}
            </Text>
          ) : null}
          {insight?.possible_diseases?.trim() ? (
            <Text style={[styles.secondary, { color: colors.mutedForeground }]}>
              {isEn ? "Possible conditions: " : "حالات محتملة: "}
              {insight.possible_diseases}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
          {isEn
            ? "No AI insight yet for this record."
            : "لا يوجد تحليل ذكاء اصطناعي لهذا السجل بعد."}
        </Text>
      )}

      {showGenerate ? (
        <Pressable
          onPress={onGenerate}
          disabled={generating}
          style={[
            styles.btn,
            {
              backgroundColor: colors.primary,
              opacity: generating ? 0.6 : 1,
            },
          ]}
        >
          {generating ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
              {isEn ? "Generate AI insight" : "إنشاء تحليل ذكي"}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22 },
  secondary: { fontSize: 14, lineHeight: 20 },
  placeholder: { fontSize: 14, lineHeight: 20 },
  btn: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnText: { fontSize: 14, fontWeight: "600" },
});
