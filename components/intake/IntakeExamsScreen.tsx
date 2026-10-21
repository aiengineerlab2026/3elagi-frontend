import { usePathname, useRouter } from "expo-router";
import { ClipboardList, Plus } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { canNavigateBack } from "@/utils/appNavigation";
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
} from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { IntakeExamBuilderForm } from "@/components/intake/IntakeExamBuilderForm";
import { IntakeExamPreview } from "@/components/intake/IntakeExamPreview";
import { useAuthStore } from "@/domains/auth/store";
import {
  createIntakeTest,
  deleteIntakeTest,
  fetchIntakeTests,
  updateIntakeTest,
} from "@/domains/intake-exams/api";
import type { IntakeQuestion, IntakeTestTemplate } from "@/domains/intake-exams/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

type IntakeExamsScreenProps = {
  showBack?: boolean;
};

export function IntakeExamsScreen({ showBack = false }: IntakeExamsScreenProps) {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const router = useRouter();
  usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const textAlign = isRTL ? "right" : "left";
  const canGo = canNavigateBack(router);

  const [tests, setTests] = useState<IntakeTestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTest, setPreviewTest] = useState<IntakeTestTemplate | null>(null);
  const [editing, setEditing] = useState<IntakeTestTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      setTests(await fetchIntakeTests(accessToken));
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isRTL]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (test: IntakeTestTemplate) => {
    setEditing(test);
    setEditorOpen(true);
  };

  const openPreview = (test: IntakeTestTemplate) => {
    setPreviewTest(test);
    setPreviewOpen(true);
  };

  const handleSave = async (payload: {
    name: string;
    description?: string;
    is_active: boolean;
    questions: IntakeQuestion[];
  }) => {
    if (!accessToken) return;
    setSaving(true);
    try {
      if (editing) {
        await updateIntakeTest(editing.id, payload, accessToken);
      } else {
        await createIntakeTest(payload, accessToken);
      }
      setEditorOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (test: IntakeTestTemplate) => {
    Alert.alert(
      isRTL ? "حذف الفحص" : "Delete exam",
      isRTL ? `حذف "${test.name}"؟` : `Delete "${test.name}"?`,
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: isRTL ? "حذف" : "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              if (!accessToken) return;
              try {
                await deleteIntakeTest(test.id, accessToken);
                await load();
              } catch (e) {
                Alert.alert(isRTL ? "فشل الحذف" : "Delete failed", (e as Error).message);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <View style={[styles.headerRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {showBack && canGo ? (
          <AppBackButton color={colors.foreground} size={20} style={styles.backBtn} />
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {t.intakeExams.title}
        </Text>
        <Pressable onPress={openCreate} style={[styles.addFab, { backgroundColor: colors.primary }]}>
          <Plus size={18} color="#fff" />
        </Pressable>
      </View>

      <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
        {t.intakeExams.subtitle}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : tests.length === 0 ? (
        <View style={styles.empty}>
          <ClipboardList size={40} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 12 }}>
            {t.intakeExams.emptyHint}
          </Text>
          <Pressable
            onPress={openCreate}
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>{t.intakeExams.createExam}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {tests.map((test) => (
            <View
              key={test.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800", textAlign }}>
                {test.name}
              </Text>
              {test.description ? (
                <Text style={{ color: colors.mutedForeground, textAlign, marginTop: 4 }}>
                  {test.description}
                </Text>
              ) : null}
              <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6, textAlign }}>
                {(test.questions ?? []).length} {t.intakeExams.questionsLabel} ·{" "}
                {test.is_active ? t.intakeExams.active : t.intakeExams.inactive}
              </Text>
              <View style={[styles.cardActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Pressable onPress={() => openPreview(test)}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {t.intakeExams.preview}
                  </Text>
                </Pressable>
                <Pressable onPress={() => openEdit(test)}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {t.intakeExams.edit}
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(test)}>
                  <Text style={{ color: colors.destructive, fontWeight: "700" }}>
                    {t.intakeExams.delete}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={previewOpen} animationType="slide" onRequestClose={() => setPreviewOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
              {t.intakeExams.patientPreview}
            </Text>
            <Pressable onPress={() => setPreviewOpen(false)}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {t.intakeExams.close}
              </Text>
            </Pressable>
          </View>
          {previewTest ? (
            <IntakeExamPreview
              isRTL={isRTL}
              name={previewTest.name}
              description={previewTest.description ?? undefined}
              questions={previewTest.questions ?? []}
              previewHint={t.intakeExams.previewHint}
              emptyHint={t.intakeExams.previewEmpty}
            />
          ) : null}
        </View>
      </Modal>

      <Modal visible={editorOpen} animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>
              {editing ? t.intakeExams.editExam : t.intakeExams.newExam}
            </Text>
            <Pressable onPress={() => !saving && setEditorOpen(false)}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {t.intakeExams.close}
              </Text>
            </Pressable>
          </View>
          <IntakeExamBuilderForm
            isRTL={isRTL}
            initialName={editing?.name ?? ""}
            initialDescription={editing?.description ?? ""}
            initialActive={editing?.is_active ?? true}
            initialQuestions={editing?.questions ?? undefined}
            saving={saving}
            onSubmit={(payload) => void handleSave(payload)}
            onCancel={() => setEditorOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: { width: 32, padding: 6 },
  title: { flex: 1, fontSize: 18, fontWeight: "800" },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 20,
  },
  addFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  createBtn: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  cardActions: { gap: 16, marginTop: 12 },
  modalRoot: { flex: 1, paddingTop: Platform.OS === "ios" ? 48 : 16 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
});
