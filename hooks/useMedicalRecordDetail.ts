import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { isMedicalImageAttachment, isMedicalPdfAttachment, MEDICAL_RECORD_CATEGORY_META } from "@/components/medical/medicalRecordMeta";
import type { MedicalPdfView } from "@/components/medical/MedicalPdfViewer";
import { navigateBack } from "@/utils/appNavigation";
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
  generateMedicalRecordDetails,
  updateDiagnosis,
  updatePatientMedicalDocument,
} from "@/domains/medical/api";
import {
  deleteIntakeExamInstance,
  fetchIntakeExamInstance,
  mapInstance,
  resetIntakeExamAnswers,
  saveIntakeExamAnswers,
} from "@/domains/intake-exams/api";
import type { IntakeExamTakerHandle } from "@/components/intake/IntakeExamTaker";
import { useMedicalStore } from "@/domains/medical/store";
import { getApiLang } from "@/domains/i18n/store";
import type { LinkedConsultationSummary, MedicalRecord } from "@/domains/medical/types";
import {
  canAddDiagnosisSymptom,
  canDeleteMedicalRecord,
  canEditDiagnosis,
} from "@/domains/medical/permissions";
import { showAppAlert } from "@/utils/appAlert";
import { openBlankPdfTab, openPdfInNewTab } from "@/utils/openPdfInNewTab";
import { readRouteParam } from "@/utils/routeParams";
import { showSuccessToast } from "@/utils/toast";

