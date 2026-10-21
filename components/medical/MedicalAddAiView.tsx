import * as DocumentPicker from "expo-document-picker";
import {
  isDocumentScannerAvailable,
  scanDocumentPage,
} from "@/utils/documentScanner";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { Camera, FileUp, Image as ImageIcon, Mic, Plus, ScanLine, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "@/components/AppTextInput";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { BodyPartAutocomplete } from "@/components/records/BodyPartAutocomplete";
import { useAuthStore } from "@/domains/auth/store";
import { useFieldDictation } from "@/hooks/useFieldDictation";
import {
  analyzeMedicalRecordImage,
  createPatientMedicalDocument,
  createPrescriptionForPatientUser,
  fulfillMedicalDocumentRequest,
  uploadFile,
} from "@/domains/medical/api";
import { MEDICAL_EVENTS } from "@/domains/medical/events";
import { parseBodyPart, type BodyPart } from "@/domains/medical/bodyParts";
import {
  isDoctorAddingForPatient,
  resolveMedicalOwnerUserId,
} from "@/domains/medical/ownerUserId";
import {
  analyzePrescriptionScan,
  normalizePrescriptionScanFile,
} from "@/domains/medical/prescriptionScan";
import { useMedicalStore } from "@/domains/medical/store";
import type { MedicalAiInsight, PrescriptionMedication } from "@/domains/medical/types";
import { useReminderScheduler } from "@/domains/reminders/hooks/useReminderScheduler";
import { useApiLang } from "@/hooks/useApiLang";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { showAppAlert } from "@/utils/appAlert";
import { emit } from "@/utils/eventBus";
import { leaveMedicalForm } from "@/utils/medicalFormNavigation";
import { showSuccessToast } from "@/utils/toast";
import { alignText, flexRow } from "@/utils/rtl";

type DocType = "lab" | "xray" | "prescription";

interface AttachedFile {
  uri: string;
  name: string;
  mimeType: string;
  webFile?: File;
}

const TYPES: { key: DocType; labelEn: string; labelAr: string }[] = [
  { key: "lab", labelEn: "Lab", labelAr: "مختبر" },
  { key: "xray", labelEn: "X-ray", labelAr: "أشعة" },
  { key: "prescription", labelEn: "Prescription", labelAr: "روشتة" },
];

function emptyMedication(): PrescriptionMedication {
  return { medication_name: "", dose: "", interval: "", notes: "" };
}

export function MedicalAddAiView() {
  const colors = useColors();
  const { t, isRTL, locale } = useI18n();
  const apiLang = useApiLang();
  const { isDesktop, isMobile } = useWebLayout();
  const insets = useSafeAreaInsets();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const {
    patientUserId: patientUserIdParam,
    bodyPart: bodyPartParam,
    requestId: requestIdParam,
    category: categoryParam,
  } = useLocalSearchParams<{
    patientUserId?: string;
    bodyPart?: string;
    requestId?: string;
    category?: string;
  }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const notifyMedicalHistoryChanged = useMedicalStore((s) => s.notifyMedicalHistoryChanged);
  const upsertDocument = useMedicalStore((s) => s.upsertDocument);
  const upsertPrescription = useMedicalStore((s) => s.upsertPrescription);
  const { schedule: scheduleReminder } = useReminderScheduler();
  const doctorAddingForPatient = isDoctorAddingForPatient(
    role,
    patientUserIdParam,
    profile?.id,
  );
  const patientUserId = resolveMedicalOwnerUserId(patientUserIdParam, profile?.id);

  const [file, setFile] = useState<AttachedFile | null>(null);
  const hasConfirmImage = !!file?.mimeType.startsWith("image/");
  const splitConfirm = !isMobile && hasConfirmImage;
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"upload" | "confirm">("upload");
  const [type, setType] = useState<DocType>(() =>
    categoryParam === "xray" || categoryParam === "prescription"
      ? categoryParam
      : "lab",
  );
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [bodyPart, setBodyPart] = useState<BodyPart>(
    () => parseBodyPart(bodyPartParam) ?? "general",
  );
  const [insight, setInsight] = useState<MedicalAiInsight | null>(null);
  const [medications, setMedications] = useState<PrescriptionMedication[]>([
    emptyMedication(),
  ]);
  const [extractingMeds, setExtractingMeds] = useState(false);
  const [medsLoaded, setMedsLoaded] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const titleDictation = useFieldDictation({
    value: title,
    onChangeText: setTitle,
  });

  const extractMedications = async (attached: AttachedFile) => {
    if (!accessToken) return;
    setExtractingMeds(true);
    try {
      const normalized = normalizePrescriptionScanFile(
        attached.uri,
        attached.mimeType,
        attached.name,
      );
      const extracted = await analyzePrescriptionScan(
        { ...normalized, webFile: attached.webFile },
        accessToken,
        locale,
      );
      setMedications(extracted.length ? extracted : [emptyMedication()]);
      setMedsLoaded(true);
    } catch {
      setMedications([emptyMedication()]);
      setMedsLoaded(true);
    } finally {
      setExtractingMeds(false);
    }
  };

  const analyze = async (attached: AttachedFile) => {
    if (!accessToken) return;
    setAnalyzing(true);
    setMedsLoaded(false);
    const patientTitle = title.trim();
    try {
      const analyzed = await analyzeMedicalRecordImage(
        attached.uri,
        attached.mimeType,
        attached.name,
        accessToken,
        apiLang,
        attached.webFile,
        patientTitle ? { title: patientTitle } : undefined,
      );
      setType(
        requestIdParam?.trim() &&
          (categoryParam === "lab" || categoryParam === "xray")
          ? categoryParam
          : analyzed.type,
      );
      // Keep the patient's title when they provided one; otherwise use AI suggestion.
      setTitle(patientTitle || analyzed.title);
      setNotes(analyzed.notes);
      setBodyPart(parseBodyPart(analyzed.body_part) ?? "general");
      setInsight(analyzed.ai_insight);
      setStep("confirm");
      if (analyzed.type === "prescription") {
        await extractMedications(attached);
      }
    } catch (err) {
      showAppAlert(
        isRTL ? "فشل التحليل" : "Analysis failed",
        (err as Error).message,
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const selectType = (next: DocType) => {
    // Fulfilling a doctor request locks the document type.
    if (
      requestIdParam?.trim() &&
      (categoryParam === "lab" || categoryParam === "xray")
    ) {
      return;
    }
    setType(next);
    if (next === "prescription" && file && !medsLoaded && !extractingMeds) {
      void extractMedications(file);
    }
  };

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

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showAppAlert(
        isRTL ? "الإذن مطلوب" : "Permission needed",
        isRTL ? "اسمح بالكاميرا للمتابعة." : "Allow camera access to continue.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const attached: AttachedFile = {
      uri: asset.uri,
      name: asset.fileName ?? "medical-record.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
      webFile: Platform.OS === "web" && asset.file ? (asset.file as File) : undefined,
    };
    setFile(attached);
    await analyze(attached);
  };

  const pickGallery = async () => {
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
      webFile: Platform.OS === "web" && asset.file ? (asset.file as File) : undefined,
    };
    setFile(attached);
    await analyze(attached);
  };

  /** Native document scan → straight into the AI analysis step. */
  const scanDocument = async () => {
    try {
      const page = await scanDocumentPage();
      if (!page) return;
      setFile(page);
      await analyze(page);
    } catch (e) {
      showAppAlert(
        isRTL ? "تعذر المسح" : "Scan failed",
        e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const attached: AttachedFile = {
      uri: asset.uri,
      name: asset.name ?? "document",
      mimeType: asset.mimeType ?? "application/pdf",
      webFile: Platform.OS === "web" && asset.file ? (asset.file as File) : undefined,
    };
    setFile(attached);
    await analyze(attached);
  };

  const save = async () => {
    if (!accessToken || !file || !title.trim()) {
      showAppAlert(
        isRTL ? "حقول ناقصة" : "Missing fields",
        isRTL ? "أكمل العنوان." : "Fill in the title.",
      );
      return;
    }

    if (type !== "prescription" && !notes.trim()) {
      showAppAlert(
        isRTL ? "حقول ناقصة" : "Missing fields",
        isRTL ? "أكمل العنوان والوصف." : "Fill in title and description.",
      );
      return;
    }

    if (type === "prescription") {
      const cleaned = medications
        .map((row) => ({
          medication_name: row.medication_name.trim(),
          dose: row.dose?.trim() || undefined,
          interval: row.interval?.trim() || undefined,
          notes: row.notes?.trim() || undefined,
        }))
        .filter((row) => row.medication_name.length > 0);

      if (!cleaned.length) {
        showAppAlert(
          isRTL ? "أدوية مطلوبة" : "Medications required",
          isRTL ? "أضف دواء واحدًا على الأقل." : "Add at least one medication.",
        );
        return;
      }

      if (!patientUserId) {
        showAppAlert(
          isRTL ? "خطأ" : "Error",
          isRTL
            ? "تعذّر تحديد المريض. سجّل الدخول مرة أخرى."
            : "Could not determine patient. Sign in again.",
        );
        return;
      }

      setSaving(true);
      try {
        const uploaded = await uploadFile(
          file.uri,
          file.mimeType,
          file.name,
          accessToken,
          file.webFile,
        );
        const saved = await createPrescriptionForPatientUser(
          {
            patient_user_id: patientUserId,
            title: title.trim(),
            symptoms: notes.trim() || undefined,
            medications: cleaned,
            image_url: uploaded.url,
            body_part: bodyPart,
          },
          accessToken,
        );
        upsertPrescription(saved);
        scheduleReminder(saved);
        notifyMedicalHistoryChanged(patientUserId);
        showSuccessToast(isRTL ? "تم الحفظ" : "Saved");
        leaveMedicalForm(
          patientUserIdParam?.trim()
            ? (`/patients/${patientUserIdParam.trim()}` as `/patients/${string}`)
            : "/(tabs)/records",
        );
      } catch (err) {
        showAppAlert(isRTL ? "فشل الحفظ" : "Save failed", (err as Error).message);
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const uploaded = await uploadFile(
        file.uri,
        file.mimeType,
        file.name,
        accessToken,
        file.webFile,
      );
      const record = await createPatientMedicalDocument(
        {
          type,
          file_url: uploaded.url,
          file_name: file.name,
          title: title.trim(),
          notes: notes.trim(),
          body_part: bodyPart,
          ...(doctorAddingForPatient
            ? { patient_user_id: patientUserIdParam!.trim() }
            : {}),
          ai_insight: insight ?? undefined,
          lang: apiLang,
        },
        accessToken,
      );
      upsertDocument(record);
      const requestId = requestIdParam?.trim();
      if (requestId) {
        try {
          await fulfillMedicalDocumentRequest(requestId, record.id, accessToken);
          emit(MEDICAL_EVENTS.DOCUMENT_REQUEST_FULFILLED, { requestId });
        } catch (fulfillErr) {
          showAppAlert(
            isRTL ? "تم حفظ النتيجة" : "Result saved",
            fulfillErr instanceof Error
              ? fulfillErr.message
              : isRTL
                ? "تعذر إغلاق الطلب — أعد المحاولة من الطلبات المعلقة."
                : "Could not close the request — retry from Pending requests.",
          );
        }
      }
      const ownerId =
        patientUserIdParam?.trim() || profile?.id || record.ownerId;
      if (ownerId) notifyMedicalHistoryChanged(ownerId);
      showSuccessToast(isRTL ? "تم الحفظ" : "Saved");
      leaveMedicalForm(
        patientUserIdParam?.trim()
          ? (`/patients/${patientUserIdParam.trim()}` as `/patients/${string}`)
          : "/(tabs)/records",
      );
    } catch (err) {
      showAppAlert(isRTL ? "فشل الحفظ" : "Save failed", (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardSafeScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={32}
      >
        <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
          {step === "upload" ? t.records.addAiUploadTitle : t.records.addAiConfirmTitle}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
          {step === "upload" ? t.records.addAiUploadHint : t.records.addAiConfirmHint}
        </Text>

        {step === "upload" && !analyzing ? (
          <View style={styles.titleBlock}>
            <Text style={[styles.label, { color: colors.mutedForeground, textAlign, marginTop: 0 }]}>
              {t.records.addAiTitleLabel}
            </Text>
            <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
              {t.records.addAiTitleHint}
            </Text>
            <View
              style={[
                styles.titleInputRow,
                {
                  flexDirection: dir,
                  borderColor: colors.border,
                  backgroundColor: "#fff",
                },
              ]}
            >
              <AppTextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t.records.addAiTitlePlaceholder}
                placeholderTextColor={colors.mutedForeground}
                focusBorder={false}
                style={[
                  styles.titleInput,
                  { color: colors.foreground, textAlign },
                ]}
              />
              <Pressable
                onPress={titleDictation.toggle}
                disabled={titleDictation.busy}
                accessibilityRole="button"
                accessibilityLabel={
                  titleDictation.listening
                    ? isRTL
                      ? "إيقاف التسجيل"
                      : "Stop listening"
                    : isRTL
                      ? "إدخال بالكلام"
                      : "Dictate title"
                }
                hitSlop={8}
                style={[
                  styles.micBtn,
                  {
                    backgroundColor: titleDictation.listening
                      ? colors.destructive
                      : `${colors.primary}14`,
                    opacity: titleDictation.busy ? 0.7 : 1,
                  },
                ]}
              >
                {titleDictation.busy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Mic
                    size={18}
                    color={titleDictation.listening ? "#fff" : colors.primary}
                  />
                )}
              </Pressable>
            </View>
            {titleDictation.listening ? (
              <Text style={[styles.hint, { color: colors.destructive, textAlign }]}>
                {isRTL
                  ? "جاري الاستماع… تكلم ثم اضغط الميكروفون للإيقاف"
                  : "Listening… speak, then tap mic to stop"}
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === "upload" || analyzing ? (
          <View style={styles.uploadBlock}>
            {analyzing ? (
              <View style={styles.analyzing}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                  {t.records.addAiAnalyzing}
                </Text>
              </View>
            ) : (
              <View style={[styles.uploadRow, { flexDirection: dir }]}>
                <Pressable
                  onPress={pickCamera}
                  style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Camera size={22} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                    {isRTL ? "كاميرا" : "Camera"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={pickGallery}
                  style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <ImageIcon size={22} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                    {isRTL ? "معرض" : "Gallery"}
                  </Text>
                </Pressable>
                {isDocumentScannerAvailable ? (
                  <Pressable
                    onPress={scanDocument}
                    style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  >
                    <ScanLine size={22} color={colors.primary} />
                    <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                      {isRTL ? "مسح" : "Scan"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={pickDocument}
                  style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <FileUp size={22} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                    {isRTL ? "ملف" : "File"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {step === "confirm" ? (
          <View style={styles.confirmBlock}>
            <View
              style={[
                styles.confirmSplit,
                splitConfirm && styles.confirmSplitRow,
              ]}
            >
              {/* Image first in DOM so it stays on top on mobile; row-reverse keeps it on the right on desktop. */}
              {file?.mimeType.startsWith("image/") ? (
                <View
                  style={[
                    styles.confirmImageCol,
                    splitConfirm && styles.confirmHalf,
                  ]}
                >
                  <Pressable
                    onPress={() => setZoomImageUri(file.uri)}
                    style={styles.previewPressable}
                  >
                    <Image
                      source={{ uri: file.uri }}
                      style={[
                        styles.preview,
                        !splitConfirm && styles.previewMobile,
                      ]}
                      resizeMode="stretch"
                    />
                    <Text
                      style={[styles.previewHint, { color: colors.mutedForeground, textAlign }]}
                    >
                      {isRTL ? "اضغط لعرض الصورة" : "Tap to view full image"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View
                style={[
                  styles.confirmDetails,
                  splitConfirm && styles.confirmHalf,
                ]}
              >
                <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                  {isRTL ? "النوع" : "Type"}
                </Text>
                <View style={[styles.typeRow, { flexDirection: dir }]}>
                  {TYPES.map((item) => {
                    const active = type === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => selectType(item.key)}
                        style={[
                          styles.typeChip,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? `${colors.primary}14` : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? colors.primary : colors.foreground,
                            fontWeight: "700",
                            fontSize: 13,
                          }}
                        >
                          {isRTL ? item.labelAr : item.labelEn}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                  {isRTL ? "العنوان" : "Title"}
                </Text>
                <View
                  style={[
                    styles.titleInputRow,
                    {
                      flexDirection: dir,
                      borderColor: colors.border,
                      backgroundColor: "#fff",
                    },
                  ]}
                >
                  <AppTextInput
                    value={title}
                    onChangeText={setTitle}
                    focusBorder={false}
                    style={[
                      styles.titleInput,
                      { color: colors.foreground, textAlign },
                    ]}
                  />
                  <Pressable
                    onPress={titleDictation.toggle}
                    disabled={titleDictation.busy}
                    hitSlop={8}
                    style={[
                      styles.micBtn,
                      {
                        backgroundColor: titleDictation.listening
                          ? colors.destructive
                          : `${colors.primary}14`,
                        opacity: titleDictation.busy ? 0.7 : 1,
                      },
                    ]}
                  >
                    {titleDictation.busy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Mic
                        size={18}
                        color={titleDictation.listening ? "#fff" : colors.primary}
                      />
                    )}
                  </Pressable>
                </View>

                <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                  {type === "prescription"
                    ? isRTL
                      ? "الأعراض / الوصف"
                      : "Symptoms / description"
                    : isRTL
                      ? "الوصف"
                      : "Description"}
                </Text>
                <AppTextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  style={[
                    styles.input,
                    styles.notes,
                    { color: colors.foreground, borderColor: colors.border, textAlign },
                  ]}
                />

                <BodyPartAutocomplete
                  value={bodyPart}
                  onChange={(part) => setBodyPart(part ?? "general")}
                  label={t.records.bodyPart}
                />

                {type === "prescription" ? (
                  <View style={styles.medSection}>
                    <View style={[styles.medSectionHead, { flexDirection: dir }]}>
                      <Text
                        style={[styles.medSectionTitle, { color: colors.foreground, textAlign }]}
                      >
                        {isRTL ? "الأدوية" : "Medications"}
                      </Text>
                      <Pressable
                        onPress={addMedicationRow}
                        style={[styles.addMedBtn, { flexDirection: dir }]}
                      >
                        <Plus size={16} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: "700" }}>
                          {isRTL ? "إضافة دواء" : "Add medication"}
                        </Text>
                      </Pressable>
                    </View>
                    {extractingMeds ? (
                      <View style={styles.extractingMeds}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                          {isRTL ? "جاري استخراج الأدوية…" : "Extracting medications…"}
                        </Text>
                      </View>
                    ) : null}
                    {medications.map((med, index) => (
                      <View
                        key={`med-${index}`}
                        style={[
                          styles.medCard,
                          { borderColor: colors.border, backgroundColor: colors.card },
                        ]}
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
                        <Text
                          style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}
                        >
                          {isRTL ? "اسم الدواء" : "Medication name"}
                        </Text>
                        <AppTextInput
                          value={med.medication_name}
                          onChangeText={(value) =>
                            updateMedication(index, { medication_name: value })
                          }
                          placeholder={isRTL ? "اسم الدواء" : "Medication name"}
                          placeholderTextColor={colors.mutedForeground}
                          style={[
                            styles.input,
                            { color: colors.foreground, borderColor: colors.border, textAlign },
                          ]}
                        />
                        <Text
                          style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}
                        >
                          {isRTL ? "الجرعة" : "Dose"}
                        </Text>
                        <AppTextInput
                          value={med.dose ?? ""}
                          onChangeText={(value) => updateMedication(index, { dose: value })}
                          placeholder={isRTL ? "مثال: 500 مج" : "e.g. 500 mg"}
                          placeholderTextColor={colors.mutedForeground}
                          style={[
                            styles.input,
                            { color: colors.foreground, borderColor: colors.border, textAlign },
                          ]}
                        />
                        <Text
                          style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}
                        >
                          {isRTL ? "التكرار / الفترة" : "Interval / frequency"}
                        </Text>
                        <AppTextInput
                          value={med.interval ?? ""}
                          onChangeText={(value) => updateMedication(index, { interval: value })}
                          placeholder={isRTL ? "مثال: مرتين يوميًا" : "e.g. twice daily"}
                          placeholderTextColor={colors.mutedForeground}
                          style={[
                            styles.input,
                            { color: colors.foreground, borderColor: colors.border, textAlign },
                          ]}
                        />
                        <Text
                          style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}
                        >
                          {isRTL ? "ملاحظات" : "Notes"}
                        </Text>
                        <AppTextInput
                          value={med.notes ?? ""}
                          onChangeText={(value) => updateMedication(index, { notes: value })}
                          placeholder={isRTL ? "تعليمات إضافية…" : "Extra instructions…"}
                          placeholderTextColor={colors.mutedForeground}
                          multiline
                          style={[
                            styles.input,
                            styles.medNotes,
                            { color: colors.foreground, borderColor: colors.border, textAlign },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}

                {type !== "prescription" ? (
                  <>
                    <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                      {t.records.aiInsight}
                    </Text>
                    <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
                      {t.records.aiInsightHint}
                    </Text>
                    <AppTextInput
                      value={insight?.description ?? ""}
                      onChangeText={(value) =>
                        setInsight((prev) => ({
                          description: value,
                          possible_diseases: prev?.possible_diseases ?? "",
                        }))
                      }
                      multiline
                      placeholder={isRTL ? "تشخيص الذكاء الاصطناعي" : "AI diagnosis summary"}
                      style={[
                        styles.input,
                        styles.notes,
                        { color: colors.foreground, borderColor: colors.border, textAlign },
                      ]}
                    />
                    <Text style={[styles.label, { color: colors.mutedForeground, textAlign }]}>
                      {t.records.aiInsightPossible}
                    </Text>
                    <AppTextInput
                      value={insight?.possible_diseases ?? ""}
                      onChangeText={(value) =>
                        setInsight((prev) => ({
                          description: prev?.description ?? "",
                          possible_diseases: value,
                        }))
                      }
                      multiline
                      placeholder={
                        isRTL
                          ? "حالات محتملة للمناقشة مع الطبيب"
                          : "Possible conditions to discuss"
                      }
                      style={[
                        styles.input,
                        styles.notes,
                        { color: colors.foreground, borderColor: colors.border, textAlign },
                      ]}
                    />
                  </>
                ) : null}
              </View>
            </View>

            <Pressable
              onPress={save}
              disabled={saving || extractingMeds}
              style={[
                styles.saveBtn,
                isDesktop && {
                  maxWidth: 300,
                  width: "100%",
                  alignSelf: "center",
                },
                {
                  backgroundColor: colors.primary,
                  opacity: saving || extractingMeds ? 0.7 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveLabel}>{t.records.addAiSave}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setStep("upload");
                setFile(null);
                setMedications([emptyMedication()]);
                setMedsLoaded(false);
                setInsight(null);
                // Keep title so the patient can reuse it with another file.
              }}
              style={styles.reupload}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {isRTL ? "رفع ملف آخر" : "Upload a different file"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardSafeScrollView>

      <FullscreenImageViewer
        uri={zoomImageUri}
        onClose={() => setZoomImageUri(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: "500", marginBottom: 12 },
  titleBlock: { gap: 6, marginBottom: 8 },
  titleInputRow: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 4,
    paddingRight: 6,
    minHeight: 48,
    gap: 4,
  },
  titleInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    backgroundColor: "transparent",
    minWidth: 0,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  uploadBlock: { marginTop: 8 },
  uploadRow: { gap: 10 },
  uploadBtn: {
    flex: 1,
    minHeight: 96,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  analyzing: { alignItems: "center", gap: 12, paddingVertical: 40 },
  confirmBlock: { gap: 8, marginTop: 8 },
  confirmSplit: {
    gap: 16,
    width: "100%",
  },
  confirmSplitRow: {
    // Image is first in DOM (top on mobile); reverse so image stays on the right on desktop.
    flexDirection: "row-reverse",
    alignItems: "flex-start",
  },
  confirmDetails: {
    gap: 8,
    minWidth: 0,
  },
  confirmHalf: {
    flex: 1,
    width: "50%",
    maxWidth: "50%",
  },
  confirmImageCol: {
    minWidth: 0,
    maxHeight: 400,
  },
  previewPressable: {
    width: "100%",
    maxHeight: 400,
  },
  preview: {
    width: "100%",
    height: 400,
    maxHeight: 400,
    borderRadius: 14,
  },
  previewMobile: {
    height: 240,
  },
  previewHint: { fontSize: 12, fontWeight: "500", marginTop: 6, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: "700", marginTop: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  hint: { fontSize: 12, fontWeight: "500", marginTop: 2, lineHeight: 16 },
  typeRow: { gap: 8, flexWrap: "wrap" },
  typeChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
  },
  notes: {
    minHeight: 96,
    textAlignVertical: "top",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 26,
  },
  medNotes: {
    minHeight: 64,
    textAlignVertical: "top",
    fontWeight: "500",
    lineHeight: 22,
  },
  medSection: { gap: 10, marginTop: 8 },
  medSectionHead: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  medSectionTitle: { fontSize: 16, fontWeight: "800" },
  addMedBtn: { alignItems: "center", gap: 6 },
  extractingMeds: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  medCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  medCardHead: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  saveBtn: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: { color: "#fff", fontSize: 16, fontWeight: "800" },
  reupload: { alignItems: "center", paddingVertical: 12 },
});
