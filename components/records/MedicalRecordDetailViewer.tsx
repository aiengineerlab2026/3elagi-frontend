import {
  Activity,
  Clock,
  Expand,
  FileText,
  Pill,
  ScanLine,
  User,
} from "lucide-react-native";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IntakeExamTaker } from "@/components/intake/IntakeExamTaker";
import { MedicalRecordAttachmentImage } from "@/components/medical/MedicalRecordAttachmentImage";
import { MedicalRecordAiInsightSection } from "@/components/medical/MedicalRecordAiInsightSection";
import {
  isMedicalImageAttachment,
  isMedicalPdfAttachment,
  MEDICAL_RECORD_CATEGORY_META,
} from "@/components/medical/medicalRecordMeta";
import type { MedicalPdfView } from "@/components/medical/MedicalPdfViewer";
import { EHR } from "@/constants/ehrDesign";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import {
  linkedDiagnosesForRecord,
  recordShowsLinkedDiagnoses,
} from "@/domains/medical/linkedDiagnoses";
import { useI18n } from "@/hooks/useI18n";
import { useMedicalRecordPreviewDetail } from "@/hooks/useMedicalRecordPreviewDetail";
import { localeTag } from "@/utils/rtl";

interface Props {
  record: MedicalRecord | null;
  onOpenPdf?: (view: MedicalPdfView) => void;
  onZoomImage?: (uri: string) => void;
  /** Master-detail: select a linked record in the right pane instead of routing away. */
  onSelectLinkedRecord?: (record: MedicalRecord) => void;
  /** Intake exams linked to this consultation/diagnosis (by diagnosis_id). */
  linkedIntakeRecords?: MedicalRecord[];
  doctorView?: boolean;
  patientUserId?: string;
}

function openLinkedRecordRoute(
  doc: MedicalRecord,
  opts: { doctorView?: boolean; patientUserId?: string },
) {
  if (opts.doctorView && opts.patientUserId) {
    router.push({
      pathname: "/medical/[id]",
      params: { id: doc.id, doctorView: "1", patientUserId: opts.patientUserId },
    });
    return;
  }
  router.push(`/medical/${doc.id}`);
}

function filterLinkedDocuments(
  docs: MedicalRecord[] | undefined,
  category: MedicalCategory,
): MedicalRecord[] {
  return (docs ?? []).filter((doc) => doc.category === category);
}

function LinkedCategorySection({
  title,
  items,
  emptyLabel,
  isRTL,
  dir,
  textAlign,
  onOpenPdf,
  onZoomImage,
  onSelectLinkedRecord,
  doctorView,
  patientUserId,
}: {
  title: string;
  items: MedicalRecord[];
  emptyLabel: string;
  isRTL: boolean;
  dir: "row" | "row-reverse";
  textAlign: "left" | "right";
  onOpenPdf?: (view: MedicalPdfView) => void;
  onZoomImage?: (uri: string) => void;
  onSelectLinkedRecord?: (record: MedicalRecord) => void;
  doctorView?: boolean;
  patientUserId?: string;
}) {
  return (
    <ClinicalSection title={title} count={items.length || undefined} textAlign={textAlign}>
      {items.length > 0 ? (
        <View style={styles.linkedCardsRow}>
          {items.map((doc) => (
            <LinkedDiagnosticCard
              key={doc.id}
              doc={doc}
              isRTL={isRTL}
              dir={dir}
              textAlign={textAlign}
              onOpenPdf={onOpenPdf}
              onZoomImage={onZoomImage}
              onSelectLinkedRecord={onSelectLinkedRecord}
              doctorView={doctorView}
              patientUserId={patientUserId}
            />
          ))}
        </View>
      ) : (
        <Text style={[styles.bodyText, { textAlign, color: EHR.text.secondary }]}>
          {emptyLabel}
        </Text>
      )}
    </ClinicalSection>
  );
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function arabicTextAlign(text: string, base: "left" | "right"): "left" | "right" {
  return containsArabic(text) ? "right" : base;
}

function ClinicalSection({
  title,
  count,
  children,
  textAlign,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  textAlign: "left" | "right";
}) {
  return (
    <View style={styles.clinicalSection}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionHeading, { textAlign }]}>{title}</Text>
        {count != null && count > 0 ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{count}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.sectionDivider} />
      {children}
    </View>
  );
}

