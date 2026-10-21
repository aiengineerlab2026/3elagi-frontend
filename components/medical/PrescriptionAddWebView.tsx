import { useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { useAiEnabled } from "@/domains/ai/aiPreference";
import { BodyPartPicker } from "@/components/records/BodyPartPicker";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { MEDICAL_FORM_SAVE_BAR_HEIGHT } from "@/constants/medicalFormFooter";
import { useAuthStore } from "@/domains/auth/store";
import { sharePrescriptionToChat } from "@/domains/medical/sharePrescriptionToChat";
import {
  createPrescriptionForPatientUser,
  draftAiPrescriptionForDiagnosis,
  fetchAllMedicalHistory,
  uploadFile,
} from "@/domains/medical/api";
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
import { useWebLayout } from "@/hooks/useWebLayout";
import { showAppAlert } from "@/utils/appAlert";
import { leaveMedicalForm } from "@/utils/medicalFormNavigation";
import { showSuccessToast } from "@/utils/toast";

const ACCEPTED_FILE_TYPES = "image/*,.pdf";

function emptyMedication(): PrescriptionMedication {
  return { medication_name: "", dose: "", interval: "", notes: "" };
}

interface ScanAsset extends PrescriptionScanAsset {}

function gridStyle(columns: number): ViewStyle {
  if (columns <= 1) return { flexDirection: "column", gap: 16 };
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: 16,
  } as unknown as ViewStyle;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function SectionCard({
  title,
  subtitle,
  children,
  colors,
  textAlign,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, textAlign }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  required,
  colors,
  textAlign,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign }]}>
        {label}
        {required ? <Text style={{ color: "#ef4444" }}> *</Text> : null}
      </Text>
      <AppTextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.foreground,
            textAlign,
          },
        ]}
      />
    </View>
  );
}

