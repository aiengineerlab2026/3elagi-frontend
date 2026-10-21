import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { showAppAlert } from "@/utils/appAlert";
import { leaveMedicalForm } from "@/utils/medicalFormNavigation";
import { showSuccessToast } from "@/utils/toast";
import { emit } from "@/utils/eventBus";
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
import { MEDICAL_EVENTS } from "@/domains/medical/events";
import { useMedicalStore } from "@/domains/medical/store";
import {
  inferBodyPartFromText,
  parseBodyPart,
  type BodyPart,
} from "@/domains/medical/bodyParts";
import type {
  MedicalAiInsight,
  MedicalCategory,
  MedicalRecord,
} from "@/domains/medical/types";
import { useI18n } from "@/hooks/useI18n";
import { getAddMedicalCategories } from "@/components/records/medicalRecordCategories";
import { isDoctorAddingForPatient, resolveMedicalOwnerUserId } from "@/domains/medical/ownerUserId";
import {
  isDocumentScannerAvailable,
  scanDocumentPage,
} from "@/utils/documentScanner";
import {
  newSymptomLine,
  symptomLinesFrom,
  symptomTexts,
  type SymptomLine,
} from "@/utils/symptomLines";

const ATTACHMENT_CATEGORIES: MedicalCategory[] = ["lab", "xray"];

export interface AttachedFile {
  uri: string;
  name: string;
  mimeType: string;
  webFile?: File;
}

