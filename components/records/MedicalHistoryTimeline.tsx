import { router } from "expo-router";
import { ClipboardList, FileText } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MedicalHistoryFilterPanel } from "@/components/MedicalHistoryFilterPanel";
import { PatientMedicalRequestsPanel } from "@/components/medical/PatientMedicalRequestsPanel";
import {
  RecordsBottomChrome,
  recordsBottomChromeHeight,
} from "@/components/records/RecordsBottomChrome";
import {
  getCategoryMeta,
  getDisplayMedicalRecordCategories,
  getLocalizedCategoryLabel,
  getRecordSubtitle,
  getRecordTimestamp,
  groupRecordsByMonth,
  MEDICAL_RECORD_CATEGORIES,
  SHOW_INTAKE_RECORDS,
  withoutIntakeRecords,
} from "@/components/records/medicalRecordCategories";
import { useAuthStore } from "@/domains/auth/store";
import { buildMedicalAddEntryHref } from "@/domains/medical/addHref";
import type { BodyPart } from "@/domains/medical/bodyParts";
import {
  EMPTY_MEDICAL_FILTERS,
  filterMedicalRecords,
  hasActiveFilters,
  type MedicalHistoryFilters,
} from "@/domains/medical/search";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

type CategoryFilter = MedicalCategory | "all";

export interface MedicalHistoryTimelineProps {
  records: MedicalRecord[];
  patientUserId: string;
  canAdd?: boolean;
  doctorView?: boolean;
  showIntake?: boolean;
  contentPaddingBottom?: number;
}

