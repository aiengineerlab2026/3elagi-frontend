import * as ImagePicker from "expo-image-picker";
import { Camera, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import {
  analyzeMedicalRecordImage,
  createPatientMedicalDocument,
  uploadFile,
} from "@/domains/medical/api";
import type { MedicalAiInsight, MedicalRecord } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useApiLang } from "@/hooks/useApiLang";
import { showAppAlert } from "@/utils/appAlert";
import { showSuccessToast } from "@/utils/toast";

interface AttachedFile {
  uri: string;
  name: string;
  mimeType: string;
  webFile?: File;
}

interface Props {
  visible: boolean;
  token: string;
  patientUserId?: string;
  onClose: () => void;
  onCreated?: (record: MedicalRecord, previewUri?: string) => void;
}

export function AssistantCreateRecordDialog({
  visible,
  token,
  patientUserId,
  onClose,
  onCreated,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const apiLang = useApiLang();
  const isEn = !isRTL;
  const [type, setType] = useState<"lab" | "xray" | "prescription">("lab");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<AttachedFile | null>(null);
  const [cachedInsight, setCachedInsight] = useState<MedicalAiInsight | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const reset = () => {
    setType("lab");
    setTitle("");
    setNotes("");
    setFile(null);
    setCachedInsight(null);
    setBusy(false);
    setAnalyzing(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const attached: AttachedFile = {
      uri: asset.uri,
      name: asset.fileName ?? "medical-record.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
      webFile:
        Platform.OS === "web" && asset.file ? (asset.file as File) : undefined,
    };
    setFile(attached);
    setAnalyzing(true);
    const patientTitle = title.trim();
    try {
      const analyzed = await analyzeMedicalRecordImage(
        attached.uri,
        attached.mimeType,
        attached.name,
        token,
        apiLang,
        attached.webFile,
        patientTitle ? { title: patientTitle } : undefined,
      );
      setType(analyzed.type);
      setTitle(patientTitle || analyzed.title);
      setNotes(analyzed.notes);
      setCachedInsight(analyzed.ai_insight);
    } catch (err) {
      showAppAlert(
        isEn ? "Analysis failed" : "فشل التحليل",
        (err as Error).message,
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async () => {
    if (!file || !title.trim() || !notes.trim()) {
      showAppAlert(
        isEn ? "Missing fields" : "حقول ناقصة",
        isEn
          ? "Add a photo, title, and description."
          : "أضف صورة وعنواناً ووصفاً.",
      );
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadFile(
        file.uri,
        file.mimeType,
        file.name,
        token,
        file.webFile,
      );
      let aiInsight = cachedInsight ?? undefined;
      if (!aiInsight) {
        try {
          const analyzed = await analyzeMedicalRecordImage(
            file.uri,
            file.mimeType,
            file.name,
            token,
            apiLang,
            file.webFile,
            title.trim() ? { title: title.trim() } : undefined,
          );
          aiInsight = analyzed.ai_insight;
        } catch {
          aiInsight = undefined;
        }
      }
      const created = await createPatientMedicalDocument(
        {
          type,
          file_url: uploaded.url || uploaded.objectPath,
          file_name: file.name,
          title: title.trim(),
          notes: notes.trim(),
          ai_insight: aiInsight,
          ...(patientUserId?.trim()
            ? { patient_user_id: patientUserId.trim() }
            : {}),
        },
        token,
      );
      showSuccessToast(
        isEn ? "Medical record created" : "تم إنشاء السجل الطبي",
      );
      onCreated?.(created, file?.uri);
      close();
    } catch (err) {
      showAppAlert(
        isEn ? "Could not save" : "تعذر الحفظ",
        (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.heading, { color: colors.foreground }]}>
              {isEn ? "Create medical record" : "إنشاء سجل طبي"}
            </Text>
            <Pressable onPress={close} hitSlop={10}>
              <X color={colors.mutedForeground} size={22} />
            </Pressable>
          </View>

          <View style={styles.typeRow}>
            {(["lab", "xray", "prescription"] as const).map((code) => {
              const selected = type === code;
              const label =
                code === "lab"
                  ? isEn
                    ? "Lab"
                    : "مختبر"
                  : code === "xray"
                    ? isEn
                      ? "X-ray"
                      : "أشعة"
                    : isEn
                      ? "Prescription"
                      : "روشتة";
              return (
                <Pressable
                  key={code}
                  onPress={() => setType(code)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: selected ? colors.primary : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected
                        ? colors.primaryForeground
                        : colors.foreground,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <AppTextInput
            value={title}
            onChangeText={setTitle}
            placeholder={
              isEn
                ? "Title (optional before photo — AI uses it)"
                : "العنوان (اختياري قبل الصورة — يستخدمه الذكاء)"
            }
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />

          <Pressable
            onPress={() => void pickImage()}
            style={[styles.attachBtn, { borderColor: colors.border }]}
          >
            {analyzing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Camera color={colors.primary} size={20} />
            )}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {file
                ? file.name
                : isEn
                  ? "Attach photo"
                  : "إرفاق صورة"}
            </Text>
          </Pressable>

          <AppTextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={isEn ? "Description" : "الوصف"}
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[
              styles.input,
              styles.textArea,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />

          <Pressable
            onPress={() => void submit()}
            disabled={busy || analyzing}
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: busy || analyzing ? 0.6 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
                {isEn ? "Save record" : "حفظ السجل"}
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: { fontSize: 18, fontWeight: "700" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
});
