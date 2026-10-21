import { Eye, Pencil, Plus, Trash2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { IntakeExamPreview } from "@/components/intake/IntakeExamPreview";
import type { IntakeQuestion, IntakeQuestionType } from "@/domains/intake-exams/types";
import { useColors } from "@/hooks/useColors";

const QUESTION_TYPES: { value: IntakeQuestionType; labelEn: string; labelAr: string }[] = [
  { value: "text", labelEn: "Text", labelAr: "نص" },
  { value: "single_choice", labelEn: "Single choice", labelAr: "اختيار واحد" },
  { value: "multi_choice", labelEn: "Multiple choice", labelAr: "اختيارات متعددة" },
  { value: "image", labelEn: "Image", labelAr: "صورة" },
  { value: "video", labelEn: "Video", labelAr: "فيديو" },
  { value: "audio", labelEn: "Audio", labelAr: "صوت" },
  { value: "guidance", labelEn: "Guidance (info only)", labelAr: "إرشاد (بدون إجابة)" },
];

function newQuestion(type: IntakeQuestionType = "text"): IntakeQuestion {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: "",
    type,
    required: type !== "guidance",
    options:
      type === "single_choice" || type === "multi_choice"
        ? [
            { id: `o-${Date.now()}-1`, text: "" },
            { id: `o-${Date.now()}-2`, text: "" },
          ]
        : [],
  };
}

export interface IntakeExamBuilderFormProps {
  isRTL: boolean;
  initialName?: string;
  initialDescription?: string;
  initialActive?: boolean;
  initialQuestions?: IntakeQuestion[];
  saving?: boolean;
  onSubmit: (payload: {
    name: string;
    description?: string;
    is_active: boolean;
    questions: IntakeQuestion[];
  }) => void;
  onCancel?: () => void;
}

type BuilderMode = "edit" | "preview";

