import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
  Activity,
  Beaker,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Heart,
  Pill,
  ScanLine,
  Stethoscope,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DiagnosisChatModal } from "@/components/DiagnosisChatModal";
import type { DiagnosisSubmitPayload } from "@/components/DiagnosisChatForm";
import { MedicalHistoryFilterPanel } from "@/components/MedicalHistoryFilterPanel";
import { AssignIntakeExamDialog } from "@/components/intake/AssignIntakeExamDialog";
import { BodySkeletonView, bodyFigureViewportHeight } from "@/components/records/BodySkeletonView";
import { DoctorMedicalRequestDialog } from "@/components/medical/DoctorMedicalRequestDialog";
import { PatientMedicalRequestsPanel } from "@/components/medical/PatientMedicalRequestsPanel";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { MedicalRecordAddBar } from "@/components/records/MedicalRecordAddBar";
import { MedicalRecordsDesktopDashboard } from "@/components/records/MedicalRecordsDesktopDashboard";
import {
  RecordsBottomChrome,
  recordsBottomChromeHeight,
} from "@/components/records/RecordsBottomChrome";
import {
  RecordsViewModeToggle,
  type RecordsViewMode,
} from "@/components/records/RecordsViewModeToggle";
import {
  DoctorClinicalActionBar,
  type ClinicalActionKey,
} from "@/components/records/DoctorClinicalActionBar";
import {
  SHOW_INTAKE_RECORDS,
  withoutIntakeRecords,
} from "@/components/records/medicalRecordCategories";
import { buildMedicalAddEntryHref } from "@/domains/medical/addHref";
import { buildBodyPartRecordsHref } from "@/domains/medical/bodyPartHref";
import type { BodyPart } from "@/domains/medical/bodyParts";
import { fetchActiveConsultation } from "@/domains/consultations/api";
import {
  EMPTY_MEDICAL_FILTERS,
  filterMedicalRecords,
  hasActiveFilters,
  type MedicalHistoryFilters,
} from "@/domains/medical/search";
import { createDiagnosis } from "@/domains/medical/api";
import { useAuthStore } from "@/domains/auth/store";
import { useProductTourStore } from "@/domains/onboarding/productTourStore";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { WEB_CONTENT_PADDING } from "@/constants/webLayout";
import { EHR } from "@/constants/ehrDesign";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

const CATEGORIES: {
  key: MedicalCategory;
  labelEn: string;
  labelAr: string;
  Icon: typeof Activity;
  color: string;
}[] = [
  { key: "diagnosis", labelEn: "Diagnosis", labelAr: "التشخيص", Icon: Activity, color: "#ef4444" },
  { key: "lab", labelEn: "Lab results", labelAr: "نتائج المختبر", Icon: Beaker, color: "#10b981" },
  { key: "xray", labelEn: "X-rays & scans", labelAr: "الأشعة والمسح", Icon: ScanLine, color: "#8b5cf6" },
  { key: "prescription", labelEn: "Prescription", labelAr: "روشتة", Icon: Pill, color: "#f59e0b" },
  { key: "intake", labelEn: "Intake exam", labelAr: "فحص الاستقبال", Icon: ClipboardList, color: "#3057F2" },
];

const SEARCHABLE_CATEGORIES: MedicalCategory[] = ["diagnosis", "lab", "xray", "prescription"];
import { isMedicalImageAttachment, isMedicalPdfAttachment } from "@/components/medical/medicalRecordMeta";
import { MedicalPdfViewer, type MedicalPdfView } from "@/components/medical/MedicalPdfViewer";

export interface MedicalHistoryListProps {
  records: MedicalRecord[];
  patientUserId: string;
  /** Shown in the desktop dashboard patient summary card. */
  patientLabel?: string;
  canAdd?: boolean;
  doctorView?: boolean;
  showIntake?: boolean;
  onRecordsChanged?: () => void;
  /** Controlled Skeleton / Tabular mode (uncontrolled if omitted). */
  viewMode?: RecordsViewMode;
  /** Fired when Skeleton / Tabular mode changes (e.g. parent disables page scroll). */
  onViewModeChange?: (mode: RecordsViewMode) => void;
  /** Hide embedded view toggle + clinical pills (desktop header owns them). */
  hideTopChrome?: boolean;
  /** Exposes consultation + clinical handlers for the page header action bar. */
  onClinicalBarState?: (state: {
    consultationOpen: boolean;
    onAction: (key: ClinicalActionKey) => void;
  }) => void;
}

