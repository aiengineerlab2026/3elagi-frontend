import { Plus } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { IntakeExamBuilderForm } from "@/components/intake/IntakeExamBuilderForm";
import {
  assignIntakeExam,
  createIntakeTest,
  fetchIntakeTests,
} from "@/domains/intake-exams/api";
import type { IntakeExamRecurrence, IntakeTestTemplate } from "@/domains/intake-exams/types";
import { useColors } from "@/hooks/useColors";

const RECURRENCE_OPTIONS: { value: IntakeExamRecurrence; labelEn: string; labelAr: string }[] = [
  { value: "none", labelEn: "Once", labelAr: "مرة واحدة" },
  { value: "daily", labelEn: "Daily", labelAr: "يومي" },
  { value: "weekly", labelEn: "Weekly", labelAr: "أسبوعي" },
  { value: "monthly", labelEn: "Monthly", labelAr: "شهري" },
  { value: "yearly", labelEn: "Yearly", labelAr: "سنوي" },
];

function defaultDeadlineDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface Props {
  visible: boolean;
  isRTL: boolean;
  patientUserId: string;
  accessToken: string;
  saving?: boolean;
  onClose: () => void;
  onAssigned: (instance: Awaited<ReturnType<typeof assignIntakeExam>>) => void;
}

type Step = "assign" | "build";

