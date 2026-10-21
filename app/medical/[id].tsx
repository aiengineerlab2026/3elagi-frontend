import { router, useLocalSearchParams } from "expo-router";
import {
  Activity,
  Beaker,
  Bone,
  Calendar,
  ClipboardList,
  FileDown,
  FileText,
  Hash,
  MessageCircle,
  Pill,
  ScanLine,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { navigateBack } from "@/utils/appNavigation";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardSafeScrollView } from "@/components/KeyboardSafeScrollView";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { MedicalPdfViewer, type MedicalPdfView } from "@/components/medical/MedicalPdfViewer";
import { confirmDestructiveAction } from "@/utils/confirmDestructiveAction";
import { useAuthStore } from "@/domains/auth/store";
import {
  canDoctorViewPatientRecords,
  fetchDoctorPatientAccess,
  type DoctorPatientAccessStatus,
} from "@/domains/chat/access";
import {
  addSymptomToDiagnosis,
  deletePatientMedicalDocument,
  fetchAllMedicalHistory,
  fetchDiagnosisById,
  fetchDoctorDiagnosisById,
  findDoctorRecordById,
  fetchDocumentsForPatientUser,
  fetchPatientDocuments,
  fetchPrescriptionById,
  fetchPrescriptionPdf,
  generateMedicalRecordAiInsight,
  generateMedicalRecordDetails,
  updateDiagnosis,
  updatePatientMedicalDocument,
} from "@/domains/medical/api";
import { readRouteParam } from "@/utils/routeParams";
import {
  deleteIntakeExamInstance,
  fetchIntakeExamInstance,
  mapInstance,
  resetIntakeExamAnswers,
  saveIntakeExamAnswers,
} from "@/domains/intake-exams/api";
import { DoctorPatientAccessDenied } from "@/components/DoctorPatientAccessDenied";
import {
  IntakeExamTaker,
  type IntakeExamTakerHandle,
} from "@/components/intake/IntakeExamTaker";
import { MedicalRecordAiInsightSection } from "@/components/medical/MedicalRecordAiInsightSection";
import { MedicalRecordAttachmentImage } from "@/components/medical/MedicalRecordAttachmentImage";
import { isMedicalImageAttachment, isMedicalPdfAttachment } from "@/components/medical/medicalRecordMeta";
import { useMedicalStore } from "@/domains/medical/store";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import {
  linkedDiagnosesForRecord,
  recordShowsLinkedDiagnoses,
} from "@/domains/medical/linkedDiagnoses";
import {
  canAddDiagnosisSymptom,
  canDeleteMedicalRecord,
  canEditDiagnosis,
} from "@/domains/medical/permissions";

function openLinkedMedicalRecord(
  recordId: string,
  opts: { isDoctorView: boolean; patientUserId?: string },
) {
  if (opts.isDoctorView && opts.patientUserId) {
    router.push({
      pathname: "/medical/[id]",
      params: { id: recordId, doctorView: "1", patientUserId: opts.patientUserId },
    });
    return;
  }
  router.push(`/medical/${recordId}`);
}
import { useColors } from "@/hooks/useColors";
import type { LinkedConsultationSummary } from "@/domains/medical/types";
import { useApiLang } from "@/hooks/useApiLang";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow, localeTag } from "@/utils/rtl";
import { showAppAlert } from "@/utils/appAlert";
import { openBlankPdfTab, openPdfInNewTab } from "@/utils/openPdfInNewTab";
import { showSuccessToast } from "@/utils/toast";

const CATEGORY_META: Record<
  MedicalCategory,
  { labelEn: string; labelAr: string; Icon: typeof Activity; color: string }
> = {
  diagnosis: { labelEn: "Diagnosis",   labelAr: "التشخيص",       Icon: Activity,     color: "#ef4444" },
  lab:     { labelEn: "Lab Result",  labelAr: "نتائج المختبر",  Icon: Beaker,       color: "#10b981" },
  xray:    { labelEn: "X-ray / Scan",labelAr: "الأشعة والمسح", Icon: ScanLine,     color: "#8b5cf6" },
  prescription: { labelEn: "Prescription", labelAr: "روشتة", Icon: Pill, color: "#f59e0b" },
  intake:  { labelEn: "Intake Exam", labelAr: "فحص الاستقبال", Icon: ClipboardList, color: "#3057F2" },
};

function consultationStatusLabel(
  status: LinkedConsultationSummary["status"],
  t: ReturnType<typeof useI18n>["t"],
): string {
  switch (status) {
    case "open":
      return t.consultations.open;
    case "pending":
      return t.consultations.waitingActive;
    case "ended":
      return t.consultations.completed;
    case "cancelled":
    case "rejected":
      return t.consultations.cancelled;
    default:
      return status;
  }
}

