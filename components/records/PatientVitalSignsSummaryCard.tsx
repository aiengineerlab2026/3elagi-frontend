import { Heart } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { EHR } from "@/constants/ehrDesign";
import {
  formatBloodPressure,
  formatHeartRate,
  formatWeight,
} from "@/domains/vitals/format";
import type { PatientRecentVitals } from "@/domains/vitals/types";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

type Props = {
  vitals: PatientRecentVitals;
  loading?: boolean;
};

export function PatientVitalSignsSummaryCard({ vitals, loading = false }: Props) {
  const { isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const empty = "—";

  return (
    <View style={[styles.card, { borderColor: EHR.border }]}>
      <View style={[styles.cardHead, { flexDirection: dir }]}>
        <Heart size={18} color={EHR.brand} />
        <Text style={[styles.cardTitle, { color: EHR.text.primary, textAlign }]}>
          {isRTL ? "العلامات الحيوية الأخيرة" : "Recent vital signs"}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color={EHR.brand} />
      ) : (
        <View style={[styles.metricsRow, { flexDirection: dir }]}>
          {[
            { label: isRTL ? "ضغط الدم" : "Blood pressure", value: formatBloodPressure(vitals, empty) },
            { label: isRTL ? "نبض القلب" : "Heart rate", value: formatHeartRate(vitals, empty) },
            { label: isRTL ? "الوزن" : "Weight", value: formatWeight(vitals, empty) },
          ].map((m) => (
            <View key={m.label} style={[styles.metric, { borderColor: EHR.border }]}>
              <Text style={[styles.metricLabel, { color: EHR.text.secondary, textAlign }]}>
                {m.label}
              </Text>
              <Text style={[styles.metricValue, { color: EHR.text.primary, textAlign }]}>
                {m.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: EHR.bg.card,
    borderWidth: 1,
    borderRadius: EHR.radius.card,
    padding: 16,
    gap: 10,
  },
  cardHead: { alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  metricsRow: { gap: 8, flexWrap: "wrap" },
  metric: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1,
    borderRadius: EHR.radius.control,
    padding: 10,
    gap: 4,
  },
  metricLabel: { fontSize: 11, fontWeight: "500" },
  metricValue: { fontSize: 15, fontWeight: "700" },
});