export function MedicalHistoryTimeline({
  records,
  patientUserId,
  canAdd = true,
  doctorView = false,
  showIntake = SHOW_INTAKE_RECORDS,
  contentPaddingBottom = 40,
}: MedicalHistoryTimelineProps) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const role = useAuthStore((s) => s.role);
  const [filters, setFilters] = useState<MedicalHistoryFilters>(EMPTY_MEDICAL_FILTERS);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);

  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const dateLocale = localeTag(isRTL);

  const visibleCategories =
    showIntake && SHOW_INTAKE_RECORDS
      ? MEDICAL_RECORD_CATEGORIES
      : getDisplayMedicalRecordCategories();

  const displayRecords = useMemo(
    () => (showIntake ? records : withoutIntakeRecords(records)),
    [records, showIntake],
  );

  const filteredRecords = useMemo(() => {
    const withBody: MedicalHistoryFilters = {
      ...filters,
      bodyPart: selectedBodyPart ?? filters.bodyPart,
    };
    const filtered = filterMedicalRecords(displayRecords, withBody);
    const scoped =
      categoryFilter === "all" ? filtered : filtered.filter((r) => r.category === categoryFilter);
    return [...scoped].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
  }, [displayRecords, filters, categoryFilter, selectedBodyPart]);

  const timelineGroups = useMemo(
    () => groupRecordsByMonth(filteredRecords, dateLocale),
    [filteredRecords, dateLocale],
  );

  const filtering =
    hasActiveFilters(filters) || categoryFilter !== "all" || !!selectedBodyPart;

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

  const clearFilters = () => {
    setFilters(EMPTY_MEDICAL_FILTERS);
    setCategoryFilter("all");
    setSelectedBodyPart(null);
  };

  const addBarSpace = recordsBottomChromeHeight({
    canAdd,
    extra: contentPaddingBottom,
    safeAreaBottom: insets.bottom,
  });

  const timelineBody = (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.categoryRow, { flexDirection: dir }]}
      >
        <CategoryChip
          label={t.records.all}
          active={categoryFilter === "all"}
          onPress={() => setCategoryFilter("all")}
          colors={colors}
          activeColor={colors.primary}
        />
        {visibleCategories.map(({ key, color }) => (
          <CategoryChip
            key={key}
            label={getLocalizedCategoryLabel(key, t)}
            active={categoryFilter === key}
            onPress={() => setCategoryFilter(key)}
            colors={colors}
            activeColor={color}
          />
        ))}
      </ScrollView>

      {filtering ? (
        <Pressable onPress={clearFilters} style={styles.clearLink}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
            {t.records.clearFilters}
          </Text>
        </Pressable>
      ) : null}

      {filteredRecords.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ClipboardList size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, textAlign }]}>
            {displayRecords.length === 0 ? t.records.emptyTitle : t.records.emptyFilteredTitle}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground, textAlign }]}>
            {displayRecords.length === 0 ? t.records.emptyBody : t.records.emptyFilteredBody}
          </Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {timelineGroups.map((group) => (
            <View key={group.key} style={styles.timelineGroup}>
              <Text style={[styles.monthLabel, { color: colors.mutedForeground, textAlign }]}>
                {group.label}
              </Text>
              <View style={styles.timelineItems}>
                {group.items.map((record, index) => (
                  <RecordTimelineItem
                    key={record.id}
                    record={record}
                    isLast={index === group.items.length - 1}
                    colors={colors}
                    isRTL={isRTL}
                    dir={dir}
                    textAlign={textAlign}
                    dateLocale={dateLocale}
                    onOpen={() => openRecord(record)}
                    categoryLabel={getLocalizedCategoryLabel(record.category, t)}
                    bodyPartLabel={
                      record.bodyPart ? t.records.bodyParts[record.bodyPart] : undefined
                    }
                    attachmentLabel={t.records.attachmentAvailable}
                    doctorPrefix={t.records.doctorPrefix}
                    symptomLabel={
                      record.symptoms?.length === 1
                        ? t.records.symptomSingular
                        : t.records.symptomPlural
                    }
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <View style={styles.root}>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: addBarSpace },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <MedicalHistoryFilterPanel
        filters={filters}
        onChange={setFilters}
        isRTL={isRTL}
        dir={dir}
      />

      <PatientMedicalRequestsPanel patientUserId={patientUserId} />

      {timelineBody}
    </ScrollView>

    <RecordsBottomChrome
      canAdd={canAdd}
      onAdd={openAdd}
      showDiagnosis={doctorView}
    />
    </View>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
  colors,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  activeColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.categoryChip,
        {
          backgroundColor: active ? `${activeColor}14` : colors.card,
          borderColor: active ? activeColor : colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: active ? activeColor : colors.foreground,
          fontWeight: "700",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RecordTimelineItem({
  record,
  isLast,
  colors,
  isRTL,
  dir,
  textAlign,
  dateLocale,
  onOpen,
  categoryLabel,
  bodyPartLabel,
  attachmentLabel,
  doctorPrefix,
  symptomLabel,
}: {
  record: MedicalRecord;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  dir: "row" | "row-reverse";
  textAlign: "left" | "right";
  dateLocale: string;
  onOpen: () => void;
  categoryLabel: string;
  bodyPartLabel?: string;
  attachmentLabel: string;
  doctorPrefix: (name: string) => string;
  symptomLabel: string;
}) {
  const meta = getCategoryMeta(record.category);
  const subtitle = getRecordSubtitle(record);
  const formattedDate = new Date(record.date).toLocaleDateString(dateLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={[styles.timelineRow, { flexDirection: dir }]}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: meta.color, borderColor: colors.background }]} />
        {!isLast ? (
          <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
        ) : null}
      </View>

      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.recordCard,
          {
            backgroundColor: pressed ? colors.muted : colors.card,
            borderColor: colors.border,
            ...(isRTL
              ? { borderRightWidth: 3, borderRightColor: meta.color }
              : { borderLeftWidth: 3, borderLeftColor: meta.color }),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={record.title}
      >
        <View style={[styles.recordCardTop, { flexDirection: dir }]}>
          <View style={[styles.typeBadge, { flexDirection: dir, backgroundColor: `${meta.color}14` }]}>
            <meta.Icon size={14} color={meta.color} />
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>
              {categoryLabel}
            </Text>
          </View>
          <Text style={[styles.recordDate, { color: colors.mutedForeground }]}>{formattedDate}</Text>
        </View>

        <Text style={[styles.recordTitle, { color: colors.foreground, textAlign }]} numberOfLines={2}>
          {record.title}
        </Text>

        {bodyPartLabel ? (
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
            {bodyPartLabel}
          </Text>
        ) : null}

        {record.category === "diagnosis" && record.doctorName ? (
          <Text style={[styles.recordMeta, { color: colors.mutedForeground, textAlign }]}>
            {doctorPrefix(record.doctorName)}
          </Text>
        ) : null}

        {record.category === "diagnosis" && record.symptoms?.length ? (
          <Text style={[styles.recordMeta, { color: colors.mutedForeground, textAlign }]}>
            {record.symptoms.length} {symptomLabel}
          </Text>
        ) : null}

        {subtitle ? (
          <Text
            style={[styles.recordSnippet, { color: colors.mutedForeground, textAlign }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}

        {record.fileUrl ? (
          <View style={[styles.attachmentRow, { flexDirection: dir }]}>
            <FileText size={14} color={colors.primary} />
            <Text style={[styles.attachmentText, { color: colors.primary }]}>
              {attachmentLabel}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: "relative" },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 4,
    gap: 12,
  },
  categoryRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  clearLink: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  emptyState: {
    marginHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  timeline: {
    paddingHorizontal: 16,
    gap: 24,
  },
  timelineGroup: {
    gap: 10,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
    paddingHorizontal: 2,
  },
  timelineItems: {
    gap: 0,
  },
  timelineRow: {
    alignItems: "stretch",
    gap: 12,
  },
  timelineRail: {
    width: 18,
    alignItems: "center",
    paddingTop: 16,
  },
  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 20,
  },
  recordCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 5,
    marginBottom: 10,
  },
  recordCardTop: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  typeBadge: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  recordDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  bodyPartChip: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  recordMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  recordSnippet: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  attachmentRow: {
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