function MetaTag({ label, textAlign }: { label: string; textAlign: "left" | "right" }) {
  return (
    <View style={styles.metaTag}>
      <Text style={[styles.metaTagText, { textAlign }]}>{label}</Text>
    </View>
  );
}

function SymptomList({
  symptoms,
  textAlign,
  dir,
}: {
  symptoms: { id: string; desc: string }[];
  textAlign: "left" | "right";
  dir: "row" | "row-reverse";
}) {
  if (!symptoms.length) {
    return (
      <Text style={[styles.bodyText, { textAlign, color: EHR.text.secondary }]}>
        —
      </Text>
    );
  }

  return (
    <View style={styles.symptomList}>
      {symptoms.map((symptom) => (
        <View key={symptom.id} style={[styles.symptomRow, { flexDirection: dir }]}>
          <View style={styles.symptomDot} />
          <Text
            style={[
              styles.bodyText,
              {
                textAlign: arabicTextAlign(symptom.desc, textAlign),
                flex: 1,
              },
            ]}
          >
            {symptom.desc}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LinkedDiagnosticCard({
  doc,
  isRTL,
  dir,
  textAlign,
  onOpenPdf,
  onZoomImage,
  onSelectLinkedRecord,
  doctorView,
  patientUserId,
}: {
  doc: MedicalRecord;
  isRTL: boolean;
  dir: "row" | "row-reverse";
  textAlign: "left" | "right";
  onOpenPdf?: (view: MedicalPdfView) => void;
  onZoomImage?: (uri: string) => void;
  onSelectLinkedRecord?: (record: MedicalRecord) => void;
  doctorView?: boolean;
  patientUserId?: string;
}) {
  const docMeta = MEDICAL_RECORD_CATEGORY_META[doc.category];
  const DocIcon = docMeta.Icon;
  const docIsImage = isMedicalImageAttachment(doc.fileUrl, doc.fileName);
  const attachmentUri = doc.fileUrl ?? doc.pdfUrl ?? undefined;
  const docIsPdf =
    !docIsImage && isMedicalPdfAttachment(attachmentUri, doc.fileName);
  const isScan = doc.category === "xray";
  const categoryLabel = isRTL ? docMeta.labelAr : docMeta.labelEn;
  const pdfUri = docIsPdf ? attachmentUri : doc.pdfUrl ?? undefined;

  const openRecord = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    if (onSelectLinkedRecord) {
      onSelectLinkedRecord(doc);
      return;
    }
    openLinkedRecordRoute(doc, { doctorView, patientUserId });
  };

  const openAttachment = () => {
    if (docIsImage && doc.fileUrl) {
      onZoomImage?.(doc.fileUrl);
      return;
    }
    if (pdfUri) {
      onOpenPdf?.({ uri: pdfUri, fileName: doc.fileName });
      return;
    }
    openRecord();
  };

  const attachmentLabel =
    docIsImage || pdfUri
      ? isScan
        ? isRTL
          ? "عرض الأشعة"
          : "View scan"
        : docIsPdf || doc.pdfUrl
          ? isRTL
            ? "عرض PDF"
            : "View PDF"
          : isRTL
            ? "عرض الصورة"
            : "View image"
      : null;

  return (
    <View style={[styles.linkedMiniCard, { flexDirection: dir }]}>
      <Pressable
        onPress={openAttachment}
        style={({ pressed }) => [pressed && styles.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel={attachmentLabel ?? doc.title}
      >
        <View style={styles.linkedThumbWrap}>
          {docIsImage && doc.fileUrl ? (
            <>
              <MedicalRecordAttachmentImage uri={doc.fileUrl} style={styles.linkedThumbImage} />
              <View style={styles.linkedThumbOverlay}>
                <Expand size={16} color="#fff" />
              </View>
            </>
          ) : (
            <View style={[styles.linkedThumbPlaceholder, { backgroundColor: `${docMeta.color}18` }]}>
              {isScan ? (
                <ScanLine size={22} color={docMeta.color} />
              ) : (
                <DocIcon size={22} color={docMeta.color} />
              )}
            </View>
          )}
        </View>
      </Pressable>

      <View style={styles.linkedMiniCopy}>
        <Text style={[styles.linkedMiniTitle, { textAlign }]} numberOfLines={2}>
          {doc.title}
        </Text>
        <Text style={[styles.linkedMiniSubtitle, { textAlign }]}>{categoryLabel}</Text>
        {doc.notes ? (
          <Text
            style={[
              styles.linkedMiniDesc,
              {
                textAlign: arabicTextAlign(doc.notes, textAlign),
              },
            ]}
            numberOfLines={2}
          >
            {doc.notes}
          </Text>
        ) : null}
        {doc.value ? (
          <View style={[styles.paramPillRow, { flexDirection: dir }]}>
            <View style={styles.paramPill}>
              <Text style={styles.paramPillText} numberOfLines={1}>
                {doc.value}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.linkedActionsRow, { flexDirection: dir }]}>
          {attachmentLabel ? (
            <Pressable onPress={openAttachment} hitSlop={6}>
              <Text style={styles.viewFullLink}>{attachmentLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => openRecord()} hitSlop={6}>
            <Text style={styles.detailsLink}>
              {isRTL ? "التفاصيل" : "Details"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function MedicalRecordDetailViewer({
  record,
  onOpenPdf,
  onZoomImage,
  onSelectLinkedRecord,
  linkedIntakeRecords = [],
  doctorView,
  patientUserId,
}: Props) {
  const { isRTL, t } = useI18n();
  const dir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const dateLocale = localeTag(isRTL);
  const { record: detail, loading } = useMedicalRecordPreviewDetail(record, {
    doctorView,
    patientUserId,
  });

  if (!record) {
    return null;
  }

  const active = detail ?? record;
  const meta = MEDICAL_RECORD_CATEGORY_META[active.category];
  const Icon = meta.Icon;
  const categoryLabel = isRTL ? meta.labelAr : meta.labelEn;
  const isDiagnosis = active.category === "diagnosis";
  const isPrescription = active.category === "prescription";
  const isLabOrXray = active.category === "lab" || active.category === "xray";
  const isImg = !!active.fileUrl && isMedicalImageAttachment(active.fileUrl, active.fileName);
  const isPdf = !!active.fileUrl && isMedicalPdfAttachment(active.fileUrl, active.fileName);
  const formattedDate = new Date(active.date).toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedCreated = new Date(active.createdAt).toLocaleString(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const linkedPrescriptions = filterLinkedDocuments(active.linkedDocuments, "prescription");
  const linkedXrays = filterLinkedDocuments(active.linkedDocuments, "xray");
  const linkedIntakes = linkedIntakeRecords;
  const linkedDiagnoses = linkedDiagnosesForRecord(active);

  const openLinkedDiagnosis = (diag: { id: string; title: string }) => {
    const linked: MedicalRecord = {
      id: diag.id,
      ownerId: active.ownerId,
      category: "diagnosis",
      title: diag.title,
      date: active.date,
      createdAt: active.createdAt,
    };
    if (onSelectLinkedRecord) {
      onSelectLinkedRecord(linked);
      return;
    }
    openLinkedRecordRoute(linked, { doctorView, patientUserId });
  };

  return (
    <View style={styles.panel}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.documentCard,
            Platform.OS === "web" ? (EHR.shadow.card as object) : null,
          ]}
        >
          {loading ? (
            <View style={[styles.loadingRow, { flexDirection: dir }]}>
              <ActivityIndicator color={EHR.brand} />
              <Text style={styles.metaCaption}>
                {isRTL ? "جاري تحميل التفاصيل…" : "Loading details…"}
              </Text>
            </View>
          ) : null}

          {/* Clinical meta header */}
          <View style={[styles.metaBanner, { flexDirection: dir }]}>
            <View style={[styles.categoryBadge, { backgroundColor: `${meta.color}14` }]}>
              <Icon size={14} color={meta.color} />
              <Text style={[styles.categoryBadgeText, { color: meta.color }]}>
                {categoryLabel}
              </Text>
            </View>
            <Text style={[styles.dateRight, { textAlign: isRTL ? "left" : "right" }]}>
              {formattedDate}
            </Text>
          </View>

          <Text style={[styles.recordTitle, { textAlign }]}>{active.title}</Text>

          {active.doctorName ? (
            <View style={[styles.doctorRow, { flexDirection: dir }]}>
              <View style={styles.doctorAvatar}>
                <User size={14} color={EHR.brandDark} />
              </View>
              <Text style={[styles.doctorName, { textAlign }]}>
                {t.records.doctorPrefix(active.doctorName)}
              </Text>
            </View>
          ) : null}

          <View style={[styles.metaTagRow, { flexDirection: dir }]}>
            {active.bodyPart ? (
              <MetaTag
                label={`${isRTL ? "الموقع" : "Tag"}: ${t.records.bodyParts[active.bodyPart]}`}
                textAlign={textAlign}
              />
            ) : null}
            <MetaTag
              label={`${isRTL ? "أُضيف" : "Added"}: ${formattedCreated}`}
              textAlign={textAlign}
            />
          </View>

          {/* Primary attachment for lab/xray record itself */}
          {isImg && active.fileUrl ? (
            <View style={styles.primaryMediaWrap}>
              <MedicalRecordAttachmentImage
                uri={active.fileUrl}
                contentFit="contain"
                style={styles.primaryMedia}
              />
              <Pressable
                onPress={() => onZoomImage?.(active.fileUrl!)}
                style={[styles.mediaExpandBtn, { flexDirection: dir }]}
              >
                <Expand size={14} color="#fff" />
                <Text style={styles.mediaExpandText}>
                  {isRTL ? "تكبير" : "Expand"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {active.value ? (
            <ClinicalSection
              title={isRTL ? "القيمة السريرية" : "Clinical value"}
              textAlign={textAlign}
            >
              <View style={[styles.paramPillRow, { flexDirection: dir }]}>
                <View style={styles.paramPillAccent}>
                  <Text
                    style={[
                      styles.paramPillText,
                      { textAlign: arabicTextAlign(active.value, textAlign) },
                    ]}
                  >
                    {active.value}
                  </Text>
                </View>
              </View>
            </ClinicalSection>
          ) : null}

          {active.notes ? (
            <ClinicalSection
              title={
                isLabOrXray
                  ? isRTL
                    ? "ملخص النتائج"
                    : "Results summary"
                  : isRTL
                    ? "ملاحظات سريرية"
                    : "Clinical notes"
              }
              textAlign={textAlign}
            >
              <Text
                style={[
                  styles.bodyText,
                  { textAlign: arabicTextAlign(active.notes, textAlign) },
                ]}
              >
                {active.notes}
              </Text>
            </ClinicalSection>
          ) : null}

          {isDiagnosis ? (
            <ClinicalSection
              title={isRTL ? "الأعراض والنتائج السريرية" : "Clinical symptoms & findings"}
              textAlign={textAlign}
            >
              <SymptomList
                symptoms={active.symptoms ?? []}
                textAlign={textAlign}
                dir={dir}
              />
            </ClinicalSection>
          ) : null}

          {isDiagnosis ? (
            <>
              <LinkedCategorySection
                title={isRTL ? "روشتات مرتبطة" : "Linked prescriptions"}
                items={linkedPrescriptions}
                emptyLabel={
                  isRTL ? "لا توجد روشتات مرتبطة" : "No linked prescriptions"
                }
                isRTL={isRTL}
                dir={dir}
                textAlign={textAlign}
                onOpenPdf={onOpenPdf}
                onZoomImage={onZoomImage}
                onSelectLinkedRecord={onSelectLinkedRecord}
                doctorView={doctorView}
                patientUserId={patientUserId}
              />
              <LinkedCategorySection
                title={isRTL ? "أشعة مرتبطة" : "Linked x-rays"}
                items={linkedXrays}
                emptyLabel={isRTL ? "لا توجد أشعة مرتبطة" : "No linked x-rays"}
                isRTL={isRTL}
                dir={dir}
                textAlign={textAlign}
                onOpenPdf={onOpenPdf}
                onZoomImage={onZoomImage}
                onSelectLinkedRecord={onSelectLinkedRecord}
                doctorView={doctorView}
                patientUserId={patientUserId}
              />
              <LinkedCategorySection
                title={isRTL ? "فحوصات متابعة مرتبطة" : "Linked intake tests"}
                items={linkedIntakes}
                emptyLabel={
                  isRTL ? "لا توجد فحوصات متابعة مرتبطة" : "No linked intake tests"
                }
                isRTL={isRTL}
                dir={dir}
                textAlign={textAlign}
                onOpenPdf={onOpenPdf}
                onZoomImage={onZoomImage}
                onSelectLinkedRecord={onSelectLinkedRecord}
                doctorView={doctorView}
                patientUserId={patientUserId}
              />
            </>
          ) : null}

          {isPrescription && active.medications?.length ? (
            <ClinicalSection
              title={isRTL ? "الأدوية" : "Medications"}
              count={active.medications.length}
              textAlign={textAlign}
            >
              <View style={styles.medList}>
                {active.medications.map((med, index) => (
                  <View key={med.id ?? `med-${index}`} style={styles.medPill}>
                    <Pill size={14} color="#7c3aed" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.medName, { textAlign }]}>{med.medication_name}</Text>
                      {med.dose ? (
                        <Text style={[styles.metaCaption, { textAlign }]}>
                          {isRTL ? "الجرعة: " : "Dose: "}
                          {med.dose}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </ClinicalSection>
          ) : null}

          {active.category === "intake" && active.intakeExam ? (
            <ClinicalSection
              title={isRTL ? "إجابات المريض" : "Patient answers"}
              textAlign={textAlign}
            >
              <IntakeExamTaker
                isRTL={isRTL}
                questions={active.intakeExam.questions}
                answers={active.intakeExam.answers}
                readOnly
              />
            </ClinicalSection>
          ) : null}

          {recordShowsLinkedDiagnoses(active.category) && linkedDiagnoses.length ? (
            <ClinicalSection
              title={isRTL ? "تشخيصات مرتبطة" : "Linked diagnoses"}
              count={linkedDiagnoses.length}
              textAlign={textAlign}
            >
              {linkedDiagnoses.map((diag) => (
                <View
                  key={diag.id}
                  style={[styles.linkedDiagnosisRow, { flexDirection: dir }]}
                >
                  <Activity size={16} color="#ef4444" />
                  <Text style={[styles.bodyText, { textAlign, flex: 1 }]}>{diag.title}</Text>
                  <Pressable
                    onPress={() => openLinkedDiagnosis(diag)}
                    hitSlop={8}
                    accessibilityRole="link"
                    accessibilityLabel={isRTL ? "التفاصيل" : "Details"}
                  >
                    <Text style={styles.detailsLink}>
                      {isRTL ? "التفاصيل" : "Details"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ClinicalSection>
          ) : null}

          {active.category !== "intake" ? (
            <View style={styles.aiInsightWrap}>
              <MedicalRecordAiInsightSection record={active} />
            </View>
          ) : null}

          {active.fileUrl && isPdf && !isPrescription ? (
            <Pressable
              onPress={() =>
                onOpenPdf?.({ uri: active.fileUrl!, fileName: active.fileName })
              }
              style={[styles.pdfOpenRow, { flexDirection: dir }]}
            >
              <FileText size={18} color={EHR.brandDark} />
              <Text style={[styles.viewFullLink, { textAlign }]}>
                {active.fileName ?? (isRTL ? "فتح PDF" : "Open PDF attachment")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    width: "100%",
    minHeight: 480,
    alignSelf: "stretch",
    backgroundColor: EHR.bg.app,
  },
  scroll: { flex: 1, width: "100%" },
  scrollContent: {
    padding: EHR.workspaceGap,
    paddingBottom: 48,
    flexGrow: 1,
  },
  documentCard: {
    backgroundColor: EHR.bg.card,
    borderWidth: 1,
    borderColor: EHR.border,
    borderRadius: EHR.radius.card,
    padding: EHR.documentCardPadding,
    gap: 20,
  },
  loadingRow: {
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  metaBanner: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: EHR.radius.control,
  },
  categoryBadgeText: { fontSize: 12, fontWeight: "700" },
  dateRight: {
    ...EHR.type.meta,
    flex: 1,
  },
  recordTitle: {
    ...EHR.type.title,
    lineHeight: 28,
  },
  doctorRow: {
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  doctorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: EHR.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorName: {
    ...EHR.type.body,
    fontWeight: "600",
    color: EHR.text.section,
  },
  metaTagRow: {
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  metaTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: EHR.radius.control,
    backgroundColor: EHR.bg.app,
    borderWidth: 1,
    borderColor: EHR.border,
  },
  metaTagText: {
    ...EHR.type.meta,
    color: EHR.text.body,
  },
  clinicalSection: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeading: {
    ...EHR.type.section,
    flex: 1,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: EHR.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: EHR.brandDark,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: EHR.border,
  },
  bodyText: {
    ...EHR.type.body,
    lineHeight: 22,
  },
  metaCaption: {
    ...EHR.type.meta,
  },
  symptomList: { gap: 10 },
  symptomRow: {
    alignItems: "flex-start",
    gap: 10,
  },
  symptomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: EHR.brand,
    marginTop: 7,
  },
  linkedCardsRow: {
    gap: 16,
  },
  linkedMiniCard: {
    gap: 14,
    padding: 14,
    borderRadius: EHR.radius.card,
    borderWidth: 1,
    borderColor: EHR.border,
    backgroundColor: EHR.bg.app,
    alignItems: "flex-start",
  },
  linkedThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: EHR.radius.control,
    overflow: "hidden",
    position: "relative",
  },
  linkedThumbImage: {
    width: "100%",
    height: "100%",
  },
  linkedThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  linkedThumbPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  linkedMiniCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  linkedActionsRow: {
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  linkedMiniTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: EHR.text.primary,
  },
  linkedMiniSubtitle: {
    ...EHR.type.meta,
  },
  linkedMiniDesc: {
    ...EHR.type.body,
    marginTop: 2,
  },
  paramPillRow: {
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  paramPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: EHR.radius.control,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  paramPillAccent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: EHR.radius.control,
    backgroundColor: EHR.brandSoft,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  paramPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: EHR.brandDark,
  },
  viewFullLink: {
    fontSize: 13,
    fontWeight: "600",
    color: EHR.brandDark,
  },
  detailsLink: {
    fontSize: 13,
    fontWeight: "700",
    color: EHR.brand,
    textDecorationLine: "underline",
  },
  primaryMediaWrap: {
    borderRadius: EHR.radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: EHR.border,
    backgroundColor: EHR.bg.app,
    minHeight: 200,
    maxHeight: 360,
    position: "relative",
  },
  primaryMedia: {
    width: "100%",
    height: 320,
  },
  mediaExpandBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: EHR.radius.control,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
  },
  mediaExpandText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  medList: { gap: 8 },
  medPill: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: EHR.radius.control,
    backgroundColor: EHR.bg.app,
    borderWidth: 1,
    borderColor: EHR.border,
  },
  medName: {
    fontSize: 14,
    fontWeight: "600",
    color: EHR.text.primary,
  },
  linkedDiagnosisRow: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  aiInsightWrap: {
    marginTop: 4,
  },
  pdfOpenRow: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  btnPressed: { opacity: 0.88 },
});