export function AssignIntakeExamDialog({
  visible,
  isRTL,
  patientUserId,
  accessToken,
  saving = false,
  onClose,
  onAssigned,
}: Props) {
  const colors = useColors();
  const textAlign = isRTL ? "right" : "left";
  const [step, setStep] = useState<Step>("assign");
  const [tests, setTests] = useState<IntakeTestTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deadlineDate, setDeadlineDate] = useState(defaultDeadlineDate);
  const [deadlineTime, setDeadlineTime] = useState("09:00");
  const [recurrence, setRecurrence] = useState<IntakeExamRecurrence>("none");
  const [interval, setInterval] = useState("1");
  const [assigning, setAssigning] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible || !accessToken) return;
    setStep("assign");
    setDeadlineDate(defaultDeadlineDate());
    setDeadlineTime("09:00");
    setRecurrence("none");
    setInterval("1");
    setLoading(true);
    void fetchIntakeTests(accessToken)
      .then((rows) => {
        const active = rows.filter((t) => t.is_active);
        setTests(active);
        setSelectedId(active[0]?.id ?? null);
        // Empty catalog → open builder on the same screen immediately.
        setStep(active.length === 0 ? "build" : "assign");
      })
      .catch((e) => Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message))
      .finally(() => setLoading(false));
  }, [visible, accessToken, isRTL]);

  const selected = useMemo(
    () => tests.find((t) => t.id === selectedId) ?? null,
    [tests, selectedId],
  );

  const busy = assigning || saving || creating;

  const assign = async () => {
    if (!selectedId || !deadlineDate.trim()) {
      Alert.alert(
        isRTL ? "بيانات ناقصة" : "Missing data",
        isRTL
          ? "اختر فحصًا وأدخل الموعد النهائي."
          : "Select an exam and enter a deadline.",
      );
      return;
    }
    if (!recurrence) {
      Alert.alert(
        isRTL ? "بيانات ناقصة" : "Missing data",
        isRTL
          ? "حدد عدد مرات تكرار الفحص."
          : "Choose how often the exam should happen.",
      );
      return;
    }
    const deadlineAt = new Date(`${deadlineDate.trim()}T${deadlineTime || "09:00"}:00`);
    if (Number.isNaN(deadlineAt.getTime())) {
      Alert.alert(isRTL ? "تاريخ غير صالح" : "Invalid date", isRTL ? "تحقق من التاريخ." : "Check the date.");
      return;
    }
    setAssigning(true);
    try {
      const instance = await assignIntakeExam(
        {
          patient_user_id: patientUserId,
          intake_test_id: selectedId,
          deadline_at: deadlineAt.toISOString(),
          recurrence_type: recurrence,
          recurrence_interval: Math.max(1, Number.parseInt(interval, 10) || 1),
        },
        accessToken,
      );
      onAssigned(instance);
      onClose();
    } catch (e) {
      Alert.alert(isRTL ? "فشل الإرسال" : "Assign failed", (e as Error).message);
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateExam = async (payload: {
    name: string;
    description?: string;
    is_active: boolean;
    questions: Parameters<typeof createIntakeTest>[0]["questions"];
  }) => {
    setCreating(true);
    try {
      const created = await createIntakeTest(payload, accessToken);
      setTests((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      setSelectedId(created.id);
      setStep("assign");
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const isWeb = Platform.OS === "web";
  const frequencyHint =
    recurrence === "weekly"
      ? isRTL
        ? "سيُطلب من المريض إعادة الفحص كل أسبوع."
        : "The patient will be asked to repeat this exam every week."
      : recurrence === "monthly"
        ? isRTL
          ? "سيُطلب من المريض إعادة الفحص كل شهر."
          : "The patient will be asked to repeat this exam every month."
        : recurrence === "daily"
          ? isRTL
            ? "سيُطلب من المريض إعادة الفحص يوميًا."
            : "The patient will be asked to repeat this exam every day."
          : recurrence === "yearly"
            ? isRTL
              ? "سيُطلب من المريض إعادة الفحص كل سنة."
              : "The patient will be asked to repeat this exam every year."
            : isRTL
              ? "فحص لمرة واحدة فقط."
              : "One-time exam only.";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} disabled={busy} />
        <View
          style={[
            styles.dialog,
            step === "build" && styles.dialogBuild,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
            {step === "build"
              ? isRTL
                ? "إنشاء فحص متابعة"
                : "Create follow-up exam"
              : isRTL
                ? "إضافة فحص متابعة"
                : "Assign follow-up exam"}
          </Text>
          {step === "build" ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
              {isRTL
                ? "أنشئ الفحص هنا، ثم أرسله للمريض مباشرة."
                : "Build the exam here, then send it to the patient on the next step."}
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : step === "build" ? (
            <View style={styles.builderHost}>
              <IntakeExamBuilderForm
                isRTL={isRTL}
                saving={creating}
                onCancel={() => {
                  if (tests.length === 0) {
                    onClose();
                    return;
                  }
                  setStep("assign");
                }}
                onSubmit={(payload) => void handleCreateExam(payload)}
              />
            </View>
          ) : (
            <>
              <ScrollView
                style={{ maxHeight: isWeb ? 520 : 460 }}
                keyboardShouldPersistTaps="handled"
              >
                <Pressable
                  onPress={() => setStep("build")}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.createBtn,
                    {
                      flexDirection: isRTL ? "row-reverse" : "row",
                      borderColor: colors.primary,
                      backgroundColor: pressed
                        ? `${colors.primary}14`
                        : `${colors.primary}0A`,
                    },
                  ]}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "800", flex: 1, textAlign }}>
                    {isRTL ? "إنشاء فحص جديد" : "Create new exam"}
                  </Text>
                </Pressable>
                <Text
                  style={[
                    styles.hint,
                    { color: colors.mutedForeground, textAlign, marginBottom: 10 },
                  ]}
                >
                  {isRTL
                    ? "إذا لم يناسبك أي فحص موجود، أنشئ واحدًا ثم أرسله من نفس الشاشة."
                    : "If none of the existing exams fit, create one and send it from this same screen."}
                </Text>

                {tests.length === 0 ? (
                  <Text style={{ color: colors.mutedForeground, textAlign, marginBottom: 8 }}>
                    {isRTL
                      ? "لا توجد فحوصات بعد. أنشئ فحصًا أولاً."
                      : "No exams yet. Create one first."}
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                      {isRTL ? "اختر الفحص *" : "Select exam *"}
                    </Text>
                    {tests.map((test) => {
                      const active = test.id === selectedId;
                      return (
                        <Pressable
                          key={test.id}
                          onPress={() => setSelectedId(test.id)}
                          style={[
                            styles.testRow,
                            {
                              borderColor: active ? colors.primary : colors.border,
                              backgroundColor: active
                                ? `${colors.primary}12`
                                : colors.background,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: colors.foreground,
                              fontWeight: "700",
                              textAlign,
                            }}
                          >
                            {test.name}
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 12,
                              textAlign,
                            }}
                          >
                            {(test.questions ?? []).length}{" "}
                            {isRTL ? "أسئلة" : "questions"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </>
                )}

                <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                  {isRTL ? "الموعد النهائي *" : "Deadline *"}
                </Text>
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
                  {isRTL
                    ? "متى يجب أن يُكمل المريض هذا الفحص؟"
                    : "When should the patient complete this exam?"}
                </Text>
                <View style={[styles.row, { gap: 8 }]}>
                  <AppTextInput
                    value={deadlineDate}
                    onChangeText={setDeadlineDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.mutedForeground}
                    {...(isWeb ? ({ type: "date" } as object) : {})}
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        color: colors.foreground,
                        borderColor: !deadlineDate.trim()
                          ? colors.destructive
                          : colors.border,
                        textAlign,
                      },
                    ]}
                  />
                  <AppTextInput
                    value={deadlineTime}
                    onChangeText={setDeadlineTime}
                    placeholder="HH:mm"
                    placeholderTextColor={colors.mutedForeground}
                    {...(isWeb ? ({ type: "time" } as object) : {})}
                    style={[
                      styles.input,
                      {
                        width: 110,
                        color: colors.foreground,
                        borderColor: colors.border,
                        textAlign,
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                  {isRTL ? "كم مرة يُعاد الفحص؟ *" : "How often should it happen? *"}
                </Text>
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
                  {isRTL
                    ? "مرة واحدة، أسبوعيًا، شهريًا، أو أكثر."
                    : "Once, weekly, monthly, or another cadence."}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {RECURRENCE_OPTIONS.map((opt) => {
                    const active = recurrence === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setRecurrence(opt.value)}
                        style={[
                          styles.chip,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active
                              ? `${colors.primary}18`
                              : colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? colors.primary : colors.foreground,
                            fontSize: 12,
                            fontWeight: active ? "800" : "600",
                          }}
                        >
                          {isRTL ? opt.labelAr : opt.labelEn}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text
                  style={[
                    styles.hint,
                    { color: colors.primary, textAlign, marginTop: 6 },
                  ]}
                >
                  {frequencyHint}
                </Text>

                {recurrence !== "none" ? (
                  <>
                    <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                      {isRTL ? "كل (عدد)" : "Every (count)"}
                    </Text>
                    <AppTextInput
                      value={interval}
                      onChangeText={setInterval}
                      keyboardType="number-pad"
                      style={[
                        styles.input,
                        {
                          color: colors.foreground,
                          borderColor: colors.border,
                          textAlign,
                        },
                      ]}
                    />
                  </>
                ) : null}

                {selected?.description ? (
                  <Text
                    style={{ color: colors.mutedForeground, marginTop: 8, textAlign }}
                  >
                    {selected.description}
                  </Text>
                ) : null}
              </ScrollView>

              <View style={[styles.actions, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={onClose}
                  disabled={busy}
                  style={[
                    styles.cancelBtn,
                    isWeb && styles.actionBtnWeb,
                    {
                      backgroundColor: busy ? colors.muted : colors.destructive,
                      opacity: busy ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={styles.cancelBtnText}>{isRTL ? "إلغاء" : "Cancel"}</Text>
                </Pressable>

                <View style={styles.footer}>
                  <Pressable
                    onPress={() => void assign()}
                    disabled={busy || loading || !selectedId}
                    style={[
                      styles.primaryBtn,
                      isWeb && styles.actionBtnWeb,
                      {
                        backgroundColor:
                          busy || !selectedId ? colors.muted : colors.primary,
                      },
                    ]}
                  >
                    {assigning ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        {isRTL ? "إرسال للمريض" : "Send to patient"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  dialog: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    zIndex: 1,
    gap: 12,
  },
  dialogBuild: {
    maxWidth: 640,
    minHeight: Platform.OS === "web" ? 560 : 520,
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, fontWeight: "500", marginTop: -4 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 10 },
  hint: { fontSize: 12, fontWeight: "500", marginBottom: 6, marginTop: 2 },
  createBtn: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: "dashed",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  testRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  footer: { paddingTop: 4 },
  cancelBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  cancelBtnText: { color: "#fff", fontWeight: "700" },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingTop: 12,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  actionBtnWeb: {
    width: "20vw",
    alignSelf: "center",
    cursor: "pointer",
  } as ViewStyle,
  builderHost: {
    flexGrow: 1,
    minHeight: 360,
    maxHeight: Platform.OS === "web" ? 620 : 520,
  },
});
