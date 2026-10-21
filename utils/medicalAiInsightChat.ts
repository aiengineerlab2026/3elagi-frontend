import type { MedicalRecord } from "@/domains/medical/types";

export function formatMedicalRecordInsightReply(
  record: MedicalRecord,
  isEn: boolean,
  mode: "created" | "uploaded",
): string {
  const link = `[${record.title}](/medical/${record.id})`;
  const intro =
    mode === "created"
      ? isEn
        ? `Medical record created: ${link}.`
        : `تم إنشاء السجل الطبي: ${link}.`
      : isEn
        ? `I saved this as a medical record: ${link}.`
        : `تم حفظ الصورة كسجل طبي: ${link}.`;

  const lines = [intro, ""];
  const insight = record.aiInsight;
  if (insight?.description?.trim()) {
    lines.push(
      isEn
        ? `**Summary:** ${insight.description.trim()}`
        : `**ملخص:** ${insight.description.trim()}`,
    );
  }
  if (insight?.possible_diseases?.trim()) {
    lines.push(
      isEn
        ? `**Possible conditions:** ${insight.possible_diseases.trim()}`
        : `**حالات محتملة:** ${insight.possible_diseases.trim()}`,
    );
  }
  if (!insight?.description?.trim() && !insight?.possible_diseases?.trim()) {
    lines.push(
      isEn
        ? "AI insight is not available yet. Open the record to generate it."
        : "تحليل الذكاء الاصطناعي غير متاح بعد. افتح السجل لإنشائه.",
    );
  }
  return lines.join("\n");
}
