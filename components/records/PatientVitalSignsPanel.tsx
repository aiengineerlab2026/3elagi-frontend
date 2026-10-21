import { Heart } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { EHR } from "@/constants/ehrDesign";
import {
  bloodPressureInputFromVitals,
  formatBloodPressure,
  formatHeartRate,
  formatWeight,
  vitalsToUpdatePayload,
} from "@/domains/vitals/format";
import { usePatientVitals } from "@/hooks/usePatientVitals";
import { useI18n } from "@/hooks/useI18n";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

type Props = {
  patientUserId?: string;
  doctorView?: boolean;
};

export function PatientVitalSignsPanel({ patientUserId, doctorView = false }: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const dateLocale = localeTag(isRTL);
  const empty = "—";

  const { vitals, loading, saving, editable, save } = usePatientVitals({
    patientUserId,
    readOnlyTarget: doctorView,
  });

  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [weight, setWeight] = useState("");

  useEffect(() => {
    setBloodPressure(bloodPressureInputFromVitals(vitals));
    setHeartRate(vitals.heartRateBpm != null ? String(vitals.heartRateBpm) : "");
    setWeight(vitals.weightKg != null ? String(vitals.weightKg) : "");
  }, [vitals]);

  const handleSave = async () => {
    try {
      await save(vitalsToUpdatePayload(bloodPressure, heartRate, weight));
      showSuccessToast(
        isRTL ? "تم الحفظ" : "Saved",
        isRTL ? "تم تحديث العلامات الحيوية" : "Vital signs updated",
      );
    } catch (e) {
      showErrorToast(isRTL ? "خطأ" : "Error", (e as Error).message);
    }
  };

  const metrics = [
    {
      key: "bp",
      label: isRTL ? "ضغط الدم" : "Blood pressure",
      value: formatBloodPressure(vitals, empty),
      hint: editable ? (isRTL ? "مثال: 120/80" : "e.g. 120/80") : undefined,
      input: bloodPressure,
      onChange: setBloodPressure,
      keyboardType: "default" as const,
    },
    {
      key: "hr",
      label: isRTL ? "نبض القلب" : "Heart rate",
      value: formatHeartRate(vitals, empty),
      hint: editable ? (isRTL ? "نبض/دقيقة" : "bpm") : undefined,
      input: heartRate,
      onChange: setHeartRate,
      keyboardType: "number-pad" as const,
    },
    {
      key: "wt",
      label: isRTL ? "الوزن" : "Weight",
      value: formatWeight(vitals, empty),
      hint: editable ? (isRTL ? "كجم" : "kg") : undefined,
      input: weight,
      onChange: setWeight,
      keyboardType: "decimal-pad" as const,
    },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { borderColor: EHR.border, backgroundColor: EHR.bg.card }]}>
        <View style={[styles.head, { flexDirection: dir }]}>
          <Heart size={20} color={EHR.brand} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.title, { color: EHR.text.primary, textAlign }]}>
              {isRTL ? "العلامات الحيوية الأخيرة" : "Recent vital signs"}
            </Text>
            <Text style={[styles.subtitle, { color: EHR.text.secondary, textAlign }]}>
              {editable
                ? isRTL
                  ? "حدّث قراءاتك الأخيرة — يراها طبيبك في سجلك."
                  : "Keep your latest readings up to date — your doctor can see them in your record."
                : isRTL
                  ? "آخر قراءات سجّلها المريض."
                  : "Latest readings reported by the patient."}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={EHR.brand} style={{ marginVertical: 24 }} />
        ) : (
          <View style={[styles.metricsRow, { flexDirection: dir }]}>
            {metrics.map((metric) => (
              <View
                key={metric.key}
                style={[styles.metric, { borderColor: EHR.border, backgroundColor: EHR.bg.app }]}
              >
                <Text style={[styles.metricLabel, { color: EHR.text.secondary, textAlign }]}>
                  {metric.label}
                </Text>
                {editable ? (
                  <AppTextInput
                    value={metric.input}
                    onChangeText={metric.onChange}
                    placeholder={metric.hint}
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType={metric.keyboardType}
                    style={[
                      styles.input,
                      {
                        color: colors.foreground,
                        borderColor: EHR.border,
                        backgroundColor: colors.card,
                        textAlign,
                      },
                    ]}
                  />
                ) : (
                  <Text style={[styles.metricValue, { color: EHR.text.primary, textAlign }]}>
                    {metric.value}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {vitals.updatedAt ? (
          <Text style={[styles.updated, { color: EHR.text.secondary, textAlign }]}>
            {isRTL ? "آخر تحديث: " : "Last updated: "}
            {new Date(vitals.updatedAt).toLocaleString(dateLocale, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>
        ) : null}

        {editable ? (
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving || loading}
            style={[
              styles.saveBtn,
              {
                backgroundColor: EHR.brand,
                opacity: saving || loading ? 0.7 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{isRTL ? "حفظ العلامات" : "Save vital signs"}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: EHR.workspaceGap, flexGrow: 1 },
  card: {
    borderWidth: 1,
    borderRadius: EHR.radius.card,
    padding: EHR.documentCardPadding,
    gap: 16,
  },
  head: { alignItems: "flex-start", gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  metricsRow: { gap: 10, flexWrap: "wrap" },
  metric: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: EHR.radius.control,
    padding: 12,
    gap: 8,
  },
  metricLabel: { fontSize: 12, fontWeight: "600" },
  metricValue: { fontSize: 18, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderRadius: EHR.radius.control,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 44,
  },
  updated: { fontSize: 12 },
  saveBtn: {
    minHeight: 46,
    borderRadius: EHR.radius.control,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    minWidth: 160,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
