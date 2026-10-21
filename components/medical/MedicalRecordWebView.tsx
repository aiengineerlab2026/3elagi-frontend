import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Beaker,
  Bone,
  Calendar,
  Clock,
  FileDown,
  FileText,
  Hash,
  MessageCircle,
  Pill,
  Trash2,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";

import { DoctorPatientAccessDenied } from "@/components/DoctorPatientAccessDenied";
import { IntakeExamTaker } from "@/components/intake/IntakeExamTaker";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { MedicalPdfViewer } from "@/components/medical/MedicalPdfViewer";
import { MedicalRecordAttachmentImage } from "@/components/medical/MedicalRecordAttachmentImage";
import { MedicalRecordAiInsightSection } from "@/components/medical/MedicalRecordAiInsightSection";
import {
  isMedicalImageAttachment,
  MEDICAL_RECORD_CATEGORY_META,
} from "@/components/medical/medicalRecordMeta";
import { WEB_MAX_WIDTH } from "@/constants/webLayout";
import { MobileWebMenuHeader } from "@/components/web/MobileWebMenuHeader";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useMedicalRecordDetail } from "@/hooks/useMedicalRecordDetail";
import { useMobileWebTabBarHeight } from "@/hooks/useMobileWebTabBarHeight";
import { useWebLayout } from "@/hooks/useWebLayout";
import { localeTag } from "@/utils/rtl";
import type { LinkedConsultationSummary } from "@/domains/medical/types";
import {
  linkedDiagnosesForRecord,
  recordShowsLinkedDiagnoses,
} from "@/domains/medical/linkedDiagnoses";

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

function gridStyle(columns: number): ViewStyle {
  if (columns <= 1) {
    return { flexDirection: "column", gap: 16 };
  }
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap: 16,
  } as unknown as ViewStyle;
}

function spanStyle(columns: number, span: number): ViewStyle {
  if (columns <= 1 || span <= 1) return {};
  return { gridColumn: `span ${Math.min(span, columns)}` } as unknown as ViewStyle;
}

