import { Beaker, ScanLine, Sparkles, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import {
  createMedicalDocumentRequest,
  draftMedicalDocumentRequestDescription,
  type MedicalDocumentRequestType,
} from "@/domains/medical/api";
import { useApiLang } from "@/hooks/useApiLang";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { showAppAlert } from "@/utils/appAlert";
import { showSuccessToast } from "@/utils/toast";
import { flexRow } from "@/utils/rtl";

interface Props {
  visible: boolean;
  patientUserId: string;
  accessToken: string;
  initialType?: MedicalDocumentRequestType;
  onClose: () => void;
  onCreated?: () => void;
}

export function DoctorMedicalRequestDialog({
  visible,
  patientUserId,
  accessToken,
  initialType = "lab",
  onClose,
  onCreated,
}: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const apiLang = useApiLang();
  const dir = flexRow(isRTL);
  const [type, setType] = useState<MedicalDocumentRequestType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType(initialType);
    setTitle("");
    setDescription("");
    setDrafting(false);
    setSaving(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const fillWithAi = async () => {
    if (!title.trim() || drafting || saving) return;
    setDrafting(true);
    try {
      const result = await draftMedicalDocumentRequestDescription(
        {
          patient_user_id: patientUserId,
          type,
          title: title.trim(),
          lang: apiLang,
        },
        accessToken,
      );
      setDescription(result.description);
    } catch (err) {
      showAppAlert(isRTL ? "فشل الذكاء" : "AI failed", (err as Error).message);
    } finally {
      setDrafting(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await createMedicalDocumentRequest(
        {
          patient_user_id: patientUserId,
          type,
          title: title.trim(),
          description: description.trim() || undefined,
        },
        accessToken,
      );
      showSuccessToast(isRTL ? "تم إرسال الطلب" : "Request sent");
      onCreated?.();
      close();
    } catch (err) {
      showAppAlert(isRTL ? "فشل الإرسال" : "Request failed", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.header, { flexDirection: dir }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t.records.requestFromPatient}
            </Text>
            <Pressable onPress={close} hitSlop={10}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={[styles.typeRow, { flexDirection: dir }]}>
            {(
              [
                { key: "lab" as const, label: t.records.requestLab, Icon: Beaker },
                { key: "xray" as const, label: t.records.requestXray, Icon: ScanLine },
              ] as const
            ).map(({ key, label, Icon }) => {
              const active = type === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setType(key)}
                  style={[
                    styles.typeChip,
                    {
                      flexDirection: dir,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}14` : colors.muted,
                    },
                  ]}
                >
                  <Icon size={16} color={active ? colors.primary : colors.mutedForeground} />
                  <Text
                    style={{
                      color: active ? colors.primary : colors.foreground,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t.records.requestTitle}
          </Text>
          <AppTextInput
            value={title}
            onChangeText={setTitle}
            placeholder={isRTL ? "مثال: صورة دم كاملة" : "e.g. Complete blood count"}
            style={[
              styles.input,
              { color: colors.foreground, backgroundColor: colors.muted },
            ]}
            editable={!saving && !drafting}
          />

          <Pressable
            onPress={() => void fillWithAi()}
            disabled={!title.trim() || drafting || saving}
            style={[
              styles.aiBtn,
              {
                flexDirection: dir,
                borderColor: colors.primary,
                opacity: !title.trim() || drafting || saving ? 0.55 : 1,
              },
            ]}
          >
            {drafting ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Sparkles size={16} color={colors.primary} />
            )}
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
              {t.records.fillWithAi}
            </Text>
          </Pressable>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t.records.requestDescription}
          </Text>
          <AppTextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={isRTL ? "حتى 5 نقاط…" : "Up to 5 short statements…"}
            style={[
              styles.input,
              styles.notes,
              { color: colors.foreground, backgroundColor: colors.muted },
            ]}
            editable={!saving && !drafting}
          />

          <Pressable
            onPress={() => void submit()}
            disabled={!title.trim() || saving}
            style={[
              styles.submit,
              {
                backgroundColor: colors.primary,
                opacity: !title.trim() || saving ? 0.6 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitLabel}>
                {isRTL ? "إرسال الطلب" : "Send request"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { fontSize: 17, fontWeight: "800" },
  typeRow: { gap: 8, marginVertical: 4 },
  typeChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  label: { fontSize: 12, fontWeight: "700", marginTop: 6 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  notes: { minHeight: 96, textAlignVertical: "top" },
  aiBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  submit: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
