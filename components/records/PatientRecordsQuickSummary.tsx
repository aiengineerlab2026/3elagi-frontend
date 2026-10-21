import { Activity, Heart, Pill, Scale } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PatientVitalSignsSummaryCard } from "@/components/records/PatientVitalSignsSummaryCard";
import { EHR } from "@/constants/ehrDesign";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import { usePatientVitals } from "@/hooks/usePatientVitals";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

type Props = {
  patientLabel?: string;
  grouped: Partial<Record<MedicalCategory, MedicalRecord[]>>;
  patientUserId?: string;
  doctorView?: boolean;
};

export function PatientRecordsQuickSummary({
  patientLabel,
  grouped,
  patientUserId,
  doctorView = false,
}: Props) {
  const { isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const dateLocale = localeTag(isRTL);
  const { vitals, loading: vitalsLoading } = usePatientVitals({
    patientUserId,
    readOnlyTarget: doctorView,
  });

  const latestDiagnosis = React.useMemo(() => {
    const items = grouped.diagnosis ?? [];
    return [...items].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
  }, [grouped.diagnosis]);

  const activeMedications = React.useMemo(() => {
    const rx = grouped.prescription ?? [];
    return rx
      .flatMap((r) => r.medications ?? [])
      .slice(0, 4)
      .map((m) => m.medication_name)
      .filter(Boolean);
  }, [grouped.prescription]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: EHR.text.primary, textAlign }]}>
        {patientLabel
          ? isRTL
            ? `ملخص ${patientLabel}`
            : `${patientLabel} — Quick Summary`
          : isRTL
            ? "ملخص المريض"
            : "Patient Quick Summary"}
      </Text>
      <Text style={[styles.lead, { color: EHR.text.secondary, textAlign }]}>
        {isRTL
          ? "اختر سجلاً من القائمة لعرض التفاصيل، أو راجع المؤشرات أدناه."
          : "Select a record from the list to preview details, or review the overview below."}
      </Text>

      <PatientVitalSignsSummaryCard vitals={vitals} loading={vitalsLoading} />

      <View style={[styles.card, { borderColor: EHR.border }]}>
        <View style={[styles.cardHead, { flexDirection: dir }]}>
          <Pill size={18} color="#7c3aed" />
          <Text style={[styles.cardTitle, { color: EHR.text.primary, textAlign }]}>
            {isRTL ? "الأدوية النشطة" : "Active medications"}
          </Text>
        </View>
        {activeMedications.length ? (
          activeMedications.map((name) => (
            <Text key={name} style={[styles.listItem, { color: EHR.text.primary, textAlign }]}>
              • {name}
            </Text>
          ))
        ) : (
          <Text style={[styles.emptyLine, { color: EHR.text.secondary, textAlign }]}>
            {isRTL ? "لا توجد روشتات مسجلة" : "No prescriptions on file"}
          </Text>
        )}
      </View>

      <View style={[styles.card, { borderColor: EHR.border }]}>
        <View style={[styles.cardHead, { flexDirection: dir }]}>
          <Activity size={18} color="#ef4444" />
          <Text style={[styles.cardTitle, { color: EHR.text.primary, textAlign }]}>
            {isRTL ? "آخر تشخيص" : "Latest diagnosis"}
          </Text>
        </View>
        {latestDiagnosis ? (
          <>
            <Text style={[styles.diagnosisTitle, { color: EHR.text.primary, textAlign }]}>
              {latestDiagnosis.title}
            </Text>
            <Text style={[styles.diagnosisDate, { color: EHR.text.secondary, textAlign }]}>
              {new Date(latestDiagnosis.date).toLocaleDateString(dateLocale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </>
        ) : (
          <Text style={[styles.emptyLine, { color: EHR.text.secondary, textAlign }]}>
            {isRTL ? "لا توجد تشخيصات بعد" : "No diagnoses recorded yet"}
          </Text>
        )}
      </View>

      <View style={[styles.card, { borderColor: EHR.border }]}>
        <View style={[styles.cardHead, { flexDirection: dir }]}>
          <Scale size={18} color={EHR.text.secondary} />
          <Text style={[styles.cardTitle, { color: EHR.text.primary, textAlign }]}>
            {isRTL ? "إحصائيات السجل" : "Record counts"}
          </Text>
        </View>
        <View style={[styles.countsRow, { flexDirection: dir }]}>
          {(
            [
              ["diagnosis", isRTL ? "تشخيصات" : "Diagnoses"],
              ["lab", isRTL ? "مختبر" : "Labs"],
              ["xray", isRTL ? "أشعة" : "Scans"],
              ["prescription", isRTL ? "روشتات" : "Rx"],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={[styles.countChip, { backgroundColor: EHR.brandSoft }]}>
              <Text style={[styles.countNum, { color: EHR.brandDark }]}>
                {(grouped[key] ?? []).length}
              </Text>
              <Text style={[styles.countLabel, { color: EHR.text.secondary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 24, gap: 16 },
  heading: { fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  lead: { fontSize: 14, lineHeight: 21, marginBottom: 4 },
  card: {
    backgroundColor: EHR.bg.card,
    borderWidth: 1,
    borderRadius: EHR.radius.card,
    padding: 16,
    gap: 10,
  },
  cardHead: { alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  listItem: { fontSize: 14, lineHeight: 22 },
  emptyLine: { fontSize: 14, lineHeight: 20 },
  diagnosisTitle: { fontSize: 15, fontWeight: "600" },
  diagnosisDate: { fontSize: 13 },
  countsRow: { gap: 8, flexWrap: "wrap" },
  countChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: EHR.radius.control,
    alignItems: "center",
    minWidth: 72,
    gap: 2,
  },
  countNum: { fontSize: 16, fontWeight: "800" },
  countLabel: { fontSize: 11, fontWeight: "500" },
});