function InfoCard({
  icon,
  label,
  value,
  accent,
  colors,
  textAlign,
  dir,
  span,
  columns,
  testID,
  relaxed,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
  dir: "row" | "row-reverse";
  span?: number;
  columns: number;
  testID?: string;
  /** Higher line-height for long description text */
  relaxed?: boolean;
}) {
  return (
    <View
      testID={testID}
      style={[
        styles.infoCard,
        spanStyle(columns, span ?? 1),
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.infoCardHeader, { flexDirection: dir }]}>
        <View style={[styles.infoCardIcon, { backgroundColor: `${accent}14` }]}>{icon}</View>
        <Text style={[styles.infoCardLabel, { color: colors.mutedForeground, textAlign }]}>
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.infoCardValue,
          relaxed && styles.infoCardValueRelaxed,
          { color: colors.foreground, textAlign },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function SectionCard({
  title,
  icon,
  accent,
  colors,
  textAlign,
  dir,
  children,
  testID,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  colors: ReturnType<typeof useColors>;
  textAlign: "left" | "right";
  dir: "row" | "row-reverse";
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.sectionHeader, { flexDirection: dir }]}>
        <View style={[styles.infoCardIcon, { backgroundColor: `${accent}14` }]}>{icon}</View>
        <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function MedicalRecordWebView() {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const { isDesktop, isTablet, isMobile } = useWebLayout();
  const tabBarHeight = useMobileWebTabBarHeight();
  const mobileScrollPadding = tabBarHeight + 24;
  const dateLocale = localeTag(isRTL);
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const detail = useMedicalRecordDetail(isRTL);
  const {
    record,
    loadState,
    loadingDetail,
    needsDoctorAccess,
    accessChecked,
    hasDoctorAccess,
    label,
    color,
    Icon,
    canEditDiagnosis,
    canAddSymptom,
    canDeleteRecord,
    isDiagnosis,
    isPrescription,
    isLabOrXray,
    isDocImage,
    isDocPdf,
    isDoctorView,
    canEditLabDetails,
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
    openPdfAttachment,
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
    saveDiagnosisEdit,
    submitSymptom,
    confirmDelete,
    intakeAnswersDraft,
    setIntakeAnswersDraft,
    intakeExamTakerRef,
    savingIntake,
    saveIntakeDraft,
    submitIntakeExam,
    resetIntakeExam,
    isIntakeExam,
    canTakeIntakeExam,
    canPrintPrescription,
    printingPrescription,
    printPrescription,
    accessToken,
    openLinkedDoc,
    openLinkedConsultation,
    goBack,
  } = detail;

  const infoColumns = isDesktop ? 3 : isTablet ? 2 : 1;
  const hasMedia = (isLabOrXray || isPrescription) && !!record?.fileUrl;
  const showSplitLayout = isDesktop && hasMedia;
  const mediaImageStyle = isMobile ? styles.mediaImageMobile : styles.mediaImage;

  if (needsDoctorAccess && !accessChecked) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <MobileWebMenuHeader />
        <ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} />
      </View>
    );
  }

  if (needsDoctorAccess && !hasDoctorAccess) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <MobileWebMenuHeader />
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.content }]}>
          <Pressable onPress={goBack} style={[styles.backBtn, { flexDirection: dir }]}>
            {isRTL ? (
              <ArrowRight size={18} color={colors.primary} />
            ) : (
              <ArrowLeft size={18} color={colors.primary} />
            )}
            <Text style={[styles.backText, { color: colors.primary }]}>
              {isRTL ? "رجوع" : "Back"}
            </Text>
          </Pressable>
          <DoctorPatientAccessDenied isRTL={isRTL} />
        </View>
      </View>
    );
  }

  if (!record && loadState === "loading") {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <MobileWebMenuHeader />
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.content }]}>
          <Pressable onPress={goBack} style={[styles.backBtn, { flexDirection: dir }]}>
            {isRTL ? (
              <ArrowRight size={18} color={colors.primary} />
            ) : (
              <ArrowLeft size={18} color={colors.primary} />
            )}
            <Text style={[styles.backText, { color: colors.primary }]}>
              {isRTL ? "رجوع" : "Back"}
            </Text>
          </Pressable>
          <View style={styles.loadingBody}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, marginTop: 12, textAlign }}>
              {isRTL ? "جاري التحميل…" : "Loading record…"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <MobileWebMenuHeader />
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.content }]}>
          <Pressable onPress={goBack} style={[styles.backBtn, { flexDirection: dir }]}>
            {isRTL ? (
              <ArrowRight size={18} color={colors.primary} />
            ) : (
              <ArrowLeft size={18} color={colors.primary} />
            )}
            <Text style={[styles.backText, { color: colors.primary }]}>
              {isRTL ? "رجوع" : "Back"}
            </Text>
          </Pressable>
          <Text style={{ color: colors.mutedForeground, textAlign, marginTop: 40 }}>
            {isRTL ? "السجل غير موجود" : "Record not found"}
          </Text>
        </View>
      </View>
    );
  }

  const formattedDate = new Date(record.date).toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedCreated = new Date(record.createdAt).toLocaleString(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const renderMedia = () => {
    if (!record.fileUrl) return null;
    if (isDocImage) {
      return (
        <Pressable
          testID="medical-record-image"
          onPress={() => record.fileUrl && setZoomImageUri(record.fileUrl)}
          style={[styles.mediaCard, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <MedicalRecordAttachmentImage uri={record.fileUrl} style={mediaImageStyle} />
          <Text style={[styles.mediaHint, { color: colors.mutedForeground, textAlign }]}>
            {isRTL ? "اضغط للتكبير" : "Click to zoom"}
          </Text>
        </Pressable>
      );
    }
    if (isDocPdf) {
      return (
        <Pressable
          testID="medical-record-pdf"
          onPress={openPdfAttachment}
          style={[styles.fileCard, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <FileText size={36} color={color} />
          <Text style={{ color: colors.primary, fontWeight: "600", textAlign }}>
            {record.fileName?.trim() || (isRTL ? "عرض PDF" : "View PDF")}
          </Text>
          <Text style={[styles.mediaHint, { color: colors.mutedForeground, textAlign }]}>
            {isRTL ? "اضغط للعرض" : "Click to view"}
          </Text>
        </Pressable>
      );
    }
    return (
      <Pressable
        testID="medical-record-file"
        onPress={() => Linking.openURL(record.fileUrl!)}
        style={[styles.fileCard, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <FileText size={36} color={color} />
        <Text style={{ color: colors.primary, fontWeight: "600", textAlign }}>
          {record.fileName?.trim() || (isRTL ? "فتح الملف" : "Open attached file")}
        </Text>
      </Pressable>
    );
  };

  const renderLinkedDocs = () => {
    if (!isDiagnosis) return null;

    if (record.linkedDocuments && record.linkedDocuments.length > 0) {
      return (
        <SectionCard
          testID="medical-record-linked"
          title={isRTL ? "نتائج مرتبطة" : "Linked results"}
          icon={<Beaker size={18} color="#10b981" />}
          accent="#10b981"
          colors={colors}
          textAlign={textAlign}
          dir={dir}
        >
          <View style={styles.linkedList}>
            {record.linkedDocuments.map((doc) => {
              const docMeta = MEDICAL_RECORD_CATEGORY_META[doc.category];
              const docIsImage = isMedicalImageAttachment(doc.fileUrl, doc.fileName);
              return (
                <View
                  key={doc.id}
                  testID="medical-record-linked-row"
                  style={[
                    styles.linkedRow,
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
                        { backgroundColor: `${docMeta.color}22` },
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
                    onPress={() => openLinkedDoc(doc.id)}
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
        </SectionCard>
      );
    }

    if (!loadingDetail) {
      return (
        <SectionCard
          title={isRTL ? "نتائج مرتبطة" : "Linked results"}
          icon={<Beaker size={18} color="#10b981" />}
          accent="#10b981"
          colors={colors}
          textAlign={textAlign}
          dir={dir}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign }}>
            {isRTL
              ? "لا توجد نتائج مختبر أو أشعة أو روشتات مرتبطة"
              : "No linked lab results, imaging, or prescriptions"}
          </Text>
        </SectionCard>
      );
    }
    return null;
  };

  const renderLinkedDiagnoses = () => {
    if (!record || !recordShowsLinkedDiagnoses(record.category)) return null;
    const diagnoses = linkedDiagnosesForRecord(record);
    if (!diagnoses.length) return null;

    return (
      <SectionCard
        testID="medical-record-linked-diagnoses"
        title={isRTL ? "تشخيصات مرتبطة" : "Linked diagnoses"}
        icon={<Activity size={18} color="#ef4444" />}
        accent="#ef4444"
        colors={colors}
        textAlign={textAlign}
        dir={dir}
      >
        <View style={styles.linkedList}>
          {diagnoses.map((diag) => (
            <View
              key={diag.id}
              testID="medical-record-linked-diagnosis-row"
              style={[styles.linkedRow, { borderColor: colors.border, flexDirection: dir }]}
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
                onPress={() => openLinkedDoc(diag.id)}
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
      </SectionCard>
    );
  };

  const renderSymptoms = () => {
    if (!isDiagnosis) return null;

    return (
      <SectionCard
        testID="medical-record-symptoms"
        title={isRTL ? "الأعراض" : "Symptoms"}
        icon={<Activity size={18} color={color} />}
        accent={color}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
      >
        {loadingDetail ? (
          <ActivityIndicator color={color} style={{ marginVertical: 8 }} />
        ) : record.symptoms?.length ? (
          <View style={styles.symptomList}>
            {record.symptoms.map((s) => (
              <Text key={s.id} style={[styles.symptomLine, { color: colors.foreground, textAlign }]}>
                • {s.desc}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign }}>
            {isRTL ? "لا توجد أعراض مسجلة" : "No symptoms recorded"}
          </Text>
        )}

        {!isDoctorView && canAddSymptom && (
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
              testID="medical-record-add-symptom"
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
      </SectionCard>
    );
  };

  const renderLinkedConsultations = () => {
    if (!isPrescription || !record?.linkedConsultations?.length) return null;

    return (
      <SectionCard
        testID="medical-record-linked-consultations"
        title={isRTL ? "استشارات مرتبطة" : "Linked consultations"}
        icon={<MessageCircle size={18} color={colors.primary} />}
        accent={colors.primary}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
      >
        <View style={styles.linkedList}>
          {record.linkedConsultations.map((consultation) => {
            const title = isDoctorView
              ? consultation.patientName
              : consultation.doctorName;
            return (
              <Pressable
                key={consultation.id}
                testID="medical-record-linked-consultation-row"
                onPress={() => openLinkedConsultation(consultation)}
                style={[styles.linkedRow, { borderColor: colors.border, flexDirection: dir }]}
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
      </SectionCard>
    );
  };

  const renderMedications = () => {
    if (!isPrescription || !record) return null;

    return (
      <SectionCard
        testID="medical-record-medications"
        title={isRTL ? "الأدوية" : "Medications"}
        icon={<Pill size={18} color={color} />}
        accent={color}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
      >
        {canPrintPrescription ? (
          <Pressable
            testID="medical-record-print-prescription"
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
          <View style={styles.symptomList}>
            {record.medications.map((med, index) => (
              <View
                key={med.id ?? `med-${index}`}
                style={[styles.medRow, { borderColor: colors.border, backgroundColor: colors.muted }]}
              >
                <Text style={[styles.medName, { color: colors.foreground, textAlign }]}>
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
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign }}>
            {isRTL ? "لا توجد أدوية مسجلة" : "No medications recorded"}
          </Text>
        )}
      </SectionCard>
    );
  };

  const renderIntakeExam = () => {
    if (!isIntakeExam || !record?.intakeExam) return null;
    const exam = record.intakeExam;
    const readOnly = isDoctorView || !canTakeIntakeExam;

    return (
      <SectionCard
        testID="medical-record-intake-exam"
        title={
          readOnly
            ? isRTL
              ? "إجابات المريض"
              : "Patient answers"
            : isRTL
              ? "أكمل الفحص"
              : "Complete exam"
        }
        icon={<FileText size={18} color={color} />}
        accent={color}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
      >
        <IntakeExamTaker
          ref={intakeExamTakerRef}
          isRTL={isRTL}
          questions={exam.questions}
          answers={readOnly ? exam.answers : intakeAnswersDraft}
          readOnly={readOnly}
          accessToken={accessToken ?? undefined}
          onChange={setIntakeAnswersDraft}
        />
        {canTakeIntakeExam ? (
          <View
            style={[
              styles.intakeActions,
              { borderTopColor: colors.border, flexDirection: dir },
            ]}
          >
            <Pressable
              onPress={resetIntakeExam}
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
              onPress={() => void saveIntakeDraft()}
              disabled={savingIntake}
              style={[styles.addSymptomBtn, { backgroundColor: colors.muted }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                {isRTL ? "حفظ مسودة" : "Save draft"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void submitIntakeExam()}
              disabled={savingIntake}
              style={[styles.addSymptomBtn, { backgroundColor: color }]}
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
      </SectionCard>
    );
  };

  const renderLabDetailsEdit = () => {
    if (!canEditLabDetails || !record) return null;

    return (
      <SectionCard
        title={isRTL ? "تفاصيل السجل" : "Record details"}
        icon={<FileText size={18} color={color} />}
        accent={color}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
      >
        {editingLabDetails ? (
          <View style={{ gap: 12 }}>
            <AppTextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder={isRTL ? "العنوان" : "Title"}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.editInput,
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
                styles.editInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  textAlign,
                  minHeight: 100,
                },
              ]}
            />
            <View style={[styles.editActions, { flexDirection: dir }]}>
              <Pressable
                onPress={saveLabDetails}
                disabled={savingLabDetails || !editTitle.trim() || !editNotes.trim()}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor:
                      editTitle.trim() && editNotes.trim() ? color : colors.muted,
                    opacity: savingLabDetails ? 0.6 : 1,
                  },
                ]}
              >
                {savingLabDetails ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{isRTL ? "حفظ" : "Save"}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditingLabDetails(false);
                  setEditTitle(record.title);
                  setEditNotes(record.notes ?? "");
                }}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {record.notes ? (
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 15,
                  lineHeight: 26,
                  textAlign,
                }}
              >
                {record.notes}
              </Text>
            ) : null}
            <View style={[styles.editActions, { flexDirection: dir }]}>
              <Pressable
                onPress={() => {
                  setEditTitle(record.title);
                  setEditNotes(record.notes ?? "");
                  setEditingLabDetails(true);
                }}
              >
                <Text style={{ color: color, fontWeight: "700" }}>
                  {isRTL ? "تعديل العنوان والوصف" : "Edit title & description"}
                </Text>
              </Pressable>
              {isDocImage ? (
                <Pressable
                  onPress={() => void generateLabDetails()}
                  disabled={generatingDetails}
                  style={{ opacity: generatingDetails ? 0.6 : 1 }}
                >
                  {generatingDetails ? (
                    <ActivityIndicator size="small" color={color} />
                  ) : (
                    <Text style={{ color, fontWeight: "700" }}>
                      {isRTL ? "إنشاء بالذكاء الاصطناعي" : "Generate with AI"}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </SectionCard>
    );
  };

  const renderDiagnosisEdit = () => {
    if (!canEditDiagnosis) return null;

    return (
      <SectionCard
        title={isRTL ? "تعديل التشخيص" : "Edit diagnosis"}
        icon={<FileText size={18} color={color} />}
        accent={color}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
      >
        {editingDiagnosis ? (
          <View style={{ gap: 12 }}>
            <AppTextInput
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              placeholder={isRTL ? "وصف التشخيص…" : "Diagnosis description…"}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.editInput,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  textAlign,
                },
              ]}
            />
            <View style={[styles.editActions, { flexDirection: dir }]}>
              <Pressable
                testID="medical-record-save-diagnosis"
                onPress={saveDiagnosisEdit}
                disabled={savingDiagnosis || !editDesc.trim()}
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: editDesc.trim() ? color : colors.muted,
                    opacity: savingDiagnosis ? 0.6 : 1,
                  },
                ]}
              >
                {savingDiagnosis ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{isRTL ? "حفظ" : "Save"}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setEditingDiagnosis(false);
                  setEditDesc(record.title);
                }}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setEditingDiagnosis(true)}>
            <Text style={{ color: colors.primary, fontWeight: "700", textAlign }}>
              {isRTL ? "تعديل الوصف" : "Edit description"}
            </Text>
          </Pressable>
        )}
      </SectionCard>
    );
  };

  const infoGrid = (
    <View style={gridStyle(infoColumns)}>
      {record.value ? (
        <InfoCard
          testID="medical-record-info-card"
          icon={<Hash size={18} color={color} />}
          label={isRTL ? "القيمة" : "Value"}
          value={record.value}
          accent={color}
          colors={colors}
          textAlign={textAlign}
          dir={dir}
          columns={infoColumns}
          span={record.notes && infoColumns >= 2 ? 1 : undefined}
        />
      ) : null}

      {record.bodyPart ? (
        <InfoCard
          testID="medical-record-body-part"
          icon={<Bone size={18} color={color} />}
          label={t.records.bodyPart}
          value={t.records.bodyParts[record.bodyPart]}
          accent={color}
          colors={colors}
          textAlign={textAlign}
          dir={dir}
          columns={infoColumns}
        />
      ) : null}

      <InfoCard
        testID="medical-record-info-card"
        icon={<Calendar size={18} color={color} />}
        label={isRTL ? "التاريخ" : "Date"}
        value={formattedDate}
        accent={color}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
        columns={infoColumns}
      />

      <InfoCard
        testID="medical-record-info-card"
        icon={<Clock size={18} color={color} />}
        label={isRTL ? "أُضيف في" : "Added"}
        value={formattedCreated}
        accent={color}
        colors={colors}
        textAlign={textAlign}
        dir={dir}
        columns={infoColumns}
      />
    </View>
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <MobileWebMenuHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
          isMobile && styles.scrollContentMobile,
          isMobile && { paddingBottom: mobileScrollPadding },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { maxWidth: WEB_MAX_WIDTH.content }]}>
          {/* Toolbar */}
          <View
            style={[
              styles.toolbar,
              { flexDirection: isMobile ? "column" : dir },
              isMobile && styles.toolbarMobile,
            ]}
          >
            <Pressable
              testID="medical-record-back"
              onPress={goBack}
              style={[styles.backBtn, { flexDirection: dir, alignSelf: isMobile ? "flex-start" : undefined }]}
            >
              {isRTL ? (
                <ArrowRight size={18} color={colors.primary} />
              ) : (
                <ArrowLeft size={18} color={colors.primary} />
              )}
              <Text style={[styles.backText, { color: colors.primary }]}>
                {isRTL ? "رجوع إلى السجلات" : "Back to records"}
              </Text>
            </Pressable>

            <View
              style={[
                styles.toolbarActions,
                { flexDirection: dir },
                isMobile && styles.toolbarActionsMobile,
              ]}
            >
              <View style={[styles.categoryPill, { backgroundColor: `${color}14`, flexDirection: dir }]}>
                <Icon size={15} color={color} />
                <Text style={[styles.categoryPillText, { color }]}>{label}</Text>
              </View>
              {canDeleteRecord ? (
                <Pressable
                  testID="medical-record-delete"
                  onPress={confirmDelete}
                  style={[styles.deleteToolbarBtn, { flexDirection: dir }]}
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text style={styles.deleteToolbarText}>
                    {isRTL ? "حذف" : "Delete"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Hero */}
          <View
            style={[
              styles.hero,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isMobile ? "column" : dir,
                alignItems: isMobile ? "flex-start" : "center",
              },
              isMobile && styles.heroMobile,
            ]}
          >
            <View style={[styles.heroIcon, { backgroundColor: `${color}18` }]}>
              <Icon size={28} color={color} />
            </View>
            <View style={{ flex: 1, gap: 6, minWidth: 0, width: isMobile ? "100%" : undefined }}>
              <Text
                style={[
                  styles.heroTitle,
                  { color: colors.foreground, textAlign },
                  isMobile && styles.heroTitleMobile,
                ]}
              >
                {isDiagnosis && editingDiagnosis && canEditDiagnosis
                  ? editDesc || record.title
                  : record.title}
              </Text>
              {isDiagnosis && record.doctorName ? (
                <Text style={[styles.heroSubtitle, { color: colors.mutedForeground, textAlign }]}>
                  {isRTL ? `د. ${record.doctorName}` : `Dr. ${record.doctorName}`}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Main layout */}
          {showSplitLayout ? (
            <View style={[styles.splitRow, { flexDirection: dir }]}>
              <View style={styles.splitMedia}>{renderMedia()}</View>
              <View style={styles.splitMain}>
                {infoGrid}
                {record.notes && !canEditLabDetails ? (
                  <InfoCard
                    icon={<FileText size={18} color={color} />}
                    label={isRTL ? "الوصف" : "Description"}
                    value={record.notes}
                    accent={color}
                    colors={colors}
                    textAlign={textAlign}
                    dir={dir}
                    columns={1}
                    span={1}
                    relaxed
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <>
              {hasMedia ? renderMedia() : null}
              {infoGrid}
              {record.notes && !canEditLabDetails ? (
                <View style={gridStyle(1)}>
                  <InfoCard
                    icon={<FileText size={18} color={color} />}
                    label={
                      isRTL ? "الوصف" : isLabOrXray ? "Description" : "Notes"
                    }
                    value={record.notes}
                    accent={color}
                    colors={colors}
                    textAlign={textAlign}
                    dir={dir}
                    columns={1}
                    span={1}
                    relaxed
                  />
                </View>
              ) : null}
            </>
          )}

          {/* Full-width sections */}
          <View style={styles.sections}>
            {record.category !== "intake" ? (
              <MedicalRecordAiInsightSection record={record} />
            ) : null}
            {renderIntakeExam()}
            {renderLabDetailsEdit()}
            {renderDiagnosisEdit()}
            {renderLinkedDocs()}
            {renderLinkedDiagnoses()}
            {renderSymptoms()}
            {renderMedications()}
            {renderLinkedConsultations()}
          </View>

          {canDeleteRecord && !isDesktop ? (
            <Pressable
              testID="medical-record-delete-bottom"
              onPress={confirmDelete}
              style={[styles.deleteBottomBtn, { borderColor: "#ef4444", flexDirection: dir }]}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text style={styles.deleteBottomText}>
                {isRTL ? "حذف هذا السجل" : "Delete this record"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },
  scrollContentMobile: { paddingHorizontal: 12, paddingTop: 12 },
  scrollContentDesktop: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 64 },
  container: { width: "100%", alignSelf: "center", gap: 20 },
  loadingBody: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },

  toolbar: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  toolbarMobile: {
    alignItems: "stretch",
    gap: 12,
  },
  toolbarActions: { alignItems: "center", gap: 10, flexWrap: "wrap" },
  toolbarActionsMobile: {
    width: "100%",
    justifyContent: "space-between",
  },
  backBtn: { alignItems: "center", gap: 8, paddingVertical: 4 },
  backText: { fontSize: 14, fontWeight: "600" },
  categoryPill: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryPillText: { fontSize: 13, fontWeight: "700" },
  deleteToolbarBtn: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  deleteToolbarText: { color: "#ef4444", fontWeight: "700", fontSize: 13 },

  hero: {
    alignItems: "center",
    gap: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroMobile: {
    padding: 16,
    gap: 12,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 26, fontWeight: "800", lineHeight: 32 },
  heroTitleMobile: { fontSize: 20, lineHeight: 26 },
  heroSubtitle: { fontSize: 15, fontWeight: "600" },

  splitRow: { gap: 20, alignItems: "flex-start" },
  splitMedia: { flex: 2, minWidth: 280 },
  splitMain: { flex: 3, gap: 16, minWidth: 0 },

  mediaCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  mediaImage: { width: "100%", height: 320, maxHeight: 360 },
  mediaImageMobile: { width: "100%", height: 220, maxHeight: 280 },
  mediaHint: { fontSize: 12, padding: 10, textAlign: "center" },
  fileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },

  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  infoCardHeader: { alignItems: "center", gap: 10 },
  infoCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  infoCardValue: { fontSize: 17, fontWeight: "600", lineHeight: 24 },
  infoCardValueRelaxed: { fontSize: 16, fontWeight: "500", lineHeight: 28 },

  sections: { gap: 16 },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  sectionHeader: { alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },

  linkedList: { gap: 10 },
  linkedRow: {
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkedThumb: { width: 52, height: 52, borderRadius: 10 },
  linkedThumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  detailsLink: {
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  symptomList: { gap: 6 },
  symptomLine: { fontSize: 15, lineHeight: 22 },
  medRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  printBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  medName: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  addSymptomRow: { gap: 10, marginTop: 8, alignItems: "center" },
  addSymptomInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    minWidth: 0,
  },
  addSymptomBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  addSymptomBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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

  editInput: {
    fontSize: 16,
    lineHeight: 28,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
  },
  editActions: { alignItems: "center", gap: 16 },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  deleteBottomBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  deleteBottomText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});