export function IntakeExamBuilderForm({
  isRTL,
  initialName = "",
  initialDescription = "",
  initialActive = true,
  initialQuestions = [newQuestion()],
  saving = false,
  onSubmit,
  onCancel,
}: IntakeExamBuilderFormProps) {
  const colors = useColors();
  const textAlign = isRTL ? "right" : "left";
  const isWeb = Platform.OS === "web";
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isActive, setIsActive] = useState(initialActive);
  const [questions, setQuestions] = useState<IntakeQuestion[]>(
    initialQuestions.length ? initialQuestions : [newQuestion()],
  );
  const [mode, setMode] = useState<BuilderMode>("edit");

  const canSave = useMemo(
    () =>
      name.trim().length > 0 &&
      questions.some((q) => q.text.trim()) &&
      !saving,
    [name, questions, saving],
  );

  const updateQuestion = (id: string, patch: Partial<IntakeQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const next = { ...q, ...patch };
        if (patch.type) {
          if (patch.type === "single_choice" || patch.type === "multi_choice") {
            next.options =
              q.options.length >= 2
                ? q.options
                : [
                    { id: `o-${Date.now()}-1`, text: "" },
                    { id: `o-${Date.now()}-2`, text: "" },
                  ];
          } else {
            next.options = [];
          }
          next.required = patch.type !== "guidance";
        }
        return next;
      }),
    );
  };

  const submit = () => {
    const cleaned = questions
      .map((q) => ({
        ...q,
        text: q.text.trim(),
        options: q.options
          .map((o) => ({ ...o, text: o.text.trim() }))
          .filter((o) => o.text),
      }))
      .filter((q) => q.text);
    if (!name.trim() || cleaned.length === 0) {
      Alert.alert(
        isRTL ? "بيانات ناقصة" : "Missing data",
        isRTL ? "أضف اسمًا وسؤالًا واحدًا على الأقل." : "Add a name and at least one question.",
      );
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      is_active: isActive,
      questions: cleaned,
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.modeRow, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setMode("edit")}
          style={[
            styles.modeBtn,
            {
              backgroundColor: mode === "edit" ? `${colors.primary}18` : "transparent",
              borderColor: mode === "edit" ? colors.primary : colors.border,
            },
          ]}
        >
          <Pencil size={14} color={mode === "edit" ? colors.primary : colors.mutedForeground} />
          <Text
            style={{
              color: mode === "edit" ? colors.primary : colors.foreground,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            {isRTL ? "تعديل" : "Edit"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("preview")}
          style={[
            styles.modeBtn,
            {
              backgroundColor: mode === "preview" ? `${colors.primary}18` : "transparent",
              borderColor: mode === "preview" ? colors.primary : colors.border,
            },
          ]}
        >
          <Eye size={14} color={mode === "preview" ? colors.primary : colors.mutedForeground} />
          <Text
            style={{
              color: mode === "preview" ? colors.primary : colors.foreground,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            {isRTL ? "معاينة المريض" : "Patient preview"}
          </Text>
        </Pressable>
      </View>

      {mode === "preview" ? (
        <View style={styles.previewWrap}>
          <IntakeExamPreview
            isRTL={isRTL}
            name={name}
            description={description}
            questions={questions}
          />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
        {isRTL ? "اسم الفحص" : "Exam name"}
      </Text>
      <AppTextInput
        value={name}
        onChangeText={setName}
        placeholder={isRTL ? "مثال: متابعة السكر" : "e.g. Diabetes follow-up"}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, textAlign }]}
      />

      <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
        {isRTL ? "الوصف" : "Description"}
      </Text>
      <AppTextInput
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder={isRTL ? "وصف اختياري" : "Optional description"}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          styles.multiline,
          { color: colors.foreground, borderColor: colors.border, textAlign },
        ]}
      />

      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Text style={{ color: colors.foreground, fontWeight: "600" }}>
          {isRTL ? "نشط" : "Active"}
        </Text>
        <Switch value={isActive} onValueChange={setIsActive} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
        {isRTL ? "الأسئلة" : "Questions"}
      </Text>

      {questions.map((q, index) => (
        <View
          key={q.id}
          style={[styles.questionCard, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>
              {isRTL ? `سؤال ${index + 1}` : `Question ${index + 1}`}
            </Text>
            <Pressable
              onPress={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
              disabled={questions.length <= 1}
            >
              <Trash2 size={18} color={questions.length <= 1 ? colors.muted : colors.destructive} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            {QUESTION_TYPES.map((t) => {
              const selected = q.type === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => updateQuestion(q.id, { type: t.value })}
                  style={[
                    styles.typeChip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? `${colors.primary}18` : colors.background,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? colors.primary : colors.foreground, fontSize: 12 }}>
                    {isRTL ? t.labelAr : t.labelEn}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <AppTextInput
            value={q.text}
            onChangeText={(text) => updateQuestion(q.id, { text })}
            placeholder={isRTL ? "نص السؤال" : "Question text"}
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[styles.input, styles.multiline, { color: colors.foreground, borderColor: colors.border, textAlign }]}
          />

          {q.type !== "guidance" ? (
            <View style={[styles.row, { justifyContent: "space-between", marginTop: 8 }]}>
              <Text style={{ color: colors.foreground }}>{isRTL ? "مطلوب" : "Required"}</Text>
              <Switch
                value={q.required}
                onValueChange={(required) => updateQuestion(q.id, { required })}
              />
            </View>
          ) : null}

          {q.type === "single_choice" || q.type === "multi_choice" ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {q.options.map((opt, optIndex) => (
                <View key={opt.id} style={[styles.row, { gap: 8 }]}>
                  <AppTextInput
                    value={opt.text}
                    onChangeText={(text) =>
                      setQuestions((prev) =>
                        prev.map((item) =>
                          item.id !== q.id
                            ? item
                            : {
                                ...item,
                                options: item.options.map((o, i) =>
                                  i === optIndex ? { ...o, text } : o,
                                ),
                              },
                        ),
                      )
                    }
                    placeholder={`${isRTL ? "خيار" : "Option"} ${optIndex + 1}`}
                    placeholderTextColor={colors.mutedForeground}
                    style={[
                      styles.input,
                      { flex: 1, color: colors.foreground, borderColor: colors.border, textAlign },
                    ]}
                  />
                  <Pressable
                    onPress={() =>
                      setQuestions((prev) =>
                        prev.map((item) =>
                          item.id !== q.id
                            ? item
                            : {
                                ...item,
                                options: item.options.filter((_, i) => i !== optIndex),
                              },
                        ),
                      )
                    }
                    disabled={q.options.length <= 2}
                  >
                    <Trash2
                      size={16}
                      color={q.options.length <= 2 ? colors.muted : colors.destructive}
                    />
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={() =>
                  setQuestions((prev) =>
                    prev.map((item) =>
                      item.id !== q.id
                        ? item
                        : {
                            ...item,
                            options: [
                              ...item.options,
                              { id: `o-${Date.now()}`, text: "" },
                            ],
                          },
                    ),
                  )
                }
              >
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  {isRTL ? "+ إضافة خيار" : "+ Add option"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={() => setQuestions((prev) => [...prev, newQuestion()])}
        style={[styles.addBtn, { borderColor: colors.primary }]}
      >
        <Plus size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: "700" }}>
          {isRTL ? "إضافة سؤال" : "Add question"}
        </Text>
      </Pressable>
      </ScrollView>
      )}

      {onCancel ? (
        <Pressable
          onPress={onCancel}
          disabled={saving}
          style={[
            styles.cancelBtn,
            isWeb && styles.actionBtnWeb,
            {
              backgroundColor: saving ? colors.muted : colors.destructive,
              opacity: saving ? 0.7 : 1,
            },
          ]}
        >
          <Text style={styles.cancelBtnText}>{isRTL ? "إلغاء" : "Cancel"}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {mode === "preview" ? (
          <Pressable
            onPress={() => setMode("edit")}
            style={[
              styles.primaryBtn,
              isWeb && styles.actionBtnWeb,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {isRTL ? "العودة للتعديل" : "Back to edit"}
            </Text>
          </Pressable>
        ) : (
        <Pressable
          onPress={submit}
          disabled={!canSave}
          style={[
            styles.primaryBtn,
            isWeb && styles.actionBtnWeb,
            { backgroundColor: canSave ? colors.primary : colors.muted },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              {isRTL ? "حفظ" : "Save"}
            </Text>
          )}
        </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  previewWrap: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  row: { flexDirection: "row", alignItems: "center" },
  questionCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  typeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignSelf: "flex-start",
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: { color: "#fff", fontWeight: "700" },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  actionBtnWeb: {
    width: "20vw",
    alignSelf: "center",
    cursor: "pointer",
  } as ViewStyle,
});
