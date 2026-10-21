import { ChevronDown, ChevronUp, FileText, Heart, User, type LucideIcon } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { MedicalRecordAttachmentImage } from "@/components/medical/MedicalRecordAttachmentImage";
import {
  isMedicalImageAttachment,
  isMedicalPdfAttachment,
} from "@/components/medical/medicalRecordMeta";
import { MedicalRecordDetailViewer } from "@/components/records/MedicalRecordDetailViewer";
import { PatientRecordsQuickSummary } from "@/components/records/PatientRecordsQuickSummary";
import { PatientVitalSignsPanel } from "@/components/records/PatientVitalSignsPanel";
import { EHR } from "@/constants/ehrDesign";
import { WEB_DASHBOARD_MIN_HEIGHT } from "@/constants/webLayout";
import type { MedicalPdfView } from "@/components/medical/MedicalPdfViewer";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

export type MedicalRecordsCategoryConfig = {
  key: MedicalCategory;
  labelEn: string;
  labelAr: string;
  Icon: LucideIcon;
  color: string;
};

interface Props {
  patientLabel?: string;
  categories: MedicalRecordsCategoryConfig[];
  grouped: Record<MedicalCategory, MedicalRecord[]>;
  filteredGrouped: Record<MedicalCategory, MedicalRecord[]>;
  searchableCategories: MedicalCategory[];
  isFiltering: boolean;
  openSection: MedicalCategory | null;
  onOpenSectionChange: (key: MedicalCategory | null) => void;
  selectedRecord: MedicalRecord | null;
  onSelectRecord: (record: MedicalRecord) => void;
  vitalsSelected?: boolean;
  onSelectVitals?: () => void;
  onOpenPdf: (view: MedicalPdfView) => void;
  onZoomImage: (uri: string) => void;
  doctorView?: boolean;
  patientUserId?: string;
  filtersSlot?: React.ReactNode;
  requestsSlot?: React.ReactNode;
  recordRowTestId?: string;
  onRecordRowTourTap?: () => void;
}

function thumbGridStyle(): ViewStyle {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  } as unknown as ViewStyle;
}

