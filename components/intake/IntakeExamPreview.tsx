import { Eye } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { IntakeExamTaker } from "@/components/intake/IntakeExamTaker";
import type { IntakeQuestion } from "@/domains/intake-exams/types";
import { useColors } from "@/hooks/useColors";
import { flexRow } from "@/utils/rtl";

export function cleanPreviewQuestions(questions: IntakeQuestion[]): IntakeQuestion[] {
  return questions
    .map((q) => ({
      ...q,
      text: q.text.trim(),
      options: q.options
        .map((o) => ({ ...o, text: o.text.trim() }))
        .filter((o) => o.text),
    }))
    .filter((q) => q.text);
}

interface Props {
  isRTL: boolean;
  name: string;
  description?: string;
  questions: IntakeQuestion[];
  previewHint?: string;
  emptyHint?: string;
}

export function IntakeExamPreview({
  isRTL,
  name,
  description,
  questions,
  previewHint,
  emptyHint,
}: Props) {
  const colors = useColors();
  const textAlign = isRTL ? "right" : "left";
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const previewQuestions = useMemo(() => cleanPreviewQuestions(questions), [questions]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.banner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary, flexDirection: flexRow(isRTL) }]}>
        <Eye size={16} color={colors.primary} />
        <Text style={[styles.bannerText, { color: colors.primary, textAlign }]}>
          {previewHint ??
            (isRTL
              ? "معاينة — هكذا يرى المريض الفحص. يمكنك تجربة الإجابات دون حفظ."
              : "Patient preview — this is how the exam appears to patients. Try answers without saving.")}
        </Text>
      </View>

      {name.trim() ? (
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>{name.trim()}</Text>
      ) : (
        <Text style={[styles.placeholder, { color: colors.mutedForeground, textAlign }]}>
          {isRTL ? "اسم الفحص" : "Exam name"}
        </Text>
      )}

      {description?.trim() ? (
        <Text style={[styles.description, { color: colors.mutedForeground, textAlign }]}>
          {description.trim()}
        </Text>
      ) : null}

      {previewQuestions.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mutedForeground, textAlign }]}>
          {emptyHint ??
            (isRTL
              ? "أضف سؤالًا واحدًا على الأقل لمعاينة الفحص."
              : "Add at least one question to preview the exam.")}
        </Text>
      ) : (
        <IntakeExamTaker
          isRTL={isRTL}
          questions={previewQuestions}
          answers={answers}
          previewMode
          onChange={setAnswers}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  title: { fontSize: 20, fontWeight: "800" },
  placeholder: { fontSize: 20, fontWeight: "800", fontStyle: "italic" },
  description: { fontSize: 14, lineHeight: 20 },
  empty: { fontSize: 14, marginTop: 8, lineHeight: 20 },
});
