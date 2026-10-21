import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Camera, FileText, Image as ImageIcon, Plus, ScanLine, Sparkles, X, ZoomIn } from "lucide-react-native";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { navigateBack } from "@/utils/appNavigation";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { useAiEnabled } from "@/domains/ai/aiPreference";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { useAuthStore } from "@/domains/auth/store";
import { getApiLang } from "@/domains/i18n/store";
import {
  analyzeMedicalRecordImage,
  completeDiagnosisWithAi,
  createDiagnosis,
  createPatientMedicalDocument,
  fetchAllMedicalHistory,
  fetchDocumentsForPatientUser,
  fulfillMedicalDocumentRequest,
  uploadFile,
} from "@/domains/medical/api";
import {
  isDocumentScannerAvailable,
  scanDocumentPage,
} from "@/utils/documentScanner";
import { MEDICAL_EVENTS } from "@/domains/medical/events";
import { useMedicalStore } from "@/domains/medical/store";
import type {
  MedicalAiInsight,
  MedicalCategory,
  MedicalRecord,
} from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { emit } from "@/utils/eventBus";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";
import { BodyPartPicker } from "@/components/records/BodyPartPicker";
import { getAddMedicalCategories } from "@/components/records/medicalRecordCategories";
import {
  inferBodyPartFromText,
  parseBodyPart,
  type BodyPart,
} from "@/domains/medical/bodyParts";
import { resolveMedicalOwnerUserId } from "@/domains/medical/ownerUserId";
import {
  newSymptomLine,
  symptomLinesFrom,
  symptomTexts,
  type SymptomLine,
} from "@/utils/symptomLines";

const ATTACHMENT_CATEGORIES: MedicalCategory[] = ["lab", "xray"];