export function useMedicalRecordDetail(isRTL: boolean) {
  const params = useLocalSearchParams<{
    id?: string | string[];
    doctorView?: string | string[];
    patientUserId?: string | string[];
  }>();
  const id = readRouteParam(params.id);
  const doctorView = readRouteParam(params.doctorView);
  const patientUserId = readRouteParam(params.patientUserId) || undefined;

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
  const [editingLabDetails, setEditingLabDetails] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingLabDetails, setSavingLabDetails] = useState(false);
  const [generatingDetails, setGeneratingDetails] = useState(false);
  const [intakeAnswersDraft, setIntakeAnswersDraft] = useState<Record<string, string[]>>({});
  const [savingIntake, setSavingIntake] = useState(false);
  const [printingPrescription, setPrintingPrescription] = useState(false);
  const [accessStatus, setAccessStatus] = useState<DoctorPatientAccessStatus | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  const needsDoctorAccess = isDoctorView && !!patientUserId;
  const hasDoctorAccess =
    !needsDoctorAccess || canDoctorViewPatientRecords(accessStatus);

  const cached = records.find((r) => r.id === id);
  const record = hasDoctorAccess ? detail ?? cached : null;

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
      // Seed immediately so in-progress answers show before the network returns.
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
      // Ignore stale responses (superseded load, or a save completed while this was in flight).
      if (cancelled || seq !== intakeLoadSeqRef.current) return mapped;
      setDetail(mapped);
      upsertIntake(mapped);
      // Never wipe in-progress local edits with a slower network response.
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
      // Patient profile keeps history in local state (not the medical store), so
      // opening an intake from /patients/:id often has no cache hit — probe intake
      // before diagnosis/docs/prescription.
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
          if (doc) {
            if (!cancelled) setDetail(doc);
            return;
          }
          try {
            const rx = await fetchPrescriptionById(id, patientUserId, accessToken);
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
    }

    // A doctor opening a bare /medical/{id} link (no doctorView params — e.g. a
    // shared URL or one without patient context): the /patient/* endpoints are
    // patient-scoped and 404 for doctors, so use the doctor-scoped diagnosis
    // endpoint (server enforces doctor-patient access).
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

    // Bare /medical/:id — try intake first (common deep link), then other types.
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
    role,
    upsertDiagnosis,
    upsertPrescription,
    upsertIntake,
    hasDoctorAccess,
    accessChecked,
  ]);
  const permissionCtx = useMemo(
    () => ({
      userId: profile?.id ?? "",
      userRole: role ?? "patient",
      doctorId,
      isDoctorView,
    }),
    [profile?.id, role, doctorId, isDoctorView],
  );

  const derived = useMemo(() => {
    if (!record) {
      return {
        meta: null,
        label: "",
        color: "#3057F2",
        Icon: MEDICAL_RECORD_CATEGORY_META.intake.Icon,
        canEditDiagnosis: false,
        canAddSymptom: false,
        canDeleteRecord: false,
        isDiagnosis: false,
        isPrescription: false,
        isLabOrXray: false,
        isDocImage: false,
        isDocPdf: false,
        isIntakeExam: false,
        canTakeIntakeExam: false,
        canPrintPrescription: false,
        canEditLabDetails: false,
      };
    }

    const meta = MEDICAL_RECORD_CATEGORY_META[record.category];
    const isDiagnosis = record.category === "diagnosis";
    const isPrescription = record.category === "prescription";
    const isLabOrXray = record.category === "lab" || record.category === "xray";
    const isDocImage = isMedicalImageAttachment(record.fileUrl, record.fileName);
    const isDocPdf = isMedicalPdfAttachment(record.fileUrl, record.fileName);

    return {
      meta,
      label: isRTL ? meta.labelAr : meta.labelEn,
      color: meta.color,
      Icon: meta.Icon,
      canEditDiagnosis: canEditDiagnosis(record, permissionCtx),
      canAddSymptom: canAddDiagnosisSymptom(record, permissionCtx),
      canDeleteRecord: canDeleteMedicalRecord(record, permissionCtx),
      isDiagnosis,
      isPrescription,
      isLabOrXray,
      isDocImage,
      isDocPdf,
      canPrintPrescription:
        isPrescription &&
        !!accessToken &&
        !!record.doctorId &&
        !!(record.ownerId || patientUserId || profile?.id),
      canEditLabDetails: isLabOrXray && !isDoctorView && !!accessToken,
      isIntakeExam: record.category === "intake" && !!record.intakeExam,
      canTakeIntakeExam:
        record.category === "intake" &&
        !!record.intakeExam &&
        !isDoctorView &&
        record.intakeExam.status !== "completed",
    };
  }, [record, isRTL, permissionCtx, isDoctorView, accessToken, patientUserId, profile?.id]);

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
    if (!text || !id || !accessToken || !record || !derived.canEditDiagnosis) return;
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
    if (!text || !id || !accessToken || !record || !derived.canAddSymptom) return;
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
    if (!title || !notes || !id || !accessToken || !derived.canEditLabDetails) return;
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
    if (!record || !accessToken || !derived.canEditLabDetails) return;
    setGeneratingDetails(true);
    try {
      const updated = await generateMedicalRecordDetails(
        record,
        accessToken,
        getApiLang(),
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
    if (!record || !profile) return;
    if (!accessToken) {
      showAppAlert(
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
      remove(profile.id, record.id);
      navigateBack(router, "/(tabs)/records");
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحذف" : "Delete failed", (e as Error).message);
    }
  };

  const confirmDelete = () => {
    if (!record || !derived.canDeleteRecord || !profile) return;
    confirmDestructiveAction({
      title: isRTL ? "حذف السجل" : "Delete record",
      message: isRTL ? `حذف "${record.title}"؟` : `Delete "${record.title}"?`,
      confirmLabel: isRTL ? "حذف" : "Delete",
      cancelLabel: isRTL ? "إلغاء" : "Cancel",
      onConfirm: performDelete,
    });
  };

  const updateIntakeAnswersDraft = useCallback((answers: Record<string, string[]>) => {
    intakeDraftDirtyRef.current = true;
    intakeAnswersDraftRef.current = answers;
    setIntakeAnswersDraft(answers);
  }, []);

  // Persist answers shortly after edits so reload/deep-links keep drafts.
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
        // Best-effort: never block saving other answers if audio flush fails.
        try {
          await intakeExamTakerRef.current?.flushPendingAudio();
        } catch {
          /* keep going */
        }
        if (!intakeDraftDirtyRef.current) return;
        const snapshot = intakeAnswersDraftRef.current;
        try {
          const updated = await saveIntakeExamAnswers(
            id,
            { answers: snapshot, complete: false },
            accessToken,
          );
          const mapped = mapInstance(updated);
          // Invalidate in-flight detail fetches so they can't wipe this save.
          intakeLoadSeqRef.current += 1;
          setDetail(mapped);
          upsertIntake(mapped);
          // Only clear dirty if the user hasn't typed more since this save started.
          if (intakeAnswersDraftRef.current === snapshot) {
            intakeDraftDirtyRef.current = false;
            setIntakeAnswersDraft(mapped.intakeExam?.answers ?? {});
          }
        } catch {
          // Keep dirty so the next edit / manual save can retry.
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
  const saveIntakeDraft = async () => {
    if (!record?.intakeExam || !accessToken || isDoctorView) return;
    setSavingIntake(true);
    try {
      try {
        await intakeExamTakerRef.current?.flushPendingAudio();
      } catch {
        // Still save whatever answers we already have (text/choices/uploaded media).
      }
      const answers = intakeAnswersDraftRef.current;
      const updated = await saveIntakeExamAnswers(
        record.id,
        { answers, complete: false },
        accessToken,
      );
      const mapped = mapInstance(updated);
      // Prevent the original open-fetch from overwriting this save with empty answers.
      intakeLoadSeqRef.current += 1;
      intakeDraftDirtyRef.current = false;
      setDetail(mapped);
      upsertIntake(mapped);
      setIntakeAnswersDraft(mapped.intakeExam?.answers ?? {});
      await refetchListsAfterChange();
      showSuccessToast(isRTL ? "تم حفظ المسودة" : "Draft saved");
    } catch (e) {
      Alert.alert(isRTL ? "فشل الحفظ" : "Save failed", (e as Error).message);
    } finally {
      setSavingIntake(false);
    }
  };

  const submitIntakeExam = async () => {
    if (!record?.intakeExam || !accessToken || isDoctorView) return;
    setSavingIntake(true);
    try {
      try {
        await intakeExamTakerRef.current?.flushPendingAudio();
      } catch {
        /* continue */
      }
      const answers = intakeAnswersDraftRef.current;
      const updated = await saveIntakeExamAnswers(
        record.id,
        { answers, complete: true },
        accessToken,
      );
      const mapped = mapInstance(updated);
      intakeLoadSeqRef.current += 1;
      intakeDraftDirtyRef.current = false;
      setDetail(mapped);
      upsertIntake(mapped);
      setIntakeAnswersDraft(mapped.intakeExam?.answers ?? {});
      await refetchListsAfterChange();
    } catch (e) {
      Alert.alert(isRTL ? "فشل الإرسال" : "Submit failed", (e as Error).message);
    } finally {
      setSavingIntake(false);
    }
  };

  const resetIntakeExam = () => {
    if (!record?.intakeExam || !accessToken || isDoctorView) return;
    Alert.alert(
      isRTL ? "إعادة تعيين الإجابات" : "Reset answers",
      isRTL
        ? "سيتم مسح جميع إجاباتك لهذا الفحص."
        : "This will clear all your answers for this exam.",
      [
        { text: isRTL ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: isRTL ? "إعادة تعيين" : "Reset",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setSavingIntake(true);
              try {
                const updated = await resetIntakeExamAnswers(record.id, accessToken);
                const mapped = mapInstance(updated);
                intakeLoadSeqRef.current += 1;
                intakeDraftDirtyRef.current = false;
                setDetail(mapped);
                upsertIntake(mapped);
                setIntakeAnswersDraft({});
                await refetchListsAfterChange();
              } catch (e) {
                Alert.alert(isRTL ? "فشل" : "Failed", (e as Error).message);
              } finally {
                setSavingIntake(false);
              }
            })();
          },
        },
      ],
    );
  };

  const openLinkedDoc = (docId: string) => {
    if (isDoctorView && patientUserId) {
      router.push({
        pathname: "/medical/[id]",
        params: { id: docId, doctorView: "1", patientUserId },
      });
    } else {
      router.push(`/medical/${docId}`);
    }
  };

  const openLinkedConsultation = (consultation: LinkedConsultationSummary) => {
    const peerId = isDoctorView ? consultation.patientId : consultation.doctorId;
    router.push({ pathname: "/chat/[id]", params: { id: peerId } });
  };

  const printPrescription = async () => {
    if (!accessToken || !record || !derived.canPrintPrescription) return;
    const ownerId = record.ownerId || patientUserId || profile?.id;
    if (!ownerId) return;
    const pendingTab = openBlankPdfTab();
    setPrintingPrescription(true);
    try {
      const { pdf_url } = await fetchPrescriptionPdf(
        ownerId,
        record.id,
        accessToken,
        getApiLang(),
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

  return {
    id,
    profile,
    accessToken,
    isDoctorView,
    patientUserId,
    needsDoctorAccess,
    hasDoctorAccess,
    accessChecked,
    record,
    loadState,
    loadingDetail,
    newSymptom,
    setNewSymptom,
    addingSymptom,
    editDesc,
    setEditDesc,
    editingDiagnosis,
    setEditingDiagnosis,
    savingDiagnosis,
    zoomImageUri,
    setZoomImageUri,
    pdfView,
    setPdfView,
    openPdfAttachment: () => {
      if (!record?.fileUrl) return;
      setPdfView({ uri: record.fileUrl, fileName: record.fileName });
    },
    editingLabDetails,
    setEditingLabDetails,
    editTitle,
    setEditTitle,
    editNotes,
    setEditNotes,
    savingLabDetails,
    generatingDetails,
    saveLabDetails,
    generateLabDetails,
    intakeAnswersDraft,
    setIntakeAnswersDraft: updateIntakeAnswersDraft,
    intakeExamTakerRef,
    savingIntake,
    saveIntakeDraft,
    submitIntakeExam,
    resetIntakeExam,
    printingPrescription,
    printPrescription,
    ...derived,
    saveDiagnosisEdit,
    submitSymptom,
    confirmDelete,
    openLinkedDoc,
    openLinkedConsultation,
    goBack: () => {
      navigateBack(router, "/(tabs)/records");
    },
  };
}