export function MedicalHistoryList({
  records,
  patientUserId,
  patientLabel,
  canAdd = true,
  doctorView = false,
  showIntake = SHOW_INTAKE_RECORDS,
  onRecordsChanged,
  viewMode: viewModeProp,
  onViewModeChange,
  hideTopChrome = false,
  onClinicalBarState,
}: MedicalHistoryListProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const role = useAuthStore((s) => s.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const doctorId = useAuthStore((s) => s.doctorId);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [pdfView, setPdfView] = useState<MedicalPdfView | null>(null);
  const [requestDialog, setRequestDialog] = useState<"lab" | "xray" | null>(null);
  const [filters, setFilters] = useState<MedicalHistoryFilters>(EMPTY_MEDICAL_FILTERS);
  const [openSection, setOpenSection] = useState<MedicalCategory | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<RecordsViewMode>("table");
  const viewMode = viewModeProp ?? internalViewMode;
  const setViewMode = useCallback(
    (mode: RecordsViewMode) => {
      if (viewModeProp === undefined) setInternalViewMode(mode);
      onViewModeChange?.(mode);
    },
    [viewModeProp, onViewModeChange],
  );
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [activeConsultationId, setActiveConsultationId] = useState<string | undefined>();
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [savingDiagnosis, setSavingDiagnosis] = useState(false);
  const [intakeExamModalOpen, setIntakeExamModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [vitalsSelected, setVitalsSelected] = useState(false);
  const advanceOnAnchorTap = useProductTourStore((s) => s.advanceOnAnchorTap);

  // Doctors add via clinical pills during an open consult — hide generic add chrome.
  const showAddChrome = canAdd && !doctorView;

  useFocusEffect(
    useCallback(() => {
      if (!doctorView || !accessToken || !patientUserId) {
        setConsultationOpen(false);
        setActiveConsultationId(undefined);
        return;
      }
      let cancelled = false;
      void fetchActiveConsultation(patientUserId, accessToken)
        .then((c) => {
          if (cancelled) return;
          const open = c?.status === "open";
          setConsultationOpen(open);
          setActiveConsultationId(open ? c?.id : undefined);
        })
        .catch(() => {
          if (cancelled) return;
          setConsultationOpen(false);
          setActiveConsultationId(undefined);
        });
      return () => {
        cancelled = true;
      };
    }, [doctorView, accessToken, patientUserId]),
  );

  const visibleCategories = showIntake
    ? CATEGORIES
    : CATEGORIES.filter((c) => c.key !== "intake");

  const displayRecords = useMemo(
    () => (showIntake ? records : withoutIntakeRecords(records)),
    [records, showIntake],
  );

  const grouped = useMemo(() => {
    const out: Record<MedicalCategory, MedicalRecord[]> = {
      diagnosis: [],
      lab: [],
      xray: [],
      prescription: [],
      intake: [],
    };
    for (const r of displayRecords) out[r.category]?.push(r);
    return out;
  }, [displayRecords]);

  const effectiveFilters = useMemo(
    (): MedicalHistoryFilters => ({
      ...filters,
      bodyPart: selectedBodyPart ?? filters.bodyPart,
    }),
    [filters, selectedBodyPart],
  );

  const filteredGrouped = useMemo(() => {
    const out = { ...grouped };
    for (const key of SEARCHABLE_CATEGORIES) {
      out[key] = filterMedicalRecords(grouped[key], effectiveFilters);
    }
    return out;
  }, [grouped, effectiveFilters]);

  const isFiltering = hasActiveFilters(effectiveFilters);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const dateLocale = localeTag(isRTL);

  const openRecord = (item: MedicalRecord) => {
    if (doctorView) {
      router.push({
        pathname: "/medical/[id]",
        params: { id: item.id, doctorView: "1", patientUserId },
      });
    } else {
      router.push(`/medical/${item.id}`);
    }
  };

  const openAdd = () => {
    router.push(
      buildMedicalAddEntryHref({
        patientUserId,
        isPatient: role?.toLowerCase() === "patient",
      }) as never,
    );
  };

  const openPrescriptionScreen = () => {
    if (!consultationOpen) return;
    router.push({
      pathname: "/medical/prescription/add",
      params: { patientUserId },
    });
  };

  const handleClinicalAction = useCallback(
    (key: ClinicalActionKey) => {
      if (!consultationOpen) return;
      switch (key) {
        case "lab":
          setRequestDialog("lab");
          break;
        case "xray":
          setRequestDialog("xray");
          break;
        case "prescription":
          openPrescriptionScreen();
          break;
        case "diagnosis":
          setDiagnosisModalOpen(true);
          break;
        case "intake":
          setIntakeExamModalOpen(true);
          break;
        default:
          break;
      }
    },
    [consultationOpen, patientUserId],
  );

  useEffect(() => {
    onClinicalBarState?.({ consultationOpen, onAction: handleClinicalAction });
  }, [consultationOpen, handleClinicalAction, onClinicalBarState]);

  const handleDiagnosisSubmit = async (payload: DiagnosisSubmitPayload) => {
    if (!accessToken || !doctorId || !consultationOpen) return;
    setSavingDiagnosis(true);
    try {
      await createDiagnosis(
        {
          desc: payload.description,
          patient_id: patientUserId,
          doctor_id: doctorId,
          symptoms: payload.symptoms.map((desc) => ({ desc })),
          document_ids: payload.documentIds.length > 0 ? payload.documentIds : undefined,
          body_part: payload.bodyPart,
          prescription_id: payload.prescription_id,
          prescription: payload.prescription,
          intake_exam_assignment_id: payload.intake_exam_assignment_id,
          intake_exam: payload.intake_exam,
        },
        accessToken,
      );
      setDiagnosisModalOpen(false);
      onRecordsChanged?.();
    } catch (e) {
      Alert.alert(
        isRTL ? "تعذر الحفظ" : "Could not save",
        e instanceof Error ? e.message : isRTL ? "حاول مرة أخرى." : "Please try again.",
      );
    } finally {
      setSavingDiagnosis(false);
    }
  };

  const handleFiltersChange = (next: MedicalHistoryFilters) => {
    setFilters(next);
    setSelectedBodyPart(next.bodyPart);
  };

  const handleSelectPart = (part: BodyPart | null) => {
    setSelectedBodyPart(part);
    setFilters((prev) => ({ ...prev, bodyPart: part }));
  };

  const effectiveViewMode: RecordsViewMode = viewMode;

  const handleSelectVitals = useCallback(() => {
    setVitalsSelected((prev) => {
      const next = !prev;
      if (next) {
        setSelectedRecord(null);
        setOpenSection(null);
      }
      return next;
    });
  }, []);

  const handleSelectRecord = useCallback((record: MedicalRecord) => {
    setVitalsSelected(false);
    setSelectedRecord(record);
  }, []);

  const handleOpenSectionChange = useCallback((key: MedicalCategory | null) => {
    setVitalsSelected(false);
    setOpenSection(key);
  }, []);

  React.useEffect(() => {
    if (!isDesktop || effectiveViewMode !== "table") return;
    if (vitalsSelected) return;
    if (!openSection) {
      setSelectedRecord(null);
      return;
    }
    const isSearchable = SEARCHABLE_CATEGORIES.includes(openSection);
    const items = isSearchable ? filteredGrouped[openSection] : grouped[openSection];
    if (items.length === 0) {
      setSelectedRecord(null);
      return;
    }
    setSelectedRecord((prev) =>
      prev && items.some((item) => item.id === prev.id) ? prev : items[0],
    );
  }, [isDesktop, effectiveViewMode, vitalsSelected, openSection, filteredGrouped, grouped]);

  const openBodyPart = (part: BodyPart) => {
    router.push(
      buildBodyPartRecordsHref(part, { patientUserId }) as never,
    );
  };

  const openVitals = () => {
    if (doctorView) {
      router.push({
        pathname: "/medical/vitals",
        params: { doctorView: "1", patientUserId },
      });
    } else {
      router.push("/medical/vitals");
    }
  };

  const vitalsSection = (
    <View
      style={[styles.categoryBlock, effectiveViewMode === "skeleton" && styles.categoryBlockSplit]}
    >
      <View
        style={[
          styles.categoryCard,
          {
            flexDirection: dir,
            backgroundColor: colors.card,
            borderColor: vitalsSelected ? EHR.brand : colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (isDesktop && effectiveViewMode === "table") {
              handleSelectVitals();
            } else {
              openVitals();
            }
          }}
          style={[styles.categoryTogglePart, { flexDirection: dir }]}
        >
          <View style={[styles.iconBubble, { backgroundColor: `${EHR.brand}22` }]}>
            <Heart size={16} color={EHR.brand} />
          </View>
          <Text style={[styles.categoryLabel, { color: colors.foreground, textAlign }]}>
            {isRTL ? "العلامات الحيوية" : "Vital signs"}
          </Text>
          {isDesktop && effectiveViewMode === "table" ? (
            vitalsSelected ? (
              <ChevronUp size={16} color={EHR.brand} />
            ) : (
              <ChevronDown size={16} color={colors.mutedForeground} />
            )
          ) : (
            <ChevronDown
              size={16}
              color={colors.mutedForeground}
              style={{ transform: [{ rotate: isRTL ? "90deg" : "-90deg" }] }}
            />
          )}
        </Pressable>
      </View>
      {isDesktop && effectiveViewMode === "table" && vitalsSelected ? (
        <View
          style={[
            styles.vitalsRow,
            {
              flexDirection: dir,
              borderColor: EHR.brand,
              backgroundColor: EHR.brandSoft,
            },
          ]}
        >
          <Text style={[styles.recordTitle, { color: colors.foreground, textAlign }]}>
            {isRTL ? "العلامات الحيوية الأخيرة" : "Recent vital signs"}
          </Text>
          <Text style={[styles.recordValue, { color: colors.mutedForeground, textAlign }]}>
            {doctorView
              ? isRTL
                ? "قراءات المريض"
                : "Patient-reported readings"
              : isRTL
                ? "تحديث قراءاتك"
                : "Update your readings"}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const recordsPanel = (
    <>
      {vitalsSection}
      {visibleCategories.map(({ key, labelEn, labelAr, Icon, color }) => {
    const label = isRTL ? labelAr : labelEn;
    const isOpen = openSection === key;
    const isSearchable = SEARCHABLE_CATEGORIES.includes(key);
    const allItems = grouped[key];
    const items = isSearchable ? filteredGrouped[key] : allItems;
    const sectionFiltering = isSearchable && isFiltering;

    return (
      <View
        key={key}
        style={[styles.categoryBlock, effectiveViewMode === "skeleton" && styles.categoryBlockSplit]}
      >
        <View
          style={[
            styles.categoryCard,
            {
              flexDirection: dir,
              backgroundColor: colors.card,
              borderColor: isOpen ? color : colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => handleOpenSectionChange(isOpen ? null : key)}
            style={[styles.categoryTogglePart, { flexDirection: dir }]}
          >
            <View style={[styles.iconBubble, { backgroundColor: color + "22" }]}>
              <Icon size={16} color={color} />
            </View>
            <Text
              style={[
                styles.categoryLabel,
                { color: colors.foreground, textAlign },
              ]}
            >
              {label}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: color + "18" }]}>
              <Text style={[styles.categoryCount, { color }]}>
                {sectionFiltering ? `${items.length}/${allItems.length}` : allItems.length}
              </Text>
            </View>
            {isOpen ? (
              <ChevronUp size={16} color={color} />
            ) : (
              <ChevronDown size={16} color={colors.mutedForeground} />
            )}
          </Pressable>
        </View>

        {isOpen && (
          <>
            {allItems.length === 0 ? (
              <Text
                style={[
                  styles.emptyCat,
                  {
                    color: colors.mutedForeground,
                    borderColor: colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {isRTL ? "لا توجد إدخالات بعد" : "No entries yet"}
              </Text>
            ) : items.length === 0 ? (
              <Text
                style={[
                  styles.emptyCat,
                  {
                    color: colors.mutedForeground,
                    borderColor: colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
              >
                {isRTL ? "لا توجد نتائج للبحث" : "No matches for your search"}
              </Text>
            ) : (
              <View style={styles.recordList}>
                {items.map((item, index) => {
                  const isImg =
                    !!item.fileUrl &&
                    isMedicalImageAttachment(item.fileUrl, item.fileName);
                  const isPdf =
                    !!item.fileUrl &&
                    isMedicalPdfAttachment(item.fileUrl, item.fileName);
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.recordCard,
                        index > 0 ? styles.recordCardSpaced : null,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      {item.fileUrl && isImg && (
                        <Pressable onPress={() => setViewingFileUrl(item.fileUrl!)}>
                          <Image
                            source={{ uri: item.fileUrl }}
                            style={styles.recordThumb}
                            resizeMode="cover"
                          />
                        </Pressable>
                      )}
                      {item.fileUrl && !isImg && isPdf && (
                        <Pressable
                          onPress={() =>
                            setPdfView({ uri: item.fileUrl!, fileName: item.fileName })
                          }
                          style={[styles.recordPdfBox, { backgroundColor: colors.muted }]}
                        >
                          <FileText size={36} color={colors.primary} />
                          <Text style={[styles.recordPdfLabel, { color: colors.mutedForeground, textAlign }]}>
                            {item.fileName ?? (isRTL ? "عرض PDF" : "View PDF")}
                          </Text>
                        </Pressable>
                      )}
                      {item.fileUrl && !isImg && !isPdf && (
                        <Pressable
                          onPress={() => Linking.openURL(item.fileUrl!)}
                          style={[styles.recordPdfBox, { backgroundColor: colors.muted }]}
                        >
                          <FileText size={36} color={colors.primary} />
                          <Text style={[styles.recordPdfLabel, { color: colors.mutedForeground, textAlign }]}>
                            {item.fileName ?? (isRTL ? "عرض المستند" : "View document")}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        testID={doctorView && index === 0 ? "records-record-row" : undefined}
                        onPress={() => {
                          if (doctorView && index === 0) {
                            advanceOnAnchorTap("records-record-row");
                          }
                          openRecord(item);
                        }}
                        style={({ pressed }) => [
                          styles.recordInfoRow,
                          { flexDirection: dir, backgroundColor: pressed ? colors.muted : "transparent" },
                        ]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text
                            style={[
                              styles.recordTitle,
                              { color: colors.foreground, textAlign },
                            ]}
                          >
                            {item.title}
                          </Text>
                          {item.category === "diagnosis" && item.doctorName ? (
                            <Text
                              style={[
                                styles.recordValue,
                                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                              ]}
                              numberOfLines={1}
                            >
                              {isRTL ? `د. ${item.doctorName}` : `Dr. ${item.doctorName}`}
                            </Text>
                          ) : null}
                          {item.bodyPart ? (
                            <Text
                              style={[
                                styles.bodyPartChip,
                                {
                                  color: colors.primary,
                                  backgroundColor: `${colors.primary}14`,
                                  alignSelf: isRTL ? "flex-end" : "flex-start",
                                },
                              ]}
                            >
                              {t.records.bodyParts[item.bodyPart]}
                            </Text>
                          ) : null}
                          {item.category === "diagnosis" && item.symptoms?.length ? (
                            <Text
                              style={[
                                styles.recordValue,
                                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                              ]}
                              numberOfLines={1}
                            >
                              {item.symptoms.length}{" "}
                              {isRTL ? "عرض" : item.symptoms.length === 1 ? "symptom" : "symptoms"}
                            </Text>
                          ) : item.notes ? (
                            <Text
                              style={[
                                styles.recordValue,
                                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                              ]}
                              numberOfLines={2}
                            >
                              {item.notes}
                            </Text>
                          ) : item.value ? (
                            <Text
                              style={[
                                styles.recordValue,
                                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                              ]}
                            >
                              {item.value}
                            </Text>
                          ) : null}
                          <Text
                            style={[
                              styles.recordDate,
                              { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                            ]}
                          >
                            {new Date(item.date).toLocaleDateString(dateLocale)}
                          </Text>
                        </View>
                        <ChevronDown
                          size={16}
                          color={colors.mutedForeground}
                          style={{ transform: [{ rotate: isRTL ? "90deg" : "-90deg" }] }}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </View>
    );
      })}
    </>
  );

  const splitHeight = bodyFigureViewportHeight(screenHeight, screenWidth);
  /** Doctor skeleton host is non-scrolling — fill leftover space so pending banners don't clip the figure. */
  const fillSkeletonViewport =
    doctorView && effectiveViewMode === "skeleton" && isDesktop;

  const bottomChromePad = recordsBottomChromeHeight({
    canAdd: showAddChrome,
    extra: 0,
    safeAreaBottom: insets.bottom,
  });

  return (
    <View
      style={[
        // Doctor patient page scrolls externally — avoid flex:1 locking height to the viewport.
        doctorView || isDesktop ? styles.desktopRoot : styles.mobileRoot,
        doctorView && isDesktop && effectiveViewMode === "table"
          ? styles.desktopRootFill
          : null,
        fillSkeletonViewport ? styles.desktopRootSkeletonFill : null,
        effectiveViewMode === "skeleton" && !isDesktop
          ? styles.mobileRootSkeleton
          : null,
        !isDesktop && !doctorView && bottomChromePad > 0
          ? { paddingBottom: bottomChromePad }
          : null,
      ]}
    >
      {!hideTopChrome ? (
        <View style={styles.viewToggleWrap}>
          <RecordsViewModeToggle mode={viewMode} onChange={setViewMode} />
        </View>
      ) : null}

      {!hideTopChrome && doctorView && accessToken && consultationOpen ? (
        <View style={styles.clinicalBarWrap}>
          <DoctorClinicalActionBar onAction={handleClinicalAction} />
        </View>
      ) : null}

      {effectiveViewMode === "table" || isDesktop ? (
        isDesktop && effectiveViewMode === "table" ? null : (
          <>
            <View style={styles.chromeBlock}>
              <MedicalHistoryFilterPanel
                filters={effectiveFilters}
                onChange={handleFiltersChange}
                isRTL={isRTL}
                dir={dir}
              />
              <PatientMedicalRequestsPanel patientUserId={patientUserId} />
            </View>
          </>
        )
      ) : (
        <View style={styles.chromeBlock}>
          <PatientMedicalRequestsPanel patientUserId={patientUserId} />
        </View>
      )}

      {effectiveViewMode === "skeleton" ? (
        isDesktop ? (
          <View
            style={[
              styles.splitRow,
              fillSkeletonViewport
                ? styles.splitRowFill
                : { height: splitHeight },
              { flexDirection: dir },
            ]}
          >
            <View style={[styles.splitPane, styles.splitSkeleton, { borderColor: colors.border }]}>
              <BodySkeletonView
                selectedPart={selectedBodyPart}
                records={displayRecords}
                onSelectPart={handleSelectPart}
              />
            </View>
            <ScrollView
              style={[styles.splitPane, styles.splitRecords]}
              contentContainerStyle={styles.splitRecordsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {recordsPanel}
            </ScrollView>
          </View>
        ) : (
          <View style={[styles.mobileSkeletonPane, { borderColor: colors.border }]}>
            <BodySkeletonView
              selectedPart={selectedBodyPart}
              records={displayRecords}
              onSelectPart={handleSelectPart}
              onOpenPart={openBodyPart}
            />
          </View>
        )
      ) : isDesktop && effectiveViewMode === "table" ? (
        <View style={styles.desktopDashboardWrap}>
          <MedicalRecordsDesktopDashboard
          patientLabel={patientLabel}
          categories={visibleCategories}
          grouped={grouped}
          filteredGrouped={filteredGrouped}
          searchableCategories={SEARCHABLE_CATEGORIES}
          isFiltering={isFiltering}
          openSection={openSection}
          onOpenSectionChange={handleOpenSectionChange}
          selectedRecord={selectedRecord}
          onSelectRecord={handleSelectRecord}
          vitalsSelected={vitalsSelected}
          onSelectVitals={handleSelectVitals}
          onOpenPdf={setPdfView}
          onZoomImage={setViewingFileUrl}
          doctorView={doctorView}
          patientUserId={patientUserId}
          recordRowTestId={doctorView ? "records-record-row" : undefined}
          onRecordRowTourTap={() => advanceOnAnchorTap("records-record-row")}
          filtersSlot={
            <MedicalHistoryFilterPanel
              embedded
              filters={effectiveFilters}
              onChange={handleFiltersChange}
              isRTL={isRTL}
              dir={dir}
            />
          }
          requestsSlot={<PatientMedicalRequestsPanel patientUserId={patientUserId} embedded />}
        />
        </View>
      ) : (
        recordsPanel
      )}

      {isDesktop && showAddChrome && effectiveViewMode !== "table" ? (
        <MedicalRecordAddBar
          onAdd={openAdd}
          showDiagnosis={false}
          layout="inline"
        />
      ) : null}
      {!isDesktop && showAddChrome ? (
        <RecordsBottomChrome
          canAdd
          onAdd={openAdd}
          showDiagnosis={false}
        />
      ) : null}

      {doctorView && accessToken && requestDialog ? (
        <DoctorMedicalRequestDialog
          visible
          patientUserId={patientUserId}
          accessToken={accessToken}
          initialType={requestDialog}
          onClose={() => setRequestDialog(null)}
        />
      ) : null}

      {doctorView && accessToken ? (
        <DiagnosisChatModal
          visible={diagnosisModalOpen}
          isRTL={isRTL}
          patientUserId={patientUserId}
          accessToken={accessToken}
          consultationId={activeConsultationId}
          saving={savingDiagnosis}
          onClose={() => {
            if (savingDiagnosis) return;
            setDiagnosisModalOpen(false);
          }}
          onSubmit={(payload) => void handleDiagnosisSubmit(payload)}
        />
      ) : null}

      {doctorView && accessToken ? (
        <AssignIntakeExamDialog
          visible={intakeExamModalOpen}
          isRTL={isRTL}
          patientUserId={patientUserId}
          accessToken={accessToken}
          onClose={() => setIntakeExamModalOpen(false)}
          onAssigned={() => {
            onRecordsChanged?.();
          }}
        />
      ) : null}

      <FullscreenImageViewer
        uri={viewingFileUrl}
        onClose={() => setViewingFileUrl(null)}
      />

      <MedicalPdfViewer
        view={pdfView}
        onClose={() => setPdfView(null)}
        isRTL={isRTL}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mobileRoot: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    position: "relative",
  },
  mobileRootSkeleton: {
    flex: 1,
    minHeight: 0,
  },
  mobileSkeletonPane: {
    flex: 1,
    minHeight: 280,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  desktopRoot: {
    width: "100%",
    paddingBottom: 24,
  },
  desktopRootFill: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    paddingBottom: 24,
  },
  desktopDashboardWrap: {
    paddingHorizontal: WEB_CONTENT_PADDING,
    flex: 1,
    minHeight: 0,
    alignSelf: "stretch",
  },
  desktopRootSkeletonFill: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 12,
  },
  chromeBlock: {
    flexShrink: 0,
  },
  viewToggleWrap: {
    paddingHorizontal: WEB_CONTENT_PADDING,
    paddingTop: 8,
    flexShrink: 0,
  },
  clinicalBarWrap: {
    paddingHorizontal: WEB_CONTENT_PADDING,
    paddingTop: 8,
    paddingBottom: 4,
    flexShrink: 0,
  },
  splitRow: {
    marginTop: 8,
    marginHorizontal: 8,
    marginBottom: 40,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  splitRowFill: {
    flex: 1,
    minHeight: 0,
    marginBottom: 8,
  },
  skeletonOnly: {
    flex: 1,
    minHeight: 0,
    marginTop: 4,
    marginBottom: 8,
    width: "100%",
    alignItems: "center",
  },
  splitPane: {
    minWidth: 0,
    minHeight: 0,
  },
  splitSkeleton: {
    flex: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    padding: 10,
    paddingBottom: 28,
    backgroundColor: "transparent",
  },
  splitRecords: {
    flex: 6,
  },
  splitRecordsContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  categoryBlock: { paddingHorizontal: 16, paddingTop: 10 },
  categoryBlockSplit: { paddingHorizontal: 8, paddingTop: 6 },
  vitalsRow: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  categoryCard: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
    overflow: "hidden",
  },
  categoryTogglePart: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: { fontSize: 15, fontWeight: "700", flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  categoryCount: { fontSize: 12, fontWeight: "700" },
  emptyCat: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    fontSize: 13,
    marginBottom: 4,
  },
  recordList: { gap: 0 },
  recordCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  recordCardSpaced: { marginTop: 8 },
  recordThumb: { width: "100%", height: 160 },
  recordPdfBox: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  recordPdfLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  recordInfoRow: { alignItems: "flex-start", gap: 10, padding: 14 },
  recordTitle: { fontSize: 15, fontWeight: "700" },
  recordValue: { fontSize: 13, marginTop: 2 },
  bodyPartChip: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  recordDate: { fontSize: 11, marginTop: 4 },
  viewerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  viewerClose: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  viewerScroll: { flex: 1, alignItems: "center", justifyContent: "center" },
});