export function useMedicalAddForm() {
  const { isRTL } = useI18n();
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
  const ownerUserId = resolveMedicalOwnerUserId(patientUserIdParam, profile?.id);
  const doctorAddingForPatient = isDoctorAddingForPatient(role, patientUserIdParam, profile?.id);
  const canAddDiagnosis = isDoctor && !!selectedPatientUserId;
  const availableCategories = getAddMedicalCategories(canAddDiagnosis).map((c) => c.key);

  const resolveDefaultCategory = (): MedicalCategory => {
    if (categoryParam && availableCategories.includes(categoryParam as MedicalCategory)) {
      return categoryParam as MedicalCategory;
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
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [completingAi, setCompletingAi] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [linkableDocs, setLinkableDocs] = useState<MedicalRecord[]>([]);
  const [loadingLinkable, setLoadingLinkable] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  // The manual form never generates insights — the AI add flow does that.
  const generateAiInsight = false;
  const [draftAiInsight, setDraftAiInsight] = useState<MedicalAiInsight | null>(null);

  const isDiagnosis = category === "diagnosis";
  const isLabOrXray = category === "lab" || category === "xray";
  const isImage = attached?.mimeType.startsWith("image/") ?? false;
  const linkPatientId = isDoctor && selectedPatientUserId ? selectedPatientUserId : profile?.id;
  const hasCategoryParam =
    !!categoryParam && availableCategories.includes(categoryParam as MedicalCategory);
  const analyzeRunRef = useRef(0);

  useEffect(() => {
    const fromQuery = parseBodyPart(bodyPartParam);
    if (fromQuery) setBodyPart(fromQuery);
  }, [bodyPartParam]);

  useEffect(() => {
    if (!isDiagnosis || !accessToken || !linkPatientId) {
      setLinkableDocs([]);
      setSelectedDocumentIds([]);
      return;
    }
    let cancelled = false;
    setLoadingLinkable(true);
    const load =
      isDoctor && selectedPatientUserId
        ? fetchDocumentsForPatientUser(selectedPatientUserId, accessToken)
        : fetchAllMedicalHistory(linkPatientId, accessToken, role ?? undefined).then((all) =>
            all.filter((r) => r.category === "lab" || r.category === "xray"),
          );
    Promise.resolve(load)
      .then((docs) => {
        if (cancelled) return;
        setLinkableDocs(docs.filter((d) => d.category === "lab" || d.category === "xray"));
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
  }, [isDiagnosis, accessToken, linkPatientId, isDoctor, selectedPatientUserId, role]);

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
      attached.webFile,
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
        showAppAlert(
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
  }, [attached, accessToken, generateAiInsight, isLabOrXray, isRTL]);

  const toggleDocumentLink = (docId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId],
    );
  };

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
      showAppAlert("Permission required", "Please allow camera access to scan documents.");
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
      showAppAlert("Permission required", "Please allow photo library access.");
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

  /** Native document scan — deskewed, cropped page instead of a raw photo. */
  const scanWithCamera = async () => {
    try {
      const page = await scanDocumentPage();
      if (page) setAttached(page);
    } catch (e) {
      showAppAlert(
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
    const apiRecords = await fetchAllMedicalHistory(ownerId, accessToken, role ?? undefined);
    setRecordsFromApi(apiRecords, ownerId);
  };

  const exitAfterSave = () => {
    const fallback =
      isDoctor && selectedPatientUserId
        ? (`/patients/${selectedPatientUserId}` as `/patients/${string}`)
        : "/(tabs)/records";
    leaveMedicalForm(fallback);
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
      showAppAlert(isRTL ? "فشل الإكمال" : "AI complete failed", (e as Error).message);
    } finally {
      setCompletingAi(false);
    }
  };

  const submit = async () => {
    if (!profile || !accessToken) {
      showAppAlert("Sign in first");
      return;
    }
    if (analyzingImage) {
      showAppAlert(
        isRTL ? "يرجى الانتظار" : "Please wait",
        isRTL
          ? "جارٍ تحليل الصورة لاستخراج العنوان والوصف."
          : "Image analysis is still extracting the title and description.",
      );
      return;
    }
    if (isDiagnosis) {
      if (!canAddDiagnosis || !doctorId) {
        showAppAlert(
          isRTL ? "غير مسموح" : "Not allowed",
          isRTL
            ? "التشخيص يضيفه الطبيب فقط. يرجى مراجعة طبيبك."
            : "Only a doctor can add a diagnosis. Please consult your doctor.",
        );
        return;
      }
      if (!title.trim()) {
        showAppAlert(
          isRTL ? "الوصف مطلوب" : "Description required",
          isRTL ? "أدخل وصف التشخيص." : "Enter a diagnosis description.",
        );
        return;
      }
      const symptoms = symptomTexts(symptomLines);
      const documentIds = selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined;
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
        showSuccessToast(isRTL ? "تم الحفظ" : "Saved");
        exitAfterSave();
      } catch (e) {
        setUploading(false);
        showAppAlert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
      }
      return;
    }

    if (isLabOrXray) {
      if (!attached) {
        showAppAlert(
          isRTL ? "الصورة مطلوبة" : "Image required",
          isRTL ? "التقط صورة أو اختر واحدة من المعرض." : "Take a photo or choose one from your gallery.",
        );
        return;
      }
      if (!generateAiInsight && !title.trim()) {
        showAppAlert(
          isRTL ? "العنوان مطلوب" : "Title required",
          isRTL ? "أدخل عنوانًا لهذا السجل." : "Please enter a title for this record.",
        );
        return;
      }
      if (!generateAiInsight && !notes.trim()) {
        showAppAlert(
          isRTL ? "الوصف مطلوب" : "Description required",
          isRTL ? "أدخل وصفًا لهذا السجل." : "Please enter a description for this record.",
        );
        return;
      }
      if (!ownerUserId || !profile?.id) {
        showAppAlert(
          isRTL ? "خطأ" : "Error",
          isRTL ? "تعذّر تحديد المريض. سجّل الدخول وحاول مرة أخرى." : "Could not determine patient. Sign in and try again.",
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
            attached.webFile,
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
          attached.webFile,
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
        const saved = doctorAddingForPatient
          ? await createPatientMedicalDocument(
              { ...docPayload, patient_user_id: ownerUserId },
              accessToken,
            )
          : await createPatientMedicalDocument(docPayload, accessToken);
        const requestId = requestIdParam?.trim();
        if (requestId && saved?.id) {
          try {
            await fulfillMedicalDocumentRequest(requestId, saved.id, accessToken);
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
        await refetchMedicalHistory(
          doctorAddingForPatient ? ownerUserId : profile.id,
        );
        setUploading(false);
        showSuccessToast(isRTL ? "تم الحفظ" : "Saved");
        exitAfterSave();
      } catch (e) {
        setUploading(false);
        showAppAlert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
      }
      return;
    }

    if (!title.trim()) {
      showAppAlert(isRTL ? "العنوان مطلوب" : "Title required");
      return;
    }

    add({
      ownerId: profile.id,
      category,
      title: title.trim(),
      value: value.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    showSuccessToast(isRTL ? "تم الحفظ" : "Saved");
    exitAfterSave();
  };

  const pageTitle = isDiagnosis
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
        : "Add to history";

  const pageSubtitle = isDiagnosis
    ? isRTL
      ? "أدخل التشخيص والأعراض واربط نتائج المختبر أو الأشعة إن وجدت."
      : "Enter the diagnosis, optional symptoms, and link any lab or imaging results."
    : isLabOrXray
      ? isRTL
        ? "أضف العنوان والوصف وارفع صورة النتيجة."
        : "Add a title, description, and upload the result image."
      : isRTL
        ? "أضف معلومات فحص الاستقبال إلى سجلك."
        : "Add intake exam information to your record.";

  return {
    isRTL,
    category,
    setCategory: handleCategoryChange,
    hasCategoryParam,
    availableCategories,
    bodyPart,
    setBodyPart,
    title,
    setTitle,
    value,
    setValue,
    notes,
    setNotes,
    symptomLines,
    addSymptomLine,
    updateSymptomLine,
    removeSymptomLine,
    attached,
    setAttached,
    uploading,
    analyzingImage,
    zoomVisible,
    setZoomVisible,
    linkableDocs,
    loadingLinkable,
    selectedDocumentIds,
    toggleDocumentLink,
    isDiagnosis,
    isLabOrXray,
    isImage,
    generateAiInsight,
    pickFromCamera,
    pickFromGallery,
    pickFromFiles,
    scanWithCamera,
    canScanDocuments: isDocumentScannerAvailable,
    completeWithAi,
    completingAi,
    submit,
    pageTitle,
    pageSubtitle,
    goBack: () => {
      const fallback =
        isDoctor && selectedPatientUserId
          ? (`/patients/${selectedPatientUserId}` as `/patients/${string}`)
          : "/(tabs)/records";
      leaveMedicalForm(fallback);
    },
  };
}