interface AttachedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export default function AddMedicalScreen() {
  const colors = useColors();
  const aiEnabled = useAiEnabled();
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const {
    category: categoryParam,
    patientUserId: patientUserIdParam,
    bodyPart: bodyPartParam,
    requestId: requestIdParam,
  } = useLocalSearchParams<{
    category?: MedicalCategory;
    patientUserId?: string;
    bodyPart?: string;
    requestId?: string;
  }>();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const doctorId = useAuthStore((s) => s.doctorId);
  const add = useMedicalStore((s) => s.add);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);
  const notifyMedicalHistoryChanged = useMedicalStore((s) => s.notifyMedicalHistoryChanged);
  const isDoctor = role?.toLowerCase() === "doctor";
  const selectedPatientUserId = patientUserIdParam?.trim() ?? "";
  const canAddDiagnosis = isDoctor && !!selectedPatientUserId;
  const availableCategories = getAddMedicalCategories(canAddDiagnosis);

  const resolveDefaultCategory = (): MedicalCategory => {
    if (categoryParam && availableCategories.some((c) => c.key === categoryParam)) {
      return categoryParam;
    }
    return canAddDiagnosis ? "diagnosis" : "lab";
  };

  const [category, setCategory] = useState<MedicalCategory>(resolveDefaultCategory);
  const [bodyPart, setBodyPart] = useState<BodyPart>(
    () => parseBodyPart(bodyPartParam) ?? "general",
  );
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [symptomLines, setSymptomLines] = useState<SymptomLine[]>(() => [
    newSymptomLine(),
  ]);
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completingAi, setCompletingAi] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [linkableDocs, setLinkableDocs] = useState<MedicalRecord[]>([]);
  const [loadingLinkable, setLoadingLinkable] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  // The manual form never generates insights — the AI add flow does that.
  const generateAiInsight = false;
  const [draftAiInsight, setDraftAiInsight] = useState<MedicalAiInsight | null>(null);
  const analyzeRunRef = useRef(0);

  const isDiagnosis = category === "diagnosis";
  const isLabOrXray = category === "lab" || category === "xray";
  const linkPatientId = isDoctor && selectedPatientUserId ? selectedPatientUserId : profile?.id;

  useEffect(() => {
    const fromQuery = parseBodyPart(bodyPartParam);
    if (fromQuery) setBodyPart(fromQuery);
  }, [bodyPartParam]);

  useEffect(() => {
    if (categoryParam !== "prescription") return;
    const ownerId = resolveMedicalOwnerUserId(patientUserIdParam, profile?.id);
    const params = new URLSearchParams();
    if (ownerId) params.set("patientUserId", ownerId);
    const part = parseBodyPart(bodyPartParam);
    if (part) params.set("bodyPart", part);
    const qs = params.toString();
    router.replace((qs ? `/medical/prescription/add?${qs}` : "/medical/prescription/add") as never);
  }, [categoryParam, patientUserIdParam, profile?.id, bodyPartParam]);

  useEffect(() => {
    if (!isDiagnosis || !accessToken || !linkPatientId) {
      setLinkableDocs([]);
      setSelectedDocumentIds([]);
      return;
    }
    let cancelled = false;
    setLoadingLinkable(true);
    const load = isDoctor && selectedPatientUserId
      ? fetchDocumentsForPatientUser(selectedPatientUserId, accessToken)
      : fetchAllMedicalHistory(linkPatientId, accessToken, role ?? undefined).then((all) =>
          all.filter((r) => r.category === "lab" || r.category === "xray"),
        );
    Promise.resolve(load)
      .then((docs) => {
        if (cancelled) return;
        const available = docs.filter((d) => d.category === "lab" || d.category === "xray");
        setLinkableDocs(available);
      })
      .catch(() => {
        if (!cancelled) setLinkableDocs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLinkable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    isDiagnosis,
    accessToken,
    linkPatientId,
    isDoctor,
    selectedPatientUserId,
    role,
  ]);

  useEffect(() => {
    if (!isLabOrXray || !generateAiInsight || !attached || !accessToken) {
      setAnalyzingImage(false);
      setDraftAiInsight(null);
      return;
    }
    let cancelled = false;
    const runId = ++analyzeRunRef.current;
    setAnalyzingImage(true);
    void analyzeMedicalRecordImage(
      attached.uri,
      attached.mimeType,
      attached.name,
      accessToken,
      getApiLang(),
      undefined,
      title.trim() ? { title: title.trim() } : undefined,
    )
      .then((analyzed) => {
        if (cancelled || analyzeRunRef.current !== runId) return;
        const locked =
          !!requestIdParam?.trim() &&
          (categoryParam === "lab" || categoryParam === "xray");
        if (!locked) setCategory(analyzed.type);
        const patientTitle = title.trim();
        setTitle(patientTitle || analyzed.title);
        setNotes(analyzed.notes);
        setDraftAiInsight(analyzed.ai_insight);
      })
      .catch((err) => {
        if (cancelled || analyzeRunRef.current !== runId) return;
        setDraftAiInsight(null);
        Alert.alert(
          isRTL ? "تعذر تحليل الصورة" : "Could not analyze image",
          err instanceof Error ? err.message : undefined,
        );
      })
      .finally(() => {
        if (cancelled || analyzeRunRef.current !== runId) return;
        setAnalyzingImage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, attached, generateAiInsight, isLabOrXray, isRTL]);

  const toggleDocumentLink = (docId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };
  const isImage = attached?.mimeType.startsWith("image/") ?? false;

  const handleCategoryChange = (key: MedicalCategory) => {
    if (
      requestIdParam?.trim() &&
      (categoryParam === "lab" || categoryParam === "xray")
    ) {
      return;
    }
    setCategory(key);
    if (!ATTACHMENT_CATEGORIES.includes(key)) setAttached(null);
  };

  const addSymptomLine = () =>
    setSymptomLines((prev) => [...prev, newSymptomLine()]);
  const updateSymptomLine = (id: string, text: string) =>
    setSymptomLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, text } : line)),
    );
  const removeSymptomLine = (id: string) =>
    setSymptomLines((prev) =>
      prev.length <= 1 ? [newSymptomLine()] : prev.filter((line) => line.id !== id),
    );

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access to scan documents.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setAttached({
        uri: asset.uri,
        name: asset.fileName ?? `scan-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setAttached({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  /** Native document scan — deskewed page instead of a raw camera photo. */
  const scanWithCamera = async () => {
    try {
      const page = await scanDocumentPage();
      if (page) setAttached(page);
    } catch (e) {
      Alert.alert(
        "Scan failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    }
  };

  const pickFromFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setAttached({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
      });
    }
  };

  const refetchMedicalHistory = async (ownerId: string) => {
    if (!accessToken) return;
    if (isDoctor && selectedPatientUserId && ownerId === selectedPatientUserId) {
      notifyMedicalHistoryChanged(ownerId);
      return;
    }
    const apiRecords = await fetchAllMedicalHistory(
      ownerId,
      accessToken,
      role ?? undefined,
    );
    setRecordsFromApi(apiRecords, ownerId);
  };

  const completeWithAi = async () => {
    if (!accessToken || !isDiagnosis || !selectedPatientUserId) return;
    const desc = title.trim();
    if (!desc || completingAi || uploading) return;
    setCompletingAi(true);
    try {
      const result = await completeDiagnosisWithAi(
        { patient_id: selectedPatientUserId, desc, lang: getApiLang() },
        accessToken,
      );
      const symptoms = result.symptoms.map((s) => s.desc).filter(Boolean);
      setSymptomLines(symptomLinesFrom(symptoms));
      setSelectedDocumentIds(result.document_ids ?? []);
      const linkedTitles = linkableDocs
        .filter((d) => (result.document_ids ?? []).includes(d.id))
        .map((d) => d.title);
      const fromAi = parseBodyPart(result.body_part);
      const part =
        fromAi && fromAi !== "general"
          ? fromAi
          : inferBodyPartFromText(desc, ...symptoms, ...linkedTitles) ?? fromAi;
      if (part) setBodyPart(part);
    } catch (e) {
      Alert.alert(isRTL ? "فشل الإكمال" : "AI complete failed", (e as Error).message);
    } finally {
      setCompletingAi(false);
    }
  };

  const submit = async () => {
    if (!profile || !accessToken) {
      Alert.alert("Sign in first");
      return;
    }
    if (analyzingImage) {
      Alert.alert(
        isRTL ? "يرجى الانتظار" : "Please wait",
        isRTL
          ? "جارٍ تحليل الصورة لاستخراج العنوان والوصف."
          : "Image analysis is still extracting the title and description.",
      );
      return;
    }
    if (isDiagnosis) {
      if (!canAddDiagnosis || !doctorId) {
        Alert.alert(
          "Not allowed",
          "Only a doctor can add a diagnosis. Please consult your doctor.",
        );
        return;
      }
      if (!title.trim()) {
        Alert.alert("Description required", "Enter a diagnosis description.");
        return;
      }
      const symptoms = symptomTexts(symptomLines);
      const documentIds =
        selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined;
      setUploading(true);
      try {
        await createDiagnosis(
          {
            desc: title.trim(),
            patient_id: selectedPatientUserId,
            doctor_id: doctorId,
            symptoms: symptoms.map((desc) => ({ desc })),
            document_ids: documentIds,
            body_part: bodyPart,
          },
          accessToken,
        );
        await refetchMedicalHistory(selectedPatientUserId);
        setUploading(false);
        navigateBack(router, "/(tabs)/records");
      } catch (e) {
        setUploading(false);
        Alert.alert("Save failed", (e as Error).message);
      }
      return;
    }

    if (isLabOrXray) {
      if (!attached) {
        Alert.alert("Image required", "Take a photo or choose one from your gallery.");
        return;
      }
      if (!generateAiInsight && !title.trim()) {
        Alert.alert("Title required", "Please enter a title for this record.");
        return;
      }
      if (!generateAiInsight && !notes.trim()) {
        Alert.alert("Description required", "Please enter a description for this record.");
        return;
      }
      if (isDoctor && !selectedPatientUserId) {
        Alert.alert(
          "Patient required",
          "Open this form from a patient's medical record to add this document.",
        );
        return;
      }
      setUploading(true);
      try {
        let resolvedTitle = title.trim();
        let resolvedNotes = notes.trim();
        let resolvedInsight = draftAiInsight ?? undefined;

        if (generateAiInsight && !resolvedInsight) {
          const analyzed = await analyzeMedicalRecordImage(
            attached.uri,
            attached.mimeType,
            attached.name,
            accessToken,
            getApiLang(),
            undefined,
            resolvedTitle ? { title: resolvedTitle } : undefined,
          );
          resolvedTitle = resolvedTitle || analyzed.title;
          resolvedNotes = analyzed.notes;
          resolvedInsight = analyzed.ai_insight;
          setDraftAiInsight(analyzed.ai_insight);
          setTitle(resolvedTitle);
          setNotes(analyzed.notes);
        }

        const uploaded = await uploadFile(
          attached.uri,
          attached.mimeType,
          attached.name,
          accessToken,
        );
        const fileName =
          uploaded.objectPath.split("/").pop() ??
          attached.name ??
          `upload-${Date.now()}.jpg`;
        const docPayload = {
          type: category as "lab" | "xray",
          file_url: uploaded.url,
          file_name: fileName,
          notes: resolvedNotes,
          title: resolvedTitle,
          ai_insight: resolvedInsight,
          generate_ai_insight: generateAiInsight,
          lang: getApiLang(),
          body_part: bodyPart,
        };
        const saved =
          isDoctor && selectedPatientUserId
            ? await createPatientMedicalDocument(
                { ...docPayload, patient_user_id: selectedPatientUserId },
                accessToken,
              )
            : await createPatientMedicalDocument(docPayload, accessToken);
        const requestId = requestIdParam?.trim();
        if (requestId && saved?.id) {
          try {
            await fulfillMedicalDocumentRequest(requestId, saved.id, accessToken);
            emit(MEDICAL_EVENTS.DOCUMENT_REQUEST_FULFILLED, { requestId });
          } catch (fulfillErr) {
            Alert.alert(
              isRTL ? "تم حفظ النتيجة" : "Result saved",
              fulfillErr instanceof Error
                ? fulfillErr.message
                : isRTL
                  ? "تعذر إغلاق الطلب — أعد المحاولة من الطلبات المعلقة."
                  : "Could not close the request — retry from Pending requests.",
            );
          }
        }
        await refetchMedicalHistory(
          isDoctor && selectedPatientUserId ? selectedPatientUserId : profile.id,
        );
        setUploading(false);
        navigateBack(router, "/(tabs)/records");
      } catch (e) {
        setUploading(false);
        Alert.alert("Save failed", (e as Error).message);
      }
      return;
    }

    if (!title.trim()) {
      Alert.alert("Title required");
      return;
    }

    add({
      ownerId: profile.id,
      category,
      title: title.trim(),
      value: value.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    navigateBack(router, "/(tabs)/records");
  };

  if (categoryParam === "prescription") return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            flexDirection: dir,
          },
        ]}
      >
        <AppBackButton
          color={colors.foreground}
          style={{ padding: 4 }}
          fallback="/(tabs)/records"
        />
        <Text style={[styles.headerTitle, { color: colors.foreground, textAlign }]}>
          {isDiagnosis
            ? isRTL
              ? "إضافة تشخيص"
              : "Add diagnosis"
            : isLabOrXray
              ? category === "lab"
                ? isRTL
                  ? "إضافة نتيجة مختبر"
                  : "Add lab result"
                : isRTL
                  ? "إضافة أشعة"
                  : "Add X-ray"
              : isRTL
                ? "إضافة للسجل"
                : "Add to history"}
        </Text>
        <Pressable onPress={submit} disabled={uploading || analyzingImage} style={{ padding: 4 }}>
          {uploading || analyzingImage ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.save, { color: colors.primary }]}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardSafeScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* ── Category ── */}
        {!categoryParam && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
            <View style={styles.catRow}>
              {availableCategories.map((c) => {
            const sel = category === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => handleCategoryChange(c.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: sel ? colors.primary : colors.card,
                    borderColor: sel ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: sel ? "#fff" : colors.foreground, fontWeight: "600", fontSize: 13 }}>
                  {isRTL ? c.labelAr : c.labelEn}
                </Text>
              </Pressable>
            );
              })}
            </View>
          </>
        )}

        <BodyPartPicker value={bodyPart} onChange={setBodyPart} />

        {isDiagnosis ? (
          <>
            <Field
              label={isRTL ? "التشخيص" : "Diagnosis"}
              value={title}
              onChange={setTitle}
              placeholder={isRTL ? "مثال: التهاب الشعب الهوائية" : "e.g. Acute bronchitis"}
              colors={colors}
              textAlign={textAlign}
              multiline
            />
            <Pressable
              onPress={() => void completeWithAi()}
              disabled={!title.trim() || completingAi || uploading}
              style={[
                styles.addSymptomBtn,
                {
                  flexDirection: dir,
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}12`,
                  opacity: !title.trim() || completingAi || uploading ? 0.55 : 1,
                  marginBottom: 12,
                  display: aiEnabled ? "flex" : "none",
                },
              ]}
            >
              {completingAi ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Sparkles size={16} color={colors.primary} />
              )}
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
                {isRTL ? "أكمل بالذكاء الاصطناعي" : "Complete with AI"}
              </Text>
            </Pressable>
            <Text style={[styles.label, { color: colors.foreground, textAlign }]}>
              {isRTL ? "الأعراض " : "Symptoms "}
              <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>
                {isRTL ? "(اختياري)" : "(optional)"}
              </Text>
            </Text>
            {symptomLines.map((line, index) => (
              <View key={line.id} style={[styles.symptomRow, { flexDirection: dir }]}>
                <AppTextInput
                  value={line.text}
                  onChangeText={(t) => updateSymptomLine(line.id, t)}
                  placeholder={isRTL ? `عرض ${index + 1}` : `Symptom ${index + 1}`}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    styles.symptomInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                      textAlign,
                    },
                  ]}
                />
                <Pressable
                  onPress={() => removeSymptomLine(line.id)}
                  style={[styles.symptomRemove, { backgroundColor: colors.muted }]}
                >
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={addSymptomLine}
              style={[styles.addSymptomBtn, { borderColor: colors.border, flexDirection: dir }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                {isRTL ? "إضافة عرض" : "Add symptom"}
              </Text>
            </Pressable>

            <Text style={[styles.label, { color: colors.foreground, textAlign, marginTop: 8 }]}>
              {isRTL ? "ربط نتائج المختبر / الأشعة" : "Link lab results / X-rays"}
              <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>
                {isRTL ? " (اختياري)" : " (optional)"}
              </Text>
            </Text>
            {loadingLinkable ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
            ) : linkableDocs.length === 0 ? (
              <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign }}>
                {isRTL
                  ? "لا توجد نتائج مختبر أو أشعة غير مرتبطة."
                  : "No lab results or X-rays available."}
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {linkableDocs.map((doc) => {
                  const selected = selectedDocumentIds.includes(doc.id);
                  const catLabel =
                    doc.category === "lab"
                      ? isRTL
                        ? "مختبر"
                        : "Lab"
                      : isRTL
                        ? "أشعة"
                        : "X-ray";
                  return (
                    <Pressable
                      key={doc.id}
                      onPress={() => toggleDocumentLink(doc.id)}
                      style={[
                        styles.linkRow,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected
                            ? colors.primary + "12"
                            : colors.card,
                          flexDirection: dir,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.linkCheck,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary : "transparent",
                          },
                        ]}
                      >
                        {selected ? (
                          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>
                            ✓
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{ color: colors.foreground, fontWeight: "700", textAlign }}
                          numberOfLines={1}
                        >
                          {doc.title}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign }}>
                          {catLabel}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : isLabOrXray ? (
          <>
            <Field
              label={isRTL ? "العنوان" : "Title"}
              value={title}
              onChange={setTitle}
              placeholder={
                category === "lab"
                  ? isRTL
                    ? "مثال: CBC، فيتامين د"
                    : "e.g. CBC, Vitamin D"
                  : isRTL
                    ? "مثال: أشعة الصدر"
                    : "e.g. Chest X-ray"
              }
              colors={colors}
              textAlign={textAlign}
              required={!generateAiInsight}
            />
            <Field
              label={isRTL ? "الوصف" : "Description"}
              value={notes}
              onChange={setNotes}
              placeholder={isRTL ? "صف النتيجة أو الملاحظات…" : "Describe the result or findings…"}
              multiline
              colors={colors}
              textAlign={textAlign}
              required={!generateAiInsight}
            />
          </>
        ) : (
          <>
            <Field label="Title" value={title} onChange={setTitle} placeholder="e.g. Smoking history" colors={colors} />
            <Field label="Value (optional)" value={value} onChange={setValue} placeholder="e.g. Non-smoker" colors={colors} />
            <Field label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Any extra context" multiline colors={colors} />
          </>
        )}

        {/* ── Image (lab / xray) ── */}
        {isLabOrXray && (
          <View style={{ gap: 10 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Image <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>

            {attached ? (
              <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Image thumbnail or PDF icon */}
                {isImage ? (
                  <Pressable onPress={() => setZoomVisible(true)} style={styles.thumbnailWrap}>
                    <Image source={{ uri: attached.uri }} style={styles.thumbnail} resizeMode="cover" />
                    <View style={styles.zoomBadge}>
                      <ZoomIn size={14} color="#fff" />
                    </View>
                  </Pressable>
                ) : (
                  <View style={[styles.docIconWrap, { backgroundColor: colors.muted }]}>
                    <FileText size={36} color={colors.primary} />
                  </View>
                )}

                {/* Filename + remove */}
                <View style={styles.previewFooter}>
                  <Text style={{ flex: 1, color: colors.foreground, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                    {attached.name}
                  </Text>
                  <Pressable
                    onPress={() => setAttached(null)}
                    hitSlop={8}
                    style={[styles.removeBtn, { backgroundColor: colors.muted }]}
                  >
                    <X size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.pickRow}>
                <Pressable
                  onPress={pickFromCamera}
                  style={[styles.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Camera size={18} color={colors.primary} />
                  <Text style={[styles.pickBtnText, { color: colors.foreground }]}>Camera</Text>
                </Pressable>
                <Pressable
                  onPress={pickFromGallery}
                  style={[styles.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <ImageIcon size={18} color={colors.primary} />
                  <Text style={[styles.pickBtnText, { color: colors.foreground }]}>Gallery</Text>
                </Pressable>
                {isDocumentScannerAvailable ? (
                  <Pressable
                    onPress={scanWithCamera}
                    style={[styles.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <ScanLine size={18} color={colors.primary} />
                    <Text style={[styles.pickBtnText, { color: colors.foreground }]}>Scan</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
            {!attached && (
              <Pressable onPress={pickFromFiles} style={{ alignSelf: "flex-start" }}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>
                  Or pick a PDF / file
                </Text>
              </Pressable>
            )}

            {(uploading || analyzingImage) && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {analyzingImage ? "Analyzing image…" : "Uploading document…"}
                </Text>
              </View>
            )}
          </View>
        )}
      </KeyboardSafeScrollView>

      {/* ── Full-screen zoom modal ── */}
      {attached && isImage && (
        <Modal
          visible={zoomVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomVisible(false)}
          statusBarTranslucent
        >
          <View style={styles.zoomBackdrop}>
            <Pressable style={[styles.zoomCloseBtn, { top: insets.top + 12 }]} onPress={() => setZoomVisible(false)}>
              <X size={20} color="#fff" />
            </Pressable>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.zoomScrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
            >
              <Image
                source={{ uri: attached.uri }}
                style={{ width: screenWidth, height: screenHeight * 0.88 }}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  required,
  colors,
  textAlign = "left",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  colors: ReturnType<typeof useColors>;
  textAlign?: "left" | "right";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.foreground, textAlign }]}>
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
          multiline && { minHeight: 100, textAlignVertical: "top" },
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
            textAlign,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  save: { fontSize: 15, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700" },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  insightCard: {
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  insightCheck: { color: "#fff", fontSize: 12, fontWeight: "800" },
  insightContent: { flex: 1, minWidth: 0, gap: 4 },
  insightTitle: { fontSize: 14, fontWeight: "700" },
  insightDescription: { fontSize: 13, lineHeight: 18 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  symptomRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  symptomInput: { flex: 1 },
  symptomRemove: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addSymptomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  linkRow: {
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  pickRow: { flexDirection: "row", gap: 10 },
  pickBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  pickBtnText: { fontSize: 13, fontWeight: "600" },

  previewCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  thumbnailWrap: { position: "relative" },
  thumbnail: { width: "100%", height: 200 },
  zoomBadge: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8,
    padding: 5,
  },
  docIconWrap: {
    height: 120, alignItems: "center", justifyContent: "center",
  },
  previewFooter: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  removeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  uploadingRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    justifyContent: "center", paddingVertical: 8,
  },

  zoomBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  zoomCloseBtn: {
    position: "absolute", right: 16, zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
  },
  zoomScrollContent: { flex: 1, alignItems: "center", justifyContent: "center" },
});