export function PrescriptionAddWebView() {
  const colors = useColors();
  const aiEnabled = useAiEnabled();
  const { isRTL, t, locale } = useI18n();
  const apiLang = useApiLang();
  const { isDesktop, isTablet } = useWebLayout();
  const {
    patientUserId: patientUserIdParam,
    bodyPart: bodyPartParam,
    returnTo: returnToParam,
  } = useLocalSearchParams<{
    patientUserId?: string;
    bodyPart?: string;
    returnTo?: string;
  }>();

  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);
  const upsertPrescription = useMedicalStore((s) => s.upsertPrescription);
  const notifyMedicalHistoryChanged = useMedicalStore((s) => s.notifyMedicalHistoryChanged);
  const { schedule: scheduleReminder } = useReminderScheduler();

  const patientUserId = resolveMedicalOwnerUserId(patientUserIdParam, profile?.id);

  const returnTo = Array.isArray(returnToParam) ? returnToParam[0] : returnToParam;

  const exitAfterSave = () => {
    const fallback =
      role?.toLowerCase() === "doctor" && patientUserIdParam?.trim()
        ? (`/patients/${patientUserIdParam.trim()}` as `/patients/${string}`)
        : "/(tabs)/records";
    leaveMedicalForm(fallback, returnTo);
  };

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const twoCol = isDesktop || isTablet;
  const busy = analyzing || saving || completingAi;

  const updateMedication = (index: number, patch: Partial<PrescriptionMedication>) => {
    setMedications((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addMedicationRow = () => {
    setMedications((rows) => [...rows, emptyMedication()]);
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
      showAppAlert(
        isRTL ? "فشل الإكمال" : "AI complete failed",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setCompletingAi(false);
    }
  };

  const removeMedicationRow = (index: number) => {
    setMedications((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    if (fileInputRef.current) fileInputRef.current.value = "";

    let dataUri: string;
    try {
      dataUri = await readFileAsDataUrl(file);
    } catch {
      showAppAlert(
        isRTL ? "خطأ في القراءة" : "Read error",
        isRTL ? "تعذّر قراءة الملف. حاول مرة أخرى." : "Could not read the file. Please try again.",
      );
      return;
    }

    const picked: ScanAsset = {
      uri: dataUri,
      mimeType: file.type || "application/octet-stream",
      fileName: file.name || `prescription-${Date.now()}`,
      webFile: file,
    };
    const normalized = normalizePrescriptionScanFile(
      picked.uri,
      picked.mimeType,
      picked.fileName,
    );
    setScanAsset({ ...normalized, webFile: picked.webFile });
    setAnalyzing(true);
    try {
      const extracted = await analyzePrescriptionScan(
        { ...normalized, webFile: picked.webFile },
        accessToken,
        locale,
      );
      if (!extracted.length) {
        showAppAlert(
          isRTL ? "صورة غير واضحة" : "Image not clear enough",
          isRTL
            ? "تعذّر قراءة الروشتة. استخدم صورة واضحة بخط مقروء، أو أضف الأدوية يدويًا."
            : "We couldn't read this prescription. Use a clear photo with readable text, or add medications manually.",
        );
        return;
      }
      setMedications(extracted);
    } catch (e) {
      showAppAlert(
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

  const handleCancel = () => {
    exitAfterSave();
  };

  const handleSave = async () => {
    if (!accessToken || !patientUserId) {
      showAppAlert(
        isRTL ? "خطأ" : "Error",
        isRTL
          ? "تعذّر تحديد المريض. انتظر تحميل الحساب أو سجّل الدخول مرة أخرى."
          : "Could not determine patient. Wait for your account to load or sign in again.",
      );
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showAppAlert(
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
      showAppAlert(
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
          scanAsset.webFile,
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
      showSuccessToast(isRTL ? "تم الحفظ" : "Saved");
      exitAfterSave();
    } catch (e) {
      showAppAlert(
        isRTL ? "فشل الحفظ" : "Save failed",
        e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <Pressable
      testID="save-btn"
      accessibilityRole="button"
      onPress={() => void handleSave()}
      disabled={busy}
      style={[
        styles.saveBtn,
        Platform.OS === "web" && styles.saveBtnWeb,
        { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 },
      ]}
    >
      {saving ? (
        <ActivityIndicator color="#fff" testID="saving-indicator" />
      ) : (
        <Text style={styles.saveBtnText} pointerEvents="none">
          {t.common.save}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.content }]}>
          <View style={[styles.toolbar, { flexDirection: dir }]}>
            <View style={{ flex: 1, gap: 8, minWidth: 0 }}>
              <Pressable onPress={handleCancel} style={[styles.backBtn, { flexDirection: dir }]}>
                {isRTL ? (
                  <ArrowRight size={18} color={colors.primary} />
                ) : (
                  <ArrowLeft size={18} color={colors.primary} />
                )}
                <Text style={[styles.backText, { color: colors.primary }]}>
                  {isRTL ? "رجوع" : "Back"}
                </Text>
              </Pressable>
              <Text style={[styles.pageTitle, { color: colors.foreground, textAlign }]}>
                {isRTL ? "إضافة روشتة" : "Add prescription"}
              </Text>
              <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, textAlign }]}>
                {isRTL
                  ? "راجع الأدوية قبل الحفظ. لن تُحفظ أي بيانات حتى تضغط حفظ."
                  : "Review medications before saving. Nothing is stored until you press Save."}
              </Text>
            </View>
          </View>

          <View style={twoCol ? gridStyle(2) : undefined}>
            <SectionCard
              title={isRTL ? "تفاصيل الروشتة" : "Prescription details"}
              colors={colors}
              textAlign={textAlign}
            >
              <FormField
                label={isRTL ? "العنوان / التشخيص" : "Title / condition"}
                value={title}
                onChange={setTitle}
                placeholder={isRTL ? "مثال: التهاب الحلق" : "e.g. Sore throat"}
                required
                colors={colors}
                textAlign={textAlign}
              />
              {isDoctor && aiEnabled ? (
                <Pressable
                  onPress={() => void completeWithAi()}
                  disabled={!title.trim() || busy}
                  style={[
                    styles.completeAiBtn,
                    {
                      flexDirection: dir,
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}12`,
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
              <FormField
                label={isRTL ? "الأعراض (اختياري)" : "Symptoms (optional)"}
                value={symptoms}
                onChange={setSymptoms}
                placeholder={isRTL ? "صف الأعراض إن وجدت…" : "Describe symptoms if any…"}
                multiline
                colors={colors}
                textAlign={textAlign}
              />
            </SectionCard>

            <SectionCard
              title={isRTL ? "رفع الروشتة" : "Upload prescription"}
              subtitle={
                isRTL
                  ? "صورة واضحة أو PDF — يُحلَّل تلقائيًا عند الإمكان"
                  : "Clear image or PDF — auto-analyzed when possible"
              }
              colors={colors}
              textAlign={textAlign}
            >
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
                    ? "يجب أن تكون الصورة واضحة والخط مقروءًا. الصور الضبابية لا تُقرأ تلقائيًا — استخدم صورة أوضح أو أدخل الأدوية يدويًا."
                    : "The image must be clear with readable text. Blurry photos won't be read automatically — upload a clearer image or enter medications manually."}
                </Text>
              </View>

              <Pressable
                onPress={() => fileInputRef.current?.click()}
                disabled={busy}
                testID="upload-prescription-btn"
                style={[
                  styles.uploadBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    opacity: busy ? 0.6 : 1,
                    flexDirection: dir,
                  },
                ]}
              >
                {analyzing ? (
                  <ActivityIndicator color={colors.primary} testID="analyzing-indicator" />
                ) : (
                  <Upload size={18} color={colors.primary} />
                )}
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                  {analyzing
                    ? isRTL
                      ? "جاري التحليل…"
                      : "Analyzing…"
                    : isRTL
                      ? "رفع صورة أو ملف PDF"
                      : "Upload image or PDF"}
                </Text>
              </Pressable>

              {scanAsset ? (
                <View
                  style={[
                    styles.previewWrap,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  {scanAsset.mimeType.startsWith("image/") ? (
                    <Image
                      source={{ uri: scanAsset.uri }}
                      style={styles.previewImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.pdfPreview, { backgroundColor: colors.muted }]}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                        {isRTL ? "ملف PDF" : "PDF file"}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.previewLabel, { flexDirection: dir }]}>
                    <ImageIcon size={14} color={colors.mutedForeground} />
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 12, flex: 1 }}
                      numberOfLines={1}
                    >
                      {scanAsset.fileName}
                    </Text>
                    <Pressable
                      onPress={() => setScanAsset(null)}
                      hitSlop={8}
                      disabled={busy}
                      testID="remove-scan-btn"
                    >
                      <X size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </SectionCard>
          </View>

          <SectionCard
            title={isRTL ? "الأدوية" : "Medications"}
            subtitle={isRTL ? "أضف دواء واحدًا على الأقل" : "Add at least one medication"}
            colors={colors}
            textAlign={textAlign}
          >
            <Pressable
              onPress={addMedicationRow}
              style={[styles.addRowBtn, { borderColor: colors.border, flexDirection: dir }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                {isRTL ? "إضافة دواء" : "Add medication"}
              </Text>
            </Pressable>

            <View style={twoCol ? gridStyle(2) : styles.medList}>
              {medications.map((med, index) => (
                <View
                  key={`med-${index}`}
                  style={[styles.medCard, { borderColor: colors.border, backgroundColor: colors.background }]}
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

                  <View style={gridStyle(2)}>
                    <FormField
                      label={isRTL ? "اسم الدواء" : "Medication name"}
                      value={med.medication_name}
                      onChange={(value) => updateMedication(index, { medication_name: value })}
                      placeholder={isRTL ? "اسم الدواء" : "Medication name"}
                      required
                      colors={colors}
                      textAlign={textAlign}
                    />
                    <FormField
                      label={isRTL ? "الجرعة" : "Dose"}
                      value={med.dose ?? ""}
                      onChange={(value) => updateMedication(index, { dose: value })}
                      placeholder={isRTL ? "مثال: 500 مج" : "e.g. 500 mg"}
                      colors={colors}
                      textAlign={textAlign}
                    />
                    <FormField
                      label={isRTL ? "التكرار / الفترة" : "Interval / frequency"}
                      value={med.interval ?? ""}
                      onChange={(value) => updateMedication(index, { interval: value })}
                      placeholder={isRTL ? "مثال: مرتين يوميًا" : "e.g. twice daily"}
                      colors={colors}
                      textAlign={textAlign}
                    />
                    <FormField
                      label={isRTL ? "ملاحظات" : "Notes"}
                      value={med.notes ?? ""}
                      onChange={(value) => updateMedication(index, { notes: value })}
                      placeholder={isRTL ? "تعليمات إضافية…" : "Extra instructions…"}
                      multiline
                      colors={colors}
                      textAlign={textAlign}
                    />
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>
        </View>
      </ScrollView>

      <View
        style={[
          styles.stickyFooter,
          { backgroundColor: colors.card, borderTopColor: colors.border, flexDirection: dir },
        ]}
      >
        <Pressable onPress={handleCancel} disabled={busy} style={styles.cancelBtn}>
          <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
            {t.common.cancel}
          </Text>
        </Pressable>
        {saveButton}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0, width: "100%" },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  scrollContentDesktop: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 40,
  },
  container: { width: "100%", gap: 20 },
  toolbar: {
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  backBtn: { alignItems: "center", gap: 8 },
  backText: { fontSize: 14, fontWeight: "600" },
  pageTitle: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  pageSubtitle: { fontSize: 15, lineHeight: 22, maxWidth: 640 },
  saveBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    minWidth: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnWeb: {
    cursor: "pointer",
  } as ViewStyle,
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  sectionHeader: { gap: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { fontSize: 13, lineHeight: 18 },
  field: { gap: 6 },
  completeAiBtn: {
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" },
  scanNote: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  scanNoteText: { fontSize: 13, lineHeight: 19 },
  uploadBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  previewWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: 220 },
  pdfPreview: {
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: {
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  addRowBtn: {
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  medList: { gap: 16 },
  medCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  medCardHead: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  stickyFooter: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    // Pinned height so the Ask AI FAB knows exactly how far to lift.
    minHeight: MEDICAL_FORM_SAVE_BAR_HEIGHT,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
