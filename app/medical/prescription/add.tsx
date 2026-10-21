import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import {
  Camera,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { useAiEnabled } from "@/domains/ai/aiPreference";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { leaveMedicalForm } from "@/utils/medicalFormNavigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { useAuthStore } from "@/domains/auth/store";
import { sharePrescriptionToChat } from "@/domains/medical/sharePrescriptionToChat";
import {
  createPrescriptionForPatientUser,
  draftAiPrescriptionForDiagnosis,
  fetchAllMedicalHistory,
  uploadFile,
} from "@/domains/medical/api";
import { BodyPartPicker } from "@/components/records/BodyPartPicker";
import { parseBodyPart, type BodyPart } from "@/domains/medical/bodyParts";
import { resolveMedicalOwnerUserId } from "@/domains/medical/ownerUserId";
import {
  analyzePrescriptionScan,
  normalizePrescriptionScanFile,
  type PrescriptionScanAsset,
} from "@/domains/medical/prescriptionScan";
import { useMedicalStore } from "@/domains/medical/store";
import type { PrescriptionMedication } from "@/domains/medical/types";
import { useReminderScheduler } from "@/domains/reminders/hooks/useReminderScheduler";
import { useApiLang } from "@/hooks/useApiLang";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

function emptyMedication(): PrescriptionMedication {
  return { medication_name: "", dose: "", interval: "", notes: "" };
}

interface ScanAsset extends PrescriptionScanAsset {}

export default function AddPrescriptionScreen() {
  const colors = useColors();
  const aiEnabled = useAiEnabled();
  const { isRTL, t, locale } = useI18n();
  const apiLang = useApiLang();
  const insets = useSafeAreaInsets();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const {
    patientUserId: patientUserIdParam,
    bodyPart: bodyPartParam,
    returnTo: returnToParam,
  } = useLocalSearchParams<{
    patientUserId?: string;
    bodyPart?: string;
    returnTo?: string;
  }>();
  // Set when the form was opened from a chat — land back in that thread.
  const returnTo = Array.isArray(returnToParam) ? returnToParam[0] : returnToParam;

  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);
  const upsertPrescription = useMedicalStore((s) => s.upsertPrescription);
  const notifyMedicalHistoryChanged = useMedicalStore((s) => s.notifyMedicalHistoryChanged);
  const { schedule: scheduleReminder } = useReminderScheduler();

  const patientUserId =
    resolveMedicalOwnerUserId(patientUserIdParam, profile?.id);

  const [title, setTitle] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [bodyPart, setBodyPart] = useState<BodyPart>(
    () => parseBodyPart(bodyPartParam) ?? "general",
  );
  const [medications, setMedications] = useState<PrescriptionMedication[]>([emptyMedication()]);
  const [scanAsset, setScanAsset] = useState<ScanAsset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [completingAi, setCompletingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const isDoctor = role?.toLowerCase() === "doctor";

  useEffect(() => {
    const fromQuery = parseBodyPart(bodyPartParam);
    if (fromQuery) setBodyPart(fromQuery);
  }, [bodyPartParam]);

  const updateMedication = (index: number, patch: Partial<PrescriptionMedication>) => {
    setMedications((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addMedicationRow = () => {
    setMedications((rows) => [...rows, emptyMedication()]);
  };

  const removeMedicationRow = (index: number) => {
    setMedications((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const completeWithAi = async () => {
    const trimmedTitle = title.trim();
    if (!accessToken || !patientUserId || !trimmedTitle || !isDoctor) return;
    if (completingAi || analyzing || saving) return;
    setCompletingAi(true);
    try {
      const draft = await draftAiPrescriptionForDiagnosis(
        {
          patient_user_id: patientUserId,
          diagnosis_title: trimmedTitle,
          symptoms: symptoms
            .split(/[;\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          lang: apiLang,
        },
        accessToken,
      );
      if (draft.title?.trim()) setTitle(draft.title.trim());
      if (draft.symptoms?.trim()) setSymptoms(draft.symptoms.trim());
      setMedications(
        draft.medications.length
          ? draft.medications.map((m) => ({
              medication_name: m.medication_name,
              dose: m.dose ?? "",
              interval: m.interval ?? "",
              notes: m.notes ?? "",
            }))
          : [emptyMedication()],
      );
    } catch (e) {
      Alert.alert(
        isRTL ? "فشل الإكمال" : "AI complete failed",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setCompletingAi(false);
    }
  };

  const processPrescriptionScan = async (picked: ScanAsset) => {
    if (!accessToken) return;

    const normalized = normalizePrescriptionScanFile(
      picked.uri,
      picked.mimeType,
      picked.fileName,
    );
    setScanAsset(normalized);
    setAnalyzing(true);
    try {
      const extracted = await analyzePrescriptionScan(
        normalized,
        accessToken,
        locale,
      );
      if (!extracted.length) {
        Alert.alert(
          isRTL ? "صورة غير واضحة" : "Image not clear enough",
          isRTL
            ? "تعذّر قراءة الروشتة. استخدم صورة واضحة بخط مقروء، أو أضف الأدوية يدويًا."
            : "We couldn't read this prescription. Use a clear photo with readable text, or add medications manually.",
        );
        return;
      }
      setMedications(extracted);
    } catch (e) {
      Alert.alert(
        isRTL ? "تعذر التحليل" : "Analysis failed",
        e instanceof Error
          ? e.message
          : isRTL
            ? "تأكد من وضوح الصورة والخط، ثم حاول مرة أخرى."
            : "Make sure the photo and text are clear, then try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const pickImage = async (source: "camera" | "gallery") => {
    if (!accessToken) return;

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        isRTL ? "إذن مطلوب" : "Permission required",
        isRTL ? "يرجى السماح بالوصول إلى الصور." : "Please allow photo access.",
      );
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.7,
          });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await processPrescriptionScan({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? `prescription-${Date.now()}.jpg`,
    });
  };

  const pickFromFiles = async () => {
    if (!accessToken) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    await processPrescriptionScan({
      uri: asset.uri,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.name ?? `prescription-${Date.now()}.jpg`,
    });
  };

  const showScanOptions = () => {
    Alert.alert(
      isRTL ? "مسح روشتة" : "Scan prescription",
      isRTL
        ? "يجب أن تكون الصورة واضحة والخط مقروءًا. الصور الضبابية أو غير الواضحة لا يمكن حفظها تلقائيًا."
        : "The photo must be clear with readable text. Blurry or unclear images cannot be saved automatically.",
      [
        {
          text: isRTL ? "الكاميرا" : "Camera",
          onPress: () => void pickImage("camera"),
        },
        {
          text: isRTL ? "المعرض" : "Gallery",
          onPress: () => void pickImage("gallery"),
        },
        {
          text: isRTL ? "ملف صورة" : "Image file",
          onPress: () => void pickFromFiles(),
        },
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
      ],
    );
  };

  const handleCancel = () => {
    leaveMedicalForm("/(tabs)/records", returnTo);
  };

  const handleSave = async () => {
    if (!accessToken || !patientUserId) {
      Alert.alert(isRTL ? "خطأ" : "Error", isRTL ? "المريض غير محدد." : "Patient is not set.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert(
        isRTL ? "العنوان مطلوب" : "Title required",
        isRTL ? "أدخل عنوانًا للروشتة." : "Enter a title for this prescription.",
      );
      return;
    }

    const cleaned = medications
      .map((row) => ({
        medication_name: row.medication_name.trim(),
        dose: row.dose?.trim() || undefined,
        interval: row.interval?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
      }))
      .filter((row) => row.medication_name.length > 0);

    if (!cleaned.length) {
      Alert.alert(
        isRTL ? "أدوية مطلوبة" : "Medications required",
        isRTL ? "أضف دواء واحدًا على الأقل." : "Add at least one medication.",
      );
      return;
    }

    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (scanAsset) {
        const normalized = normalizePrescriptionScanFile(
          scanAsset.uri,
          scanAsset.mimeType,
          scanAsset.fileName,
        );
        const uploaded = await uploadFile(
          normalized.uri,
          normalized.mimeType,
          normalized.fileName,
          accessToken,
        );
        imageUrl = uploaded.url;
      }

      const saved = await createPrescriptionForPatientUser(
        {
          patient_user_id: patientUserId,
          title: trimmedTitle,
          symptoms: symptoms.trim() || undefined,
          medications: cleaned,
          image_url: imageUrl,
          body_part: bodyPart,
        },
        accessToken,
      );
      upsertPrescription(saved);
      scheduleReminder(saved);
      if (isDoctor && patientUserIdParam && profile?.id) {
        await sharePrescriptionToChat({
          patientUserId,
          prescriptionId: saved.id,
          title: trimmedTitle,
          token: accessToken,
          selfId: profile.id,
          selfRole: role,
        });
      }
      notifyMedicalHistoryChanged(patientUserId);
      const history = await fetchAllMedicalHistory(patientUserId, accessToken, role ?? undefined);
      setRecordsFromApi(history, patientUserId);
      leaveMedicalForm("/(tabs)/records", returnTo);
    } catch (e) {
      Alert.alert(
        isRTL ? "فشل الحفظ" : "Save failed",
        e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const busy = analyzing || saving || completingAi;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
            flexDirection: dir,
          },
        ]}
      >
        <AppBackButton
          color={colors.foreground}
          style={styles.headerBtn}
          hitSlop={8}
          fallback="/(tabs)/records"
          onPress={handleCancel}
        />
        <Text style={[styles.headerTitle, { color: colors.foreground, textAlign }]}>
          {isRTL ? "إضافة روشتة" : "Add prescription"}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardSafeScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
          {isRTL
            ? "راجع الأدوية قبل الحفظ. لن تُحفظ أي بيانات حتى تضغط حفظ."
            : "Review medications before saving. Nothing is stored until you press Save."}
        </Text>

        <Field
          label={isRTL ? "العنوان / التشخيص" : "Title / condition"}
          value={title}
          onChangeText={setTitle}
          placeholder={isRTL ? "مثال: التهاب الحلق" : "e.g. Sore throat"}
          colors={colors}
          textAlign={textAlign}
        />

        {isDoctor && aiEnabled ? (
          <Pressable
            onPress={() => void completeWithAi()}
            disabled={!title.trim() || busy}
            style={({ pressed }) => [
              styles.completeAiBtn,
              {
                flexDirection: dir,
                borderColor: colors.primary,
                backgroundColor: pressed
                  ? `${colors.primary}22`
                  : `${colors.primary}12`,
                opacity: !title.trim() || busy ? 0.55 : 1,
              },
            ]}
          >
            {completingAi ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Sparkles size={16} color={colors.primary} />
            )}
            <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
              {t.records.completeWithAi}
            </Text>
          </Pressable>
        ) : null}

        <BodyPartPicker value={bodyPart} onChange={setBodyPart} />

        <Field
          label={isRTL ? "الأعراض (اختياري)" : "Symptoms (optional)"}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder={isRTL ? "صف الأعراض إن وجدت…" : "Describe symptoms if any…"}
          colors={colors}
          textAlign={textAlign}
          multiline
        />

        <View
          style={[
            styles.scanNote,
            {
              borderColor: `${colors.primary}44`,
              backgroundColor: `${colors.primary}10`,
            },
          ]}
        >
          <Text style={[styles.scanNoteText, { color: colors.foreground, textAlign }]}>
            {isRTL
              ? "عند رفع صورة الروشتة: يجب أن تكون الصورة واضحة والخط مقروءًا. الصور الضبابية أو غير الواضحة لا يمكن قراءتها وحفظها تلقائيًا — استخدم صورة أوضح أو أدخل الأدوية يدويًا."
              : "When uploading a prescription photo: the image must be clear with readable text. Blurry or unclear photos cannot be read and saved automatically — use a clearer photo or enter medications manually."}
          </Text>
        </View>

        <View style={[styles.scanRow, { flexDirection: dir }]}>
          <Pressable
            onPress={showScanOptions}
            disabled={busy}
            style={({ pressed }) => [
              styles.scanBtn,
              {
                backgroundColor: pressed ? `${colors.primary}22` : `${colors.primary}12`,
                borderColor: colors.primary,
                opacity: busy ? 0.6 : 1,
                flexDirection: dir,
              },
            ]}
          >
            {analyzing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Camera size={18} color={colors.primary} />
            )}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {analyzing
                ? isRTL
                  ? "جاري التحليل…"
                  : "Analyzing…"
                : isRTL
                  ? "مسح من صورة"
                  : "Scan from image"}
            </Text>
          </Pressable>
        </View>

        {scanAsset ? (
          <View style={[styles.previewWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Image source={{ uri: scanAsset.uri }} style={styles.previewImage} resizeMode="cover" />
            <View style={[styles.previewLabel, { flexDirection: dir }]}>
              <ImageIcon size={14} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 12, flex: 1 }}>
                {isRTL
                  ? "معاينة الصورة — ستُحفظ مع الروشتة عند الضغط على حفظ"
                  : "Image preview — will be saved with the prescription when you press Save"}
              </Text>
              <Pressable onPress={() => setScanAsset(null)} hitSlop={8} disabled={busy}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {isRTL ? "الأدوية" : "Medications"}
          </Text>
          <Pressable onPress={addMedicationRow} style={[styles.addRowBtn, { flexDirection: dir }]}>
            <Plus size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {isRTL ? "إضافة دواء" : "Add medication"}
            </Text>
          </Pressable>
        </View>

        {medications.map((med, index) => (
          <View
            key={`med-${index}`}
            style={[styles.medCard, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <View style={[styles.medCardHead, { flexDirection: dir }]}>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {isRTL ? `دواء ${index + 1}` : `Medication ${index + 1}`}
              </Text>
              {medications.length > 1 ? (
                <Pressable onPress={() => removeMedicationRow(index)} hitSlop={8}>
                  <Trash2 size={16} color={colors.destructive} />
                </Pressable>
              ) : null}
            </View>

            <Field
              label={isRTL ? "اسم الدواء" : "Medication name"}
              value={med.medication_name}
              onChangeText={(value) => updateMedication(index, { medication_name: value })}
              placeholder={isRTL ? "اسم الدواء" : "Medication name"}
              colors={colors}
              textAlign={textAlign}
            />
            <Field
              label={isRTL ? "الجرعة" : "Dose"}
              value={med.dose ?? ""}
              onChangeText={(value) => updateMedication(index, { dose: value })}
              placeholder={isRTL ? "مثال: 500 مج" : "e.g. 500 mg"}
              colors={colors}
              textAlign={textAlign}
            />
            <Field
              label={isRTL ? "التكرار / الفترة" : "Interval / frequency"}
              value={med.interval ?? ""}
              onChangeText={(value) => updateMedication(index, { interval: value })}
              placeholder={isRTL ? "مثال: مرتين يوميًا" : "e.g. twice daily"}
              colors={colors}
              textAlign={textAlign}
            />
            <Field
              label={isRTL ? "ملاحظات" : "Notes"}
              value={med.notes ?? ""}
              onChangeText={(value) => updateMedication(index, { notes: value })}
              placeholder={isRTL ? "تعليمات إضافية…" : "Extra instructions…"}
              colors={colors}
              textAlign={textAlign}
              multiline
            />
          </View>
        ))}
      </KeyboardSafeScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            borderTopColor: colors.border,
            backgroundColor: colors.card,
            flexDirection: dir,
          },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          disabled={busy}
          style={({ pressed }) => [
            styles.footerBtn,
            styles.cancelBtn,
            { borderColor: colors.border, opacity: pressed || busy ? 0.7 : 1, flexDirection: dir },
          ]}
        >
          <X size={16} color={colors.foreground} />
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>{t.common.cancel}</Text>
        </Pressable>

        <Pressable
          onPress={() => void handleSave()}
          disabled={busy}
          style={({ pressed }) => [
            styles.footerBtn,
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed || busy ? 0.75 : 1,
              flexDirection: dir,
            },
          ]}
        >
          {saving ? <ActivityIndicator color="#fff" /> : null}
          <Text style={{ color: "#fff", fontWeight: "700" }}>{t.common.save}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  textAlign,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: "600", textAlign }}>
        {label}
      </Text>
      <AppTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: colors.foreground,
            backgroundColor: colors.muted,
            textAlign,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700" },
  scroll: { flex: 1 },
  hint: { fontSize: 13, lineHeight: 18 },
  completeAiBtn: {
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  scanNote: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  scanNoteText: { fontSize: 13, lineHeight: 19 },
  scanRow: { gap: 10 },
  scanBtn: {
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: 160 },
  previewLabel: {
    alignItems: "center",
    gap: 6,
    padding: 10,
  },
  sectionHead: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  addRowBtn: { alignItems: "center", gap: 6, alignSelf: "flex-start" },
  medCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  medCardHead: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  field: { gap: 6 },
  input: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  footer: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelBtn: { borderWidth: 1 },
  saveBtn: {},
});