export function MedicalRecordsDesktopDashboard({
  patientLabel,
  categories,
  grouped,
  filteredGrouped,
  searchableCategories,
  isFiltering,
  openSection,
  onOpenSectionChange,
  selectedRecord,
  onSelectRecord,
  vitalsSelected = false,
  onSelectVitals,
  onOpenPdf,
  onZoomImage,
  doctorView,
  patientUserId,
  filtersSlot,
  requestsSlot,
  recordRowTestId,
  onRecordRowTourTap,
}: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const dateLocale = localeTag(isRTL);

  const summaryStats = useMemo(
    () =>
      categories
        .filter((c) => c.key !== "intake")
        .map((c) => ({
          label: isRTL ? c.labelAr : c.labelEn,
          count: grouped[c.key].length,
          color: c.color,
        })),
    [categories, grouped, isRTL],
  );

  const handleSelectLinkedRecord = useCallback(
    (linked: MedicalRecord) => {
      for (const category of categories) {
        const found = grouped[category.key].find((row) => row.id === linked.id);
        if (found) {
          onOpenSectionChange(category.key);
          onSelectRecord(found);
          return;
        }
      }
      onOpenSectionChange(linked.category);
      onSelectRecord(linked);
    },
    [categories, grouped, onOpenSectionChange, onSelectRecord],
  );

  const linkedIntakeForDiagnosis = useMemo(() => {
    if (!selectedRecord || selectedRecord.category !== "diagnosis") return [];
    return grouped.intake.filter((row) => row.diagnosisId === selectedRecord.id);
  }, [selectedRecord, grouped.intake]);

  return (
    <View style={[styles.root, { flexDirection: dir }]}>
      <View style={styles.leftPane}>
        <ScrollView
          style={styles.leftScroll}
          contentContainerStyle={styles.leftScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.summaryHeader, { flexDirection: dir }]}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
                <User size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[styles.summaryName, { color: colors.foreground, textAlign }]}
                  numberOfLines={2}
                >
                  {patientLabel ??
                    (isRTL ? "السجل الطبي" : "Medical record")}
                </Text>
                <Text style={[styles.summaryMeta, { color: EHR.text.secondary, textAlign }]}>
                  {isRTL ? "ملخص السجل الصحي" : "Health record overview"}
                </Text>
              </View>
            </View>
            <View style={[styles.metricsStrip, { flexDirection: dir }]}>
              {summaryStats.map((stat) => (
                <View
                  key={stat.label}
                  style={[styles.metricCell, { borderColor: EHR.border }]}
                >
                  <Text style={[styles.metricCount, { color: EHR.brandDark }]}>{stat.count}</Text>
                  <Text
                    style={[styles.metricLabel, { color: EHR.text.secondary }]}
                    numberOfLines={2}
                  >
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {filtersSlot ? <View style={styles.filtersSlot}>{filtersSlot}</View> : null}
          {requestsSlot ? <View style={styles.requestsSlot}>{requestsSlot}</View> : null}

          <View style={styles.sectionWrap}>
            <Pressable
              onPress={() => onSelectVitals?.()}
              style={[
                styles.sectionHeader,
                {
                  flexDirection: dir,
                  backgroundColor: colors.card,
                  borderColor: vitalsSelected ? EHR.brand : colors.border,
                },
              ]}
            >
              <View style={[styles.iconBubble, { backgroundColor: `${EHR.brand}18` }]}>
                <Heart size={16} color={EHR.brand} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign, flex: 1 }]}>
                {isRTL ? "العلامات الحيوية" : "Vital signs"}
              </Text>
              {vitalsSelected ? (
                <ChevronUp size={16} color={EHR.brand} />
              ) : (
                <ChevronDown size={16} color={colors.mutedForeground} />
              )}
            </Pressable>
            {vitalsSelected ? (
              <View style={styles.sectionBody}>
                <View
                  style={[
                    styles.listRow,
                    {
                      flexDirection: dir,
                      borderColor: EHR.brand,
                      backgroundColor: EHR.brandSoft,
                      borderLeftWidth: dir === "row" ? 3 : StyleSheet.hairlineWidth,
                      borderRightWidth: dir === "row-reverse" ? 3 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={[styles.listRowIcon, { backgroundColor: `${EHR.brand}14` }]}>
                    <Heart size={16} color={EHR.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.listRowTitle, { color: colors.foreground, textAlign }]}>
                      {isRTL ? "العلامات الحيوية الأخيرة" : "Recent vital signs"}
                    </Text>
                    <Text style={[styles.listRowMeta, { color: colors.mutedForeground, textAlign }]}>
                      {doctorView
                        ? isRTL
                          ? "قراءات المريض"
                          : "Patient-reported readings"
                        : isRTL
                          ? "تحديث قراءاتك"
                          : "Update your readings"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {categories.map(({ key, labelEn, labelAr, Icon, color }) => {
            const label = isRTL ? labelAr : labelEn;
            const isOpen = openSection === key;
            const isSearchable = searchableCategories.includes(key);
            const allItems = grouped[key];
            const items = isSearchable ? filteredGrouped[key] : allItems;
            const sectionFiltering = isSearchable && isFiltering;
            const imageItems = items.filter(
              (item) =>
                !!item.fileUrl &&
                isMedicalImageAttachment(item.fileUrl, item.fileName),
            );
            const useThumbGrid =
              (key === "lab" || key === "xray") && imageItems.length > 0;

            return (
              <View key={key} style={styles.sectionWrap}>
                <Pressable
                  onPress={() => onOpenSectionChange(isOpen ? null : key)}
                  style={[
                    styles.sectionHeader,
                    {
                      flexDirection: dir,
                      backgroundColor: colors.card,
                      borderColor: isOpen ? color : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.iconBubble, { backgroundColor: `${color}18` }]}>
                    <Icon size={16} color={color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign, flex: 1 }]}>
                    {label}
                  </Text>
                  <View style={[styles.countBadge, { backgroundColor: `${color}14` }]}>
                    <Text style={[styles.countText, { color }]}>
                      {sectionFiltering ? `${items.length}/${allItems.length}` : allItems.length}
                    </Text>
                  </View>
                  {isOpen ? (
                    <ChevronUp size={16} color={color} />
                  ) : (
                    <ChevronDown size={16} color={colors.mutedForeground} />
                  )}
                </Pressable>

                {isOpen ? (
                  <View style={styles.sectionBody}>
                    {allItems.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign }]}>
                        {isRTL ? "لا توجد إدخالات بعد" : "No entries yet"}
                      </Text>
                    ) : items.length === 0 ? (
                      <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign }]}>
                        {isRTL ? "لا توجد نتائج للبحث" : "No matches for your search"}
                      </Text>
                    ) : useThumbGrid ? (
                      <View style={thumbGridStyle()}>
                        {imageItems.map((item, index) => {
                          const selected = selectedRecord?.id === item.id;
                          return (
                            <Pressable
                              key={item.id}
                              testID={recordRowTestId && index === 0 ? recordRowTestId : undefined}
                              onPress={() => {
                                if (recordRowTestId && index === 0) onRecordRowTourTap?.();
                                onSelectRecord(item);
                              }}
                              style={[
                                styles.thumbCard,
                                {
                                  borderColor: selected ? color : colors.border,
                                  backgroundColor: selected ? `${color}10` : colors.card,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.thumbImageWrap,
                                  { backgroundColor: colors.muted },
                                ]}
                              >
                                <MedicalRecordAttachmentImage
                                  uri={item.fileUrl!}
                                  contentFit="cover"
                                  style={styles.thumbImage}
                                />
                              </View>
                              <Text
                                style={[styles.thumbTitle, { color: colors.foreground, textAlign }]}
                                numberOfLines={2}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={[styles.thumbDate, { color: colors.mutedForeground, textAlign }]}
                              >
                                {new Date(item.date).toLocaleDateString(dateLocale)}
                              </Text>
                            </Pressable>
                          );
                        })}
                        {items
                          .filter(
                            (item) =>
                              !item.fileUrl ||
                              !isMedicalImageAttachment(item.fileUrl, item.fileName),
                          )
                          .map((item) => (
                            <RecordListRow
                              key={item.id}
                              item={item}
                              selected={selectedRecord?.id === item.id}
                              accent={color}
                              colors={colors}
                              dir={dir}
                              textAlign={textAlign}
                              dateLocale={dateLocale}
                              onPress={() => onSelectRecord(item)}
                            />
                          ))}
                      </View>
                    ) : (
                      <View style={styles.listStack}>
                        {items.map((item, index) => (
                          <RecordListRow
                            key={item.id}
                            item={item}
                            selected={selectedRecord?.id === item.id}
                            accent={color}
                            colors={colors}
                            dir={dir}
                            textAlign={textAlign}
                            dateLocale={dateLocale}
                            testID={recordRowTestId && index === 0 ? recordRowTestId : undefined}
                            onPress={() => {
                              if (recordRowTestId && index === 0) onRecordRowTourTap?.();
                              onSelectRecord(item);
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View
        style={[
          styles.rightPane,
          { backgroundColor: EHR.bg.app, borderColor: EHR.border },
        ]}
      >
        {vitalsSelected ? (
          <PatientVitalSignsPanel patientUserId={patientUserId} doctorView={doctorView} />
        ) : selectedRecord ? (
          <MedicalRecordDetailViewer
            record={selectedRecord}
            onOpenPdf={onOpenPdf}
            onZoomImage={onZoomImage}
            onSelectLinkedRecord={handleSelectLinkedRecord}
            linkedIntakeRecords={linkedIntakeForDiagnosis}
            doctorView={doctorView}
            patientUserId={patientUserId}
          />
        ) : (
          <PatientRecordsQuickSummary
            patientLabel={patientLabel}
            grouped={grouped}
            patientUserId={patientUserId}
            doctorView={doctorView}
          />
        )}
      </View>
    </View>
  );
}

function RecordListRow({
  item,
  selected,
  accent,
  colors,
  dir,
  textAlign,
  dateLocale,
  onPress,
  testID,
}: {
  item: MedicalRecord;
  selected: boolean;
  accent: string;
  colors: ReturnType<typeof useColors>;
  dir: "row" | "row-reverse";
  textAlign: "left" | "right";
  dateLocale: string;
  onPress: () => void;
  testID?: string;
}) {
  const isPdf =
    !!item.fileUrl && isMedicalPdfAttachment(item.fileUrl, item.fileName);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[
        styles.listRow,
        {
          flexDirection: dir,
          borderColor: selected ? EHR.brand : colors.border,
          backgroundColor: selected ? EHR.brandSoft : colors.card,
          borderLeftWidth: selected && dir === "row" ? 3 : StyleSheet.hairlineWidth,
          borderRightWidth: selected && dir === "row-reverse" ? 3 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {isPdf ? (
        <View style={[styles.listRowIcon, { backgroundColor: `${accent}14` }]}>
          <FileText size={16} color={accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          style={[styles.listRowTitle, { color: colors.foreground, textAlign }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {item.doctorName ? (
          <Text
            style={[styles.listRowMeta, { color: colors.mutedForeground, textAlign }]}
            numberOfLines={1}
          >
            {item.doctorName}
          </Text>
        ) : null}
        <Text style={[styles.listRowDate, { color: colors.mutedForeground, textAlign }]}>
          {new Date(item.date).toLocaleDateString(dateLocale)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: WEB_DASHBOARD_MIN_HEIGHT,
    alignItems: "stretch",
    marginTop: 0,
    marginBottom: 0,
    gap: EHR.workspaceGap,
  },
  leftPane: {
    width: EHR.masterPaneWidth,
    maxWidth: EHR.masterPaneWidth,
    minWidth: 300,
    minHeight: WEB_DASHBOARD_MIN_HEIGHT,
    alignSelf: "stretch",
    flexShrink: 0,
  },
  leftScroll: { flex: 1, minHeight: 0, height: "100%" },
  leftScrollContent: { paddingTop: EHR.workspaceGap, paddingBottom: 48, gap: EHR.workspaceGap },
  summaryCard: {
    borderRadius: EHR.radius.card,
    borderWidth: 1,
    borderColor: EHR.border,
    padding: 16,
    gap: 12,
    backgroundColor: EHR.bg.card,
  },
  summaryHeader: { alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryName: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  summaryMeta: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  metricsStrip: {
    gap: 8,
    flexWrap: "wrap",
  },
  metricCell: {
    flex: 1,
    minWidth: 72,
    borderWidth: 1,
    borderRadius: EHR.radius.control,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
    backgroundColor: EHR.bg.app,
  },
  metricCount: { fontSize: 16, fontWeight: "800" },
  metricLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },
  filtersSlot: { gap: 12 },
  requestsSlot: { marginBottom: 0 },
  sectionWrap: { gap: 8 },
  sectionHeader: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: "700" },
  sectionBody: { paddingTop: 8, paddingBottom: 4, gap: 8 },
  emptyText: {
    fontSize: 13,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  listStack: { gap: 8 },
  listRow: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  listRowTitle: { fontSize: 14, fontWeight: "600" },
  listRowMeta: { fontSize: 12 },
  listRowDate: { fontSize: 11 },
  thumbCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    padding: 8,
    gap: 6,
  },
  thumbImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbTitle: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  thumbDate: { fontSize: 10 },
  rightPane: {
    flex: 1,
    minWidth: 0,
    minHeight: WEB_DASHBOARD_MIN_HEIGHT,
    alignSelf: "stretch",
    borderRadius: EHR.radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
});