export default function MedicalRecordDetail() {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const apiLang = useApiLang();
  const insets = useSafeAreaInsets();
  const routeParams = useLocalSearchParams<{
    id?: string | string[];
    doctorView?: string | string[];
    patientUserId?: string | string[];
  }>();
  const id = readRouteParam(routeParams.id);
  const doctorView = readRouteParam(routeParams.doctorView);
  const patientUserId = readRouteParam(routeParams.patientUserId) || undefined;

  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const doctorId = useAuthStore((s) => s.doctorId);
  const isDoctorView = doctorView === "1";
  const isDoctorRole = role?.toLowerCase() === "doctor";
  const records = useMedicalStore((s) => s.records);
  const remove = useMedicalStore((s) => s.remove);
  const upsertDiagnosis = useMedicalStore((s) => s.upsertDiagnosis);
  const upsertPrescription = useMedicalStore((s) => s.upsertPrescription);
  const upsertDocument = useMedicalStore((s) => s.upsertDocument);
  const upsertIntake = useMedicalStore((s) => s.upsertIntake);
  const setRecordsFromApi = useMedicalStore((s) => s.setRecordsFromApi);
  const notifyMedicalHistoryChanged = useMedicalStore((s) => s.notifyMedicalHistoryChanged);
  const intakeDraftDirtyRef = useRef(false);
  const intakeAnswersDraftRef = useRef<Record<string, string[]>>({});
  const intakeExamTakerRef = useRef<IntakeExamTakerHandle | null>(null);
  /** Bumped to ignore in-flight instance fetches after a local save/reset. */
  const intakeLoadSeqRef = useRef(0);
  const [detail, setDetail] = useState<MedicalRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "done">("loading");
  const [newSymptom, setNewSymptom] = useState("");
  const [addingSymptom, setAddingSymptom] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editingDiagnosis, setEditingDiagnosis] = useState(false);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  const [pdfView, setPdfView] = useState<MedicalPdfView | null>(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [intakeAnswersDraft, setIntakeAnswersDraft] = useState<Record<string, string[]>>({});
  const [savingIntake, setSavingIntake] = useState(false);
  const [editingLabDetails, setEditingLabDetails] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingLabDetails, setSavingLabDetails] = useState(false);
  const [generatingDetails, setGeneratingDetails] = useState(false);
  const [printingPrescription, setPrintingPrescription] = useState(false);
  const [accessStatus, setAccessStatus] = useState<DoctorPatientAccessStatus | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  const needsDoctorAccess = isDoctorView && !!patientUserId;
  const hasDoctorAccess =
    !needsDoctorAccess || canDoctorViewPatientRecords(accessStatus);

  const cached = records.find((r) => r.id === id);
  const record = hasDoctorAccess ? detail ?? cached : null;
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  useEffect(() => {
    if (!needsDoctorAccess || !accessToken || !patientUserId) {
      setAccessChecked(true);
      setAccessStatus(null);
      return;
    }
    setAccessChecked(false);
    void fetchDoctorPatientAccess(accessToken, patientUserId)
      .then(setAccessStatus)
      .catch(() => setAccessStatus(null))
      .finally(() => setAccessChecked(true));
  }, [needsDoctorAccess, accessToken, patientUserId]);

  // Only reset when navigating to a different record — not when the list refreshes.
  useEffect(() => {
    intakeDraftDirtyRef.current = false;
    setDetail(null);
    setIntakeAnswersDraft({});
    const hit = records.find((r) => r.id === id);
    if (hit?.category === "intake" && hit.intakeExam) {
      setIntakeAnswersDraft(hit.intakeExam.answers ?? {});
    }
    setLoadState(hit && hasDoctorAccess ? "done" : "loading");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed from current cache on id change only
  }, [id]);

  useEffect(() => {
    if (!id || !accessToken) {
      setLoadState("done");
      return;
    }
    if (!hasDoctorAccess) {
      if (accessChecked) setLoadState("done");
      return;
    }

    const cacheOnly =
      cached &&
      cached.category !== "intake" &&
      (isDoctorView
        ? false
        : cached.category === "lab" ||
          cached.category === "xray" ||
          cached.category === "prescription");

    if (cacheOnly) {
      setLoadState("done");
      return;
    }

    if (!cached) setLoadState("loading");
    setLoadingDetail(true);

    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      setLoadingDetail(false);
      setLoadState("done");
    };

    const applyIntake = (
      raw: Awaited<ReturnType<typeof fetchIntakeExamInstance>>,
      seq: number,
    ) => {
      const mapped = mapInstance(raw);
      if (cancelled || seq !== intakeLoadSeqRef.current) return mapped;
      setDetail(mapped);
      upsertIntake(mapped);
      if (!intakeDraftDirtyRef.current) {
        setIntakeAnswersDraft(mapped.intakeExam?.answers ?? {});
      }
      return mapped;
    };

    const loadIntakeInstance = () => {
      const seq = ++intakeLoadSeqRef.current;
      return fetchIntakeExamInstance(id, accessToken)
        .then((raw) => applyIntake(raw, seq))
        .then(() => true)
        .catch(() => false);
    };

    if (cached?.category === "intake" || records.find((r) => r.id === id)?.category === "intake") {
      if (cached?.intakeExam?.answers && !intakeDraftDirtyRef.current) {
        setIntakeAnswersDraft(cached.intakeExam.answers);
      }
      void loadIntakeInstance().finally(finish);
      return () => {
        cancelled = true;
      };
    }

    if (isDoctorView) {
      // Patient profile history is local state, so intake often isn't in the store.
      void (async () => {
        if (await loadIntakeInstance()) {
          finish();
          return;
        }
        if (cached?.category === "prescription" && patientUserId) {
          try {
            const rx = await fetchPrescriptionById(id, patientUserId, accessToken);
            if (rx && !cancelled) {
              setDetail(rx);
              upsertPrescription(rx);
            }
          } catch {
            // continue
          }
          finish();
          return;
        }
        try {
          const d = await fetchDoctorDiagnosisById(id, accessToken);
          if (!cancelled) {
            setDetail(d);
            setEditDesc(d.title);
            upsertDiagnosis(d);
          }
        } catch {
          if (!patientUserId || cancelled) return;
          const docs = await fetchDocumentsForPatientUser(patientUserId, accessToken);
          const doc = docs.find((row) => row.id === id);
          if (doc && !cancelled) setDetail(doc);
          else {
            try {
              const rx = await fetchPrescriptionById(id, patientUserId, accessToken);
              if (rx && !cancelled) {
                setDetail(rx);
                upsertPrescription(rx);
              }
            } catch {
              // not found
            }
          }
        } finally {
          finish();
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // Doctor opened a bare /medical/:id link (no doctorView) — don't use patient endpoints.
    if (isDoctorRole) {
      void (async () => {
        if (await loadIntakeInstance()) {
          finish();
          return;
        }
        try {
          const d = await fetchDoctorDiagnosisById(id, accessToken);
          if (!cancelled) {
            setDetail(d);
            setEditDesc(d.title);
            upsertDiagnosis(d);
          }
        } catch {
          const found = await findDoctorRecordById(id, accessToken);
          if (found && !cancelled) {
            setDetail(found);
            if (found.category === "prescription") upsertPrescription(found);
          }
        } finally {
          finish();
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (cached?.category === "prescription" && profile?.id) {
      fetchPrescriptionById(id, profile.id, accessToken)
        .then((rx) => {
          if (!cancelled) {
            setDetail(rx);
            upsertPrescription(rx);
          }
        })
        .catch(() => undefined)
        .finally(finish);
      return () => {
        cancelled = true;
      };
    }

    // Bare /medical/:id — try intake first, then diagnosis/docs/prescription.
    void (async () => {
      if (await loadIntakeInstance()) {
        finish();
        return;
      }
      try {
        const d = await fetchDiagnosisById(id, accessToken);
        if (!cancelled) {
          setDetail(d);
          setEditDesc(d.title);
          upsertDiagnosis(d);
        }
      } catch {
        if (!profile?.id || cancelled) return;
        const docs = await fetchPatientDocuments(profile.id, accessToken);
        const doc = docs.find((d) => d.id === id);
        if (doc) {
          if (!cancelled) setDetail(doc);
          return;
        }
        try {
          const rx = await fetchPrescriptionById(id, profile.id, accessToken);
          if (rx && !cancelled) {
            setDetail(rx);
            upsertPrescription(rx);
          }
        } catch {
          // not found
        }
      } finally {
        finish();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    accessToken,
    cached?.id,
    cached?.category,
    isDoctorView,
    isDoctorRole,
    patientUserId,
    profile?.id,
    upsertDiagnosis,
    upsertPrescription,
    upsertIntake,
    hasDoctorAccess,
    accessChecked,
  ]);

  const updateIntakeAnswersDraft = useCallback((answers: Record<string, string[]>) => {
    intakeDraftDirtyRef.current = true;
    intakeAnswersDraftRef.current = answers;
    setIntakeAnswersDraft(answers);
  }, []);

  useEffect(() => {
    intakeAnswersDraftRef.current = intakeAnswersDraft;
  }, [intakeAnswersDraft]);

  useEffect(() => {
    if (!id || !accessToken || isDoctorView) return;
    if (!intakeDraftDirtyRef.current) return;
    if (record?.category !== "intake" || record.intakeExam?.status === "completed") return;

    const timer = setTimeout(() => {
      if (!intakeDraftDirtyRef.current) return;
      void (async () => {
        try {
          await intakeExamTakerRef.current?.flushPendingAudio();
        } catch {
          /* still save other answers */
        }
        if (!intakeDraftDirtyRef.current) return;
        const snapshot = intakeAnswersDraftRef.current;
        try {
          const raw = await saveIntakeExamAnswers(
            id,
            { answers: snapshot, complete: false },
            accessToken,
          );
          const mapped = mapInstance(raw);
          intakeLoadSeqRef.current += 1;
          setDetail(mapped);
          upsertIntake(mapped);
          if (intakeAnswersDraftRef.current === snapshot) {
            intakeDraftDirtyRef.current = false;
            setIntakeAnswersDraft(mapped.intakeExam?.answers ?? {});
          }
        } catch {
          /* keep dirty for retry */
        }
      })();
    }, 900);

    return () => clearTimeout(timer);
  }, [
    intakeAnswersDraft,
    id,
    accessToken,
    isDoctorView,
    record?.category,
    record?.intakeExam?.status,
    upsertIntake,
  ]);
  if (needsDoctorAccess && !accessChecked) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <AppBackButton
          color={colors.primary}
          style={styles.loadingBack}
          hitSlop={10}
          fallback="/(tabs)/records"
        />
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (needsDoctorAccess && !hasDoctorAccess) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <AppBackButton
          color={colors.primary}
          style={[styles.loadingBack, { alignSelf: "flex-start", marginLeft: 12 }]}
          hitSlop={10}
          fallback="/(tabs)/records"
        />
        <DoctorPatientAccessDenied isRTL={isRTL} />
      </View>
    );
  }

  if (!record && loadState === "loading") {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <AppBackButton
          color={colors.primary}
          style={styles.loadingBack}
          hitSlop={10}
          fallback="/(tabs)/records"
        />
        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontSize: 14, textAlign }}>
          {isRTL ? "جاري التحميل…" : "Loading record…"}
        </Text>
        </View>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, textAlign }}>
          {isRTL ? "السجل غير موجود" : "Record not found"}
        </Text>
      </View>
    );
  }

  const meta  = CATEGORY_META[record.category];
  const { Icon, color } = meta;
  const label = isRTL ? meta.labelAr : meta.labelEn;

  const permissionCtx = {
    userId: profile?.id ?? "",
    userRole: role ?? "patient",
    doctorId,
    isDoctorView,
  };
  const canEditDiagnosisRecord = canEditDiagnosis(record, permissionCtx);
  const canAddSymptom = canAddDiagnosisSymptom(record, permissionCtx);
  const canDeleteRecord = canDeleteMedicalRecord(record, permissionCtx);
  const isDiagnosis = record.category === "diagnosis";
  const isPrescription = record.category === "prescription";
  const isLabOrXray = record.category === "lab" || record.category === "xray";
  const linkedDiagnoses = linkedDiagnosesForRecord(record);
  const isDocImage = isMedicalImageAttachment(record.fileUrl, record.fileName);
  const isDocPdf = isMedicalPdfAttachment(record.fileUrl, record.fileName);
  const canEditLabDetails = isLabOrXray && !isDoctorView && !!accessToken;
  const canPrintPrescription =
    isPrescription &&
    !!accessToken &&
    !!record.doctorId &&
    !!(record.ownerId || patientUserId || profile?.id);

  const printPrescription = async () => {
    if (!accessToken || !canPrintPrescription) return;
    const ownerId = record.ownerId || patientUserId || profile?.id;
    if (!ownerId) return;
    const pendingTab = openBlankPdfTab();
    setPrintingPrescription(true);
    try {
      const { pdf_url } = await fetchPrescriptionPdf(
        ownerId,
        record.id,
        accessToken,
        apiLang,
        true,
      );
      if (!pdf_url) throw new Error("PDF unavailable");
      await openPdfInNewTab(pdf_url, pendingTab);
    } catch (err) {
      try {
        pendingTab?.close();
      } catch {
        // ignore
      }
      showAppAlert(isRTL ? "فشل الطباعة" : "Print failed", (err as Error).message);
    } finally {
      setPrintingPrescription(false);
    }
  };

  const refetchListsAfterChange = async () => {
    if (!accessToken || !profile) return;
    if (isDoctorView && patientUserId) {
      notifyMedicalHistoryChanged(patientUserId);
      return;
    }
    const apiRecords = await fetchAllMedicalHistory(profile.id, accessToken);
    setRecordsFromApi(apiRecords, profile.id);
  };

  const saveDiagnosisEdit = async () => {
    const text = editDesc.trim();
    if (!text || !id || !accessToken || !canEditDiagnosisRecord) return;
    setSavingDiagnosis(true);
    try {
      const updated = await updateDiagnosis(id, { desc: text }, accessToken);
      setDetail(updated);
      upsertDiagnosis(updated);
      setEditingDiagnosis(false);
      await refetchListsAfterChange();
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const submitSymptom = async () => {
    const text = newSymptom.trim();
    if (!text || !id || !accessToken || !canAddSymptom) return;
    setAddingSymptom(true);
    try {
      const updated = await addSymptomToDiagnosis(id, text, accessToken);
      setDetail(updated);
      upsertDiagnosis(updated);
      setNewSymptom("");
      await refetchListsAfterChange();
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
    } finally {
      setAddingSymptom(false);
    }
  };

  const saveLabDetails = async () => {
    const title = editTitle.trim();
    const notes = editNotes.trim();
    if (!title || !notes || !id || !accessToken || !canEditLabDetails) return;
    setSavingLabDetails(true);
    try {
      const updated = await updatePatientMedicalDocument(
        id,
        { title, notes },
        accessToken,
      );
      setDetail(updated);
      upsertDocument(updated);
      setEditingLabDetails(false);
      await refetchListsAfterChange();
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
    } finally {
      setSavingLabDetails(false);
    }
  };

  const generateLabDetails = async () => {
    if (!record || !accessToken || !canEditLabDetails) return;
    setGeneratingDetails(true);
    try {
      const updated = await generateMedicalRecordDetails(
        record,
        accessToken,
        apiLang,
      );
      setDetail(updated);
      upsertDocument(updated);
      setEditTitle(updated.title);
      setEditNotes(updated.notes ?? "");
      setEditingLabDetails(true);
      await refetchListsAfterChange();
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
    } finally {
      setGeneratingDetails(false);
    }
  };

  const performDelete = async () => {
    if (!accessToken) {
      Alert.alert(
        isRTL ? "فشل الحذف" : "Delete failed",
        isRTL ? "يجب تسجيل الدخول." : "You must be signed in.",
      );
      return;
    }

    try {
      if (record.category === "lab" || record.category === "xray") {
        await deletePatientMedicalDocument(record.id, accessToken);
      } else if (record.category === "intake") {
        await deleteIntakeExamInstance(record.id, accessToken);
      } else {
        throw new Error(
          isRTL ? "لا يمكن حذف هذا النوع من السجلات." : "This record type cannot be deleted.",
        );
      }
      await refetchListsAfterChange();
      remove(profile!.id, record.id);
      navigateBack(router, "/(tabs)/records");
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحذف" : "Delete failed", (e as Error).message);
    }
  };

  const confirmDelete = () => {
    if (!canDeleteRecord) return;
    confirmDestructiveAction({
      title: isRTL ? "حذف السجل" : "Delete record",
      message: isRTL ? `حذف "${record.title}"؟` : `Delete "${record.title}"?`,
      confirmLabel: isRTL ? "حذف" : "Delete",
      cancelLabel: isRTL ? "إلغاء" : "Cancel",
      onConfirm: performDelete,
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 6,
            backgroundColor: color,
            flexDirection: dir,
          },
        ]}
      >
        <AppBackButton
          color="#fff"
          style={styles.headerBtn}
          hitSlop={10}
          fallback="/(tabs)/records"
        />

        {/* Category chip */}
        <View style={[styles.categoryChip, { flexDirection: dir }]}>
          <Icon size={15} color="#fff" />
          <Text style={styles.categoryChipText}>{label}</Text>
        </View>

        {canDeleteRecord ? (
          <Pressable onPress={confirmDelete} style={styles.headerBtn} hitSlop={10}>
            <Trash2 size={20} color="#fff" />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* ── Title band ── */}
      <View style={[styles.titleBand, { backgroundColor: color + "18", borderBottomColor: color + "30" }]}>
        <View style={[styles.titleRow, { flexDirection: dir }]}>
          <View style={[styles.titleIcon, { backgroundColor: color + "25" }]}>
            <Icon size={22} color={color} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={[styles.title, { color: colors.foreground, textAlign }]}
            >
              {isDiagnosis && editingDiagnosis && canEditDiagnosisRecord
                ? editDesc || record.title
                : record.title}
            </Text>
            {isDiagnosis && record.doctorName ? (
              <Text
                style={[
                  styles.doctorName,
                  { color: colors.mutedForeground, textAlign },
                ]}
              >
                {isRTL ? `د. ${record.doctorName}` : `Dr. ${record.doctorName}`}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Detail cards ── */}
      <KeyboardSafeScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(56 + insets.bottom, 140) },
        ]}
      >

        {(isLabOrXray || isPrescription) && record.fileUrl && isDocImage && (
          <Pressable
            onPress={() => setZoomImageUri(record.fileUrl!)}
            style={[styles.imageCard, { borderColor: colors.border }]}
          >
            <MedicalRecordAttachmentImage
              uri={record.fileUrl}
              style={styles.detailImage}
            />
          </Pressable>
        )}

        {(isLabOrXray || isPrescription) && record.fileUrl && isDocPdf && (
          <Pressable
            onPress={() =>
              setPdfView({ uri: record.fileUrl!, fileName: record.fileName })
            }
            style={[styles.fileLinkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <FileText size={32} color={color} />
            <Text style={{ color: colors.primary, fontWeight: "600", textAlign }}>
              {record.fileName?.trim() || (isRTL ? "عرض PDF" : "View PDF")}
            </Text>
          </Pressable>
        )}

        {(isLabOrXray || isPrescription) && record.fileUrl && !isDocImage && !isDocPdf && (
          <Pressable
            onPress={() => Linking.openURL(record.fileUrl!)}
            style={[styles.fileLinkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <FileText size={32} color={color} />
            <Text style={{ color: colors.primary, fontWeight: "600", textAlign }}>
              {isRTL ? "فتح الملف" : "Open attached file"}
            </Text>
          </Pressable>
        )}

        {record.value ? (
          <DetailCard
            icon={<Hash size={18} color={color} />}
            label={isRTL ? "القيمة" : "Value"}
            value={record.value}
            color={color}
            colors={colors}
            isRTL={isRTL}
          />
        ) : null}

        {record.bodyPart ? (
          <DetailCard
            icon={<Bone size={18} color={color} />}
            label={t.records.bodyPart}
            value={t.records.bodyParts[record.bodyPart]}
            color={color}
            colors={colors}
            isRTL={isRTL}
          />
        ) : null}

        {record.notes && !editingLabDetails ? (
          <DetailCard
            icon={<FileText size={18} color={color} />}
            label={isRTL ? "الوصف" : isLabOrXray ? "Description" : "Notes"}
            value={record.notes}
            color={color}
            colors={colors}
            isRTL={isRTL}
            relaxed
          />
        ) : null}

        {canEditLabDetails ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
              {isRTL ? "تفاصيل السجل" : "Record details"}
            </Text>
            {editingLabDetails ? (
              <View style={{ gap: 10 }}>
                <AppTextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder={isRTL ? "العنوان" : "Title"}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.titleInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      textAlign,
                    },
                  ]}
                />
                <AppTextInput
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  placeholder={isRTL ? "الوصف" : "Description"}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.titleInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      textAlign,
                      minHeight: 88,
                      textAlignVertical: "top",
                    },
                  ]}
                />
                <View style={[styles.labDetailActions, { flexDirection: dir }]}>
                  <Pressable
                    onPress={saveLabDetails}
                    disabled={savingLabDetails || !editTitle.trim() || !editNotes.trim()}
                    style={[
                      styles.addSymptomBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity:
                          savingLabDetails || !editTitle.trim() || !editNotes.trim()
                            ? 0.5
                            : 1,
                      },
                    ]}
                  >
                    {savingLabDetails ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
                        {isRTL ? "حفظ" : "Save"}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingLabDetails(false);
                      setEditTitle(record.title);
                      setEditNotes(record.notes ?? "");
                    }}
                    style={[styles.addSymptomBtn, { backgroundColor: colors.muted }]}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                      {isRTL ? "إلغاء" : "Cancel"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    setEditTitle(record.title);
                    setEditNotes(record.notes ?? "");
                    setEditingLabDetails(true);
                  }}
                  style={[styles.addSymptomBtn, { backgroundColor: colors.muted, alignSelf: "flex-start" }]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {isRTL ? "تعديل العنوان والوصف" : "Edit title & description"}
                  </Text>
                </Pressable>
                {isDocImage ? (
                  <Pressable
                    onPress={() => void generateLabDetails()}
                    disabled={generatingDetails}
                    style={[
                      styles.addSymptomBtn,
                      {
                        backgroundColor: `${colors.primary}14`,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        alignSelf: "flex-start",
                        opacity: generatingDetails ? 0.6 : 1,
                      },
                    ]}
                  >
                    {generatingDetails ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text style={{ color: colors.primary, fontWeight: "700" }}>
                        {isRTL ? "إنشاء بالذكاء الاصطناعي" : "Generate with AI"}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        {record.category !== "intake" ? (
          <MedicalRecordAiInsightSection
            record={record}
            generating={generatingInsight}
            onGenerate={
              // Doctors can view existing insights; generate endpoints are patient-scoped
              // for labs/diagnoses (prescription generate is doctor-allowed separately).
              accessToken && !isDoctorView
                ? () => {
                    setGeneratingInsight(true);
                    void generateMedicalRecordAiInsight(
                      record,
                      accessToken,
                      apiLang,
                    )
                      .then((updated) => {
                        setDetail(updated);
                        if (
                          updated.category === "lab" ||
                          updated.category === "xray"
                        ) {
                          upsertDocument(updated);
                        } else if (updated.category === "diagnosis") {
                          upsertDiagnosis(updated);
                        } else if (updated.category === "prescription") {
                          upsertPrescription(updated);
                        }
                        const ownerId =
                          patientUserId?.trim() || profile?.id || updated.ownerId;
                        if (ownerId) notifyMedicalHistoryChanged(ownerId);
                      })
                      .catch((err) =>
                        Alert.alert(
                          isRTL ? "خطأ" : "Error",
                          (err as Error).message,
                        ),
                      )
                      .finally(() => setGeneratingInsight(false));
                  }
                : undefined
            }
          />
        ) : null}

        {record.category === "intake" && record.intakeExam ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
              {isDoctorView || record.intakeExam.status === "completed"
                ? isRTL
                  ? "إجابات المريض"
                  : "Patient answers"
                : isRTL
                  ? "أكمل الفحص"
                  : "Complete exam"}
            </Text>
            <IntakeExamTaker
              ref={intakeExamTakerRef}
              isRTL={isRTL}
              questions={record.intakeExam.questions}
              answers={
                isDoctorView || record.intakeExam.status === "completed"
                  ? record.intakeExam.answers
                  : intakeAnswersDraft
              }
              readOnly={isDoctorView || record.intakeExam.status === "completed"}
              accessToken={accessToken ?? undefined}
              onChange={updateIntakeAnswersDraft}
            />
            {!isDoctorView && record.intakeExam.status !== "completed" ? (
              <View
                style={[
                  styles.intakeActions,
                  { borderTopColor: colors.border, flexDirection: dir },
                ]}
              >
                <Pressable
                  onPress={() => {
                    if (!accessToken) return;
                    Alert.alert(
                      isRTL ? "إعادة تعيين الإجابات" : "Reset answers",
                      isRTL ? "مسح جميع الإجابات؟" : "Clear all answers?",
                      [
                        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
                        {
                          text: isRTL ? "إعادة تعيين" : "Reset",
                          style: "destructive",
                          onPress: () => {
                            void resetIntakeExamAnswers(record.id, accessToken).then((raw) => {
                              const mapped = mapInstance(raw);
                              intakeLoadSeqRef.current += 1;
                              intakeDraftDirtyRef.current = false;
                              setDetail(mapped);
                              upsertIntake(mapped);
                              setIntakeAnswersDraft({});
                              void refetchListsAfterChange();
                            });
                          },
                        },
                      ],
                    );
                  }}
                  disabled={savingIntake}
                  style={[
                    styles.intakeResetBtn,
                    {
                      borderColor: colors.destructive,
                      backgroundColor: `${colors.destructive}0F`,
                      opacity: savingIntake ? 0.55 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: colors.destructive, fontWeight: "700", fontSize: 13 }}>
                    {isRTL ? "إعادة تعيين الإجابات" : "Reset answers"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!accessToken) return;
                    setSavingIntake(true);
                    void (async () => {
                      try {
                        try {
                          await intakeExamTakerRef.current?.flushPendingAudio();
                        } catch {
                          /* still save other answers */
                        }
                        const raw = await saveIntakeExamAnswers(
                          record.id,
                          { answers: intakeAnswersDraftRef.current, complete: false },
                          accessToken,
                        );
                        const mapped = mapInstance(raw);
                        intakeLoadSeqRef.current += 1;
                        intakeDraftDirtyRef.current = false;
                        setDetail(mapped);
                        upsertIntake(mapped);
                        setIntakeAnswersDraft(mapped.intakeExam?.answers ?? {});
                        void refetchListsAfterChange();
                        showSuccessToast(isRTL ? "تم حفظ المسودة" : "Draft saved");
                      } catch (e) {
                        Alert.alert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
                      } finally {
                        setSavingIntake(false);
                      }
                    })();
                  }}
                  disabled={savingIntake}
                  style={[styles.addSymptomBtn, { backgroundColor: colors.muted }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    {isRTL ? "حفظ مسودة" : "Save draft"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!accessToken) return;
                    setSavingIntake(true);
                    void (async () => {
                      try {
                        try {
                          await intakeExamTakerRef.current?.flushPendingAudio();
                        } catch {
                          /* continue */
                        }
                        const raw = await saveIntakeExamAnswers(
                          record.id,
                          { answers: intakeAnswersDraftRef.current, complete: true },
                          accessToken,
                        );
                        const mapped = mapInstance(raw);
                        intakeLoadSeqRef.current += 1;
                        intakeDraftDirtyRef.current = false;
                        setDetail(mapped);
                        upsertIntake(mapped);
                        setIntakeAnswersDraft(mapped.intakeExam?.answers ?? {});
                        void refetchListsAfterChange();
                      } catch (e) {
                        Alert.alert(isRTL ? "فشل الإرسال" : "Submit failed", (e as Error).message);
                      } finally {
                        setSavingIntake(false);
                      }
                    })();
                  }}
                  disabled={savingIntake}
                  style={[styles.addSymptomBtn, { backgroundColor: colors.primary }]}
                >
                  {savingIntake ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.addSymptomBtnText}>
                      {isRTL ? "إرسال الفحص" : "Submit exam"}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {canEditDiagnosisRecord && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
              {isRTL ? "تعديل التشخيص" : "Edit diagnosis"}
            </Text>
            {editingDiagnosis ? (
              <View style={{ gap: 10 }}>
                <AppTextInput
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                  placeholder={isRTL ? "وصف التشخيص…" : "Diagnosis description…"}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.titleInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      textAlign,
                    },
                  ]}
                />
                <Pressable
                  onPress={saveDiagnosisEdit}
                  disabled={savingDiagnosis || !editDesc.trim()}
                  style={[
                    styles.addSymptomBtn,
                    {
                      backgroundColor: editDesc.trim() ? color : colors.muted,
                      opacity: savingDiagnosis ? 0.6 : 1,
                      alignSelf: "flex-start",
                    },
                  ]}
                >
                  {savingDiagnosis ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addSymptomBtnText}>{isRTL ? "حفظ" : "Save"}</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => { setEditingDiagnosis(false); setEditDesc(record.title); }}>
                  <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                    {isRTL ? "إلغاء" : "Cancel"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setEditingDiagnosis(true)}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  {isRTL ? "تعديل الوصف" : "Edit description"}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {recordShowsLinkedDiagnoses(record.category) && linkedDiagnoses.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: dir }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: "#ef444418" }]}>
                <Activity size={18} color="#ef4444" />
              </View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "تشخيصات مرتبطة" : "Linked diagnoses"}
              </Text>
            </View>
            {linkedDiagnoses.map((diag) => (
              <View
                key={diag.id}
                style={[
                  styles.linkedDocRow,
                  { borderColor: colors.border, flexDirection: dir },
                ]}
              >
                <View
                  style={[
                    styles.linkedThumb,
                    styles.linkedThumbPlaceholder,
                    { backgroundColor: "#ef444422" },
                  ]}
                >
                  <Activity size={22} color="#ef4444" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{ color: colors.foreground, fontWeight: "700", textAlign }}
                    numberOfLines={3}
                  >
                    {diag.title}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    openLinkedMedicalRecord(diag.id, { isDoctorView, patientUserId })
                  }
                  hitSlop={8}
                  accessibilityRole="link"
                >
                  <Text style={[styles.detailsLink, { color: colors.primary }]}>
                    {isRTL ? "التفاصيل" : "Details"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {isDiagnosis && record.linkedDocuments && record.linkedDocuments.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: dir }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: "#10b98118" }]}>
                <Beaker size={18} color="#10b981" />
              </View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "نتائج مرتبطة" : "Linked results"}
              </Text>
            </View>
            {record.linkedDocuments.map((doc) => {
              const docMeta = CATEGORY_META[doc.category];
              const docIsImage = isMedicalImageAttachment(doc.fileUrl, doc.fileName);
              return (
                <View
                  key={doc.id}
                  style={[
                    styles.linkedDocRow,
                    { borderColor: colors.border, flexDirection: dir },
                  ]}
                >
                  {docIsImage && doc.fileUrl ? (
                    <MedicalRecordAttachmentImage
                      uri={doc.fileUrl}
                      style={styles.linkedThumb}
                    />
                  ) : (
                    <View
                      style={[
                        styles.linkedThumb,
                        styles.linkedThumbPlaceholder,
                        { backgroundColor: docMeta.color + "22" },
                      ]}
                    >
                      <docMeta.Icon size={22} color={docMeta.color} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{ color: colors.foreground, fontWeight: "700", textAlign }}
                      numberOfLines={2}
                    >
                      {doc.title}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign }}>
                      {isRTL ? docMeta.labelAr : docMeta.labelEn}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      openLinkedMedicalRecord(doc.id, { isDoctorView, patientUserId })
                    }
                    hitSlop={8}
                    accessibilityRole="link"
                  >
                    <Text style={[styles.detailsLink, { color: colors.primary }]}>
                      {isRTL ? "التفاصيل" : "Details"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : isDiagnosis && !loadingDetail ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign }}>
              {isRTL ? "لا توجد نتائج مختبر أو أشعة أو روشتات مرتبطة" : "No linked lab results, imaging, or prescriptions"}
            </Text>
          </View>
        ) : null}

        {record.category === "diagnosis" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: dir }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: color + "18" }]}>
                <Activity size={18} color={color} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "الأعراض" : "Symptoms"}
              </Text>
            </View>
            {loadingDetail ? (
              <ActivityIndicator color={color} style={{ marginVertical: 8 }} />
            ) : record.symptoms?.length ? (
              record.symptoms.map((s) => (
                <Text
                  key={s.id}
                  style={[
                    styles.symptomLine,
                    { color: colors.foreground, textAlign },
                  ]}
                >
                  • {s.desc}
                </Text>
              ))
            ) : (
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                {isRTL ? "لا توجد أعراض مسجلة" : "No symptoms recorded"}
              </Text>
            )}
            {canAddSymptom && (
              <View style={[styles.addSymptomRow, { flexDirection: dir }]}>
                <AppTextInput
                  value={newSymptom}
                  onChangeText={setNewSymptom}
                  placeholder={isRTL ? "عرض جديد…" : "New symptom…"}
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.addSymptomInput,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                      color: colors.foreground,
                      textAlign,
                    },
                  ]}
                  onSubmitEditing={submitSymptom}
                />
                <Pressable
                  onPress={submitSymptom}
                  disabled={addingSymptom || !newSymptom.trim()}
                  style={[
                    styles.addSymptomBtn,
                    {
                      backgroundColor: newSymptom.trim() ? color : colors.muted,
                      opacity: addingSymptom ? 0.6 : 1,
                    },
                  ]}
                >
                  {addingSymptom ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.addSymptomBtnText}>{isRTL ? "إضافة" : "Add"}</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {isPrescription ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: dir }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: color + "18" }]}>
                <Pill size={18} color={color} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "الأدوية" : "Medications"}
              </Text>
            </View>
            {canPrintPrescription ? (
              <Pressable
                onPress={() => void printPrescription()}
                disabled={printingPrescription}
                style={[
                  styles.printBtn,
                  {
                    flexDirection: dir,
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}12`,
                    opacity: printingPrescription ? 0.7 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t.prescription.print}
              >
                {printingPrescription ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <FileDown size={16} color={colors.primary} />
                )}
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>
                  {t.prescription.print}
                </Text>
              </Pressable>
            ) : null}
            {loadingDetail ? (
              <ActivityIndicator color={color} style={{ marginVertical: 8 }} />
            ) : record.medications?.length ? (
              record.medications.map((med, index) => (
                <View
                  key={med.id ?? `med-${index}`}
                  style={[styles.medRow, { borderColor: colors.border, backgroundColor: colors.muted }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700", textAlign }}>
                    {med.medication_name}
                  </Text>
                  {med.dose ? (
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign }}>
                      {isRTL ? "الجرعة: " : "Dose: "}
                      {med.dose}
                    </Text>
                  ) : null}
                  {med.interval ? (
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign }}>
                      {isRTL ? "التكرار: " : "Interval: "}
                      {med.interval}
                    </Text>
                  ) : null}
                  {med.notes ? (
                    <Text style={{ color: colors.foreground, fontSize: 13, textAlign, marginTop: 4 }}>
                      {med.notes}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign }}>
                {isRTL ? "لا توجد أدوية مسجلة" : "No medications recorded"}
              </Text>
            )}
          </View>
        ) : null}

        {isPrescription && record.linkedConsultations && record.linkedConsultations.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { flexDirection: dir }]}>
              <View style={[styles.cardIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <MessageCircle size={18} color={colors.primary} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
                {isRTL ? "استشارات مرتبطة" : "Linked consultations"}
              </Text>
            </View>
            {record.linkedConsultations.map((consultation) => {
              const peerId = isDoctorView ? consultation.patientId : consultation.doctorId;
              const title = isDoctorView ? consultation.patientName : consultation.doctorName;
              return (
                <Pressable
                  key={consultation.id}
                  onPress={() => router.push({ pathname: "/chat/[id]", params: { id: peerId } })}
                  style={[
                    styles.linkedDocRow,
                    { borderColor: colors.border, flexDirection: dir },
                  ]}
                >
                  <View
                    style={[
                      styles.linkedThumb,
                      styles.linkedThumbPlaceholder,
                      { backgroundColor: `${colors.primary}22` },
                    ]}
                  >
                    <MessageCircle size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{ color: colors.foreground, fontWeight: "700", textAlign }}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign }}>
                      {consultationStatusLabel(consultation.status, t)}
                      {" · "}
                      {new Date(consultation.createdAt).toLocaleDateString(localeTag(isRTL), {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <DetailCard
          icon={<Calendar size={18} color={color} />}
          label={isRTL ? "التاريخ" : "Date"}
          value={new Date(record.date).toLocaleDateString(localeTag(isRTL), {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          color={color}
          colors={colors}
          isRTL={isRTL}
        />

        {/* Meta info row */}
        <View
          style={[
            styles.metaRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: dir,
            },
          ]}
        >
          <Text style={[styles.metaLabel, { color: colors.mutedForeground, textAlign }]}>
            {isRTL ? "أُضيف في:" : "Added:"}
          </Text>
          <Text style={[styles.metaValue, { color: colors.foreground, textAlign }]}>
            {new Date(record.createdAt).toLocaleString(localeTag(isRTL), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>
        </View>

        {canDeleteRecord && (
          <Pressable
            onPress={confirmDelete}
            style={[styles.deleteBtn, { borderColor: "#ef4444", flexDirection: dir }]}
          >
            <Trash2 size={16} color="#ef4444" />
            <Text style={styles.deleteBtnText}>
              {isRTL ? "حذف هذا السجل" : "Delete this record"}
            </Text>
          </Pressable>
        )}
      </KeyboardSafeScrollView>

      <FullscreenImageViewer
        uri={zoomImageUri}
        onClose={() => setZoomImageUri(null)}
      />
      <MedicalPdfViewer
        view={pdfView}
        onClose={() => setPdfView(null)}
        isRTL={isRTL}
      />
    </View>
  );
}

// ─── Detail card ─────────────────────────────────────────────────────────────

function DetailCard({
  icon,
  label,
  value,
  color,
  colors,
  isRTL,
  relaxed,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  relaxed?: boolean;
}) {
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = alignText(isRTL);
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardHeader, { flexDirection: dir }]}>
        <View style={[styles.cardIconWrap, { backgroundColor: color + "18" }]}>
          {icon}
        </View>
        <Text style={[styles.cardLabel, { color: colors.mutedForeground, textAlign }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.cardValue,
          relaxed && styles.cardValueRelaxed,
          { color: colors.foreground, textAlign },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingRoot: { flex: 1 },
  loadingBack: { paddingHorizontal: 16, paddingVertical: 12, alignSelf: "flex-start" },
  loadingBody: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 8,
  },
  headerBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  categoryChip: {
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryChipText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  titleBand: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  titleRow: { alignItems: "center", gap: 14 },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  doctorName: { fontSize: 14, fontWeight: "600" },
  titleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
  },

  body: { padding: 16, gap: 12, paddingBottom: 40 },

  imageCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailImage: { width: "100%", height: 220 },
  fileLinkCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardHeader: { alignItems: "center", gap: 10 },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  cardValue: { fontSize: 15, lineHeight: 22 },
  cardValueRelaxed: { fontSize: 15, lineHeight: 28 },
  symptomLine: { fontSize: 15, lineHeight: 24, marginTop: 6 },
  medRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    marginTop: 8,
  },
  printBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  linkedDocRow: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  linkedThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  linkedThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  detailsLink: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  addSymptomRow: { alignItems: "center", gap: 8, marginTop: 12 },
  addSymptomInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addSymptomBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 64,
    alignItems: "center",
  },
  intakeActions: {
    marginTop: 16,
    gap: 10,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
    alignItems: "center",
  },
  intakeResetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    minWidth: 140,
  },
  labDetailActions: {
    gap: 8,
    flexWrap: "wrap",
  },
  addSymptomBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaLabel: { fontSize: 12, fontWeight: "600" },
  metaValue: { fontSize: 13, flex: 1 },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
});
