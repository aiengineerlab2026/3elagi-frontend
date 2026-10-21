import { router } from "expo-router";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Search,
  Stethoscope,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTextInput } from "@/components/AppTextInput";
import { FullscreenImageViewer } from "@/components/FullscreenImageViewer";
import { MedicalPdfViewer, type MedicalPdfView } from "@/components/medical/MedicalPdfViewer";
import { MedicalRecordsDesktopDashboard } from "@/components/records/MedicalRecordsDesktopDashboard";

import { WEB_CONTENT_PADDING, WEB_MAX_WIDTH } from "@/constants/webLayout";
import { PatientMedicalRequestsPanel } from "@/components/medical/PatientMedicalRequestsPanel";
import { BodyPartAutocomplete } from "@/components/records/BodyPartAutocomplete";
import { BodySkeletonView } from "@/components/records/BodySkeletonView";
import { MedicalRecordAddBar } from "@/components/records/MedicalRecordAddBar";
import {
  RecordsBottomChrome,
  recordsBottomChromeHeight,
} from "@/components/records/RecordsBottomChrome";
import {
  RecordsViewModeToggle,
  type RecordsViewMode,
} from "@/components/records/RecordsViewModeToggle";
import {
  getCategoryMeta,
  getDisplayMedicalRecordCategories,
  getLocalizedCategoryLabel,
  getRecordSubtitle,
  getRecordTimestamp,
  groupRecordsByMonth,
  withoutIntakeRecords,
} from "@/components/records/medicalRecordCategories";
import { buildMedicalAddEntryHref } from "@/domains/medical/addHref";
import { buildBodyPartRecordsHref } from "@/domains/medical/bodyPartHref";
import type { BodyPart } from "@/domains/medical/bodyParts";
import {
  EMPTY_MEDICAL_FILTERS,
  filterMedicalRecords,
  hasActiveFilters,
  type DateFilterMode,
  type MedicalHistoryFilters,
} from "@/domains/medical/search";
import type { MedicalCategory, MedicalRecord } from "@/domains/medical/types";
import { useColors } from "@/hooks/useColors";
import { MobileWebMenuHeader } from "@/components/web/MobileWebMenuHeader";
import { useMobileWebPageTitlePaddingTop } from "@/hooks/useMobileWebPageTitlePaddingTop";
import { useI18n } from "@/hooks/useI18n";
import { useRecordsPage } from "@/hooks/useRecordsPage";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow, localeTag } from "@/utils/rtl";

type CategoryFilter = MedicalCategory | "all";

const DATE_MODES: DateFilterMode[] = ["any", "on", "range", "before", "after"];
const SEARCHABLE_CATEGORIES: MedicalCategory[] = ["diagnosis", "lab", "xray", "prescription"];

function parseWebDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatWebDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function RecordsWebView() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop, isMobile } = useWebLayout();
  const insets = useSafeAreaInsets();
  const showMobileMenuHeader = Platform.OS === "web" && isMobile;
  const mobileTitlePaddingTopRaw = useMobileWebPageTitlePaddingTop();
  const mobileTitlePaddingTop = showMobileMenuHeader ? 0 : mobileTitlePaddingTopRaw;
  const mobileAddBarOffset = isDesktop
    ? 0
    : recordsBottomChromeHeight({
        canAdd: true,
        extra: 12,
        safeAreaBottom: insets.bottom,
      });
  const { records, profile } = useRecordsPage();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const dateLocale = localeTag(isRTL);

  const [filters, setFilters] = useState<MedicalHistoryFilters>(EMPTY_MEDICAL_FILTERS);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<RecordsViewMode>("table");
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);
  const [openSection, setOpenSection] = useState<MedicalCategory | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [vitalsSelected, setVitalsSelected] = useState(false);
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [pdfView, setPdfView] = useState<MedicalPdfView | null>(null);

  const displayRecords = useMemo(() => withoutIntakeRecords(records), [records]);
  const visibleCategories = getDisplayMedicalRecordCategories();

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

  const isSkeleton = viewMode === "skeleton";
  const isDashboardDesktop = isDesktop && !isSkeleton;

  const filtering =
    hasActiveFilters(filters) || categoryFilter !== "all" || !!selectedBodyPart;
  const advancedFiltering =
    hasActiveFilters(filters) &&
    (filters.doctorName.trim().length > 0 ||
      filters.bodyPart != null ||
      filters.dateMode !== "any" ||
      filters.text.trim().length > 0);

  const grouped = useMemo(() => {
    const out: Record<MedicalCategory, MedicalRecord[]> = {
      diagnosis: [],
      lab: [],
      xray: [],
      prescription: [],
      intake: [],
    };
    for (const record of filteredRecords) {
      out[record.category]?.push(record);
    }
    return out;
  }, [filteredRecords]);

  React.useEffect(() => {
    if (categoryFilter !== "all") {
      setOpenSection(categoryFilter);
    }
  }, [categoryFilter]);

  const handleSelectVitals = React.useCallback(() => {
    setVitalsSelected((prev) => {
      const next = !prev;
      if (next) {
        setSelectedRecord(null);
        setOpenSection(null);
      }
      return next;
    });
  }, []);

  const handleSelectRecord = React.useCallback((record: MedicalRecord) => {
    setVitalsSelected(false);
    setSelectedRecord(record);
  }, []);

  const handleOpenSectionChange = React.useCallback((key: MedicalCategory | null) => {
    setVitalsSelected(false);
    setOpenSection(key);
  }, []);

  React.useEffect(() => {
    if (!isDesktop || isSkeleton) return;
    if (vitalsSelected) return;
    if (!openSection) {
      setSelectedRecord(null);
      return;
    }
    const items = grouped[openSection] ?? [];
    if (items.length === 0) {
      setSelectedRecord(null);
      return;
    }
    setSelectedRecord((prev) =>
      prev && items.some((item) => item.id === prev.id) ? prev : items[0],
    );
  }, [isDesktop, isSkeleton, vitalsSelected, openSection, grouped]);

  const openRecord = (item: MedicalRecord) => {
    router.push(`/medical/${item.id}`);
  };

  const openAdd = () => {
    router.push(
      buildMedicalAddEntryHref({
        isPatient: true,
        patientUserId: profile?.id,
      }) as never,
    );
  };

  const setDateMode = (mode: DateFilterMode) => {
    setFilters({
      ...filters,
      dateMode: mode,
      ...(mode === "any"
        ? { dateFrom: null, dateTo: null, singleDate: null }
        : mode === "range"
          ? { singleDate: null }
          : { dateFrom: null, dateTo: null }),
    });
  };

  const clearFilters = () => {
    setFilters(EMPTY_MEDICAL_FILTERS);
    setCategoryFilter("all");
    setSelectedBodyPart(null);
  };

  /** Keep skeleton selection and filter body-part control in sync. */
  const selectBodyPart = (bodyPart: BodyPart | null) => {
    setSelectedBodyPart(bodyPart);
    setFilters((prev) => ({ ...prev, bodyPart }));
  };

  const webFiltersPanel = (
    <View style={styles.searchBlockCompact}>
      <View
        style={[
          styles.searchRow,
          {
            flexDirection: dir,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Search size={18} color={colors.mutedForeground} />
        <AppTextInput
          value={filters.text}
          onChangeText={(text) => setFilters({ ...filters, text })}
          placeholder={t.records.searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground, textAlign }]}
          accessibilityLabel={t.records.searchLabel}
        />
        {filters.text.length > 0 ? (
          <Pressable onPress={() => setFilters({ ...filters, text: "" })} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {!isDesktop ? <PatientMedicalRequestsPanel /> : null}

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

      <Pressable
        onPress={() => setFiltersOpen((v) => !v)}
        style={[styles.filtersToggle, { flexDirection: dir }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: filtersOpen }}
      >
        <Text style={[styles.filtersToggleText, { color: colors.primary }]}>
          {t.records.filterOptions}
        </Text>
        {filtersOpen ? (
          <ChevronUp size={16} color={colors.primary} />
        ) : (
          <ChevronDown size={16} color={colors.primary} />
        )}
        {advancedFiltering && !filtersOpen ? (
          <View style={[styles.filterDot, { backgroundColor: colors.primary }]} />
        ) : null}
      </Pressable>

      {filtersOpen ? (
        <View style={[styles.advancedFilters, { borderColor: colors.border }]}>
          <View
            style={[
              styles.searchRow,
              {
                flexDirection: dir,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Stethoscope size={16} color={colors.mutedForeground} />
            <AppTextInput
              value={filters.doctorName}
              onChangeText={(doctorName) => setFilters({ ...filters, doctorName })}
              placeholder={t.records.doctorName}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground, textAlign }]}
            />
            {filters.doctorName.length > 0 ? (
              <Pressable onPress={() => setFilters({ ...filters, doctorName: "" })} hitSlop={8}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          <BodyPartAutocomplete
            value={filters.bodyPart}
            onChange={selectBodyPart}
            label={t.records.bodyPart}
            clearable
          />

          <View style={[styles.chipRow, { flexDirection: dir }]}>
            {DATE_MODES.map((mode) => {
              const active = filters.dateMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setDateMode(mode)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor: active ? `${colors.primary}12` : "transparent",
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? colors.primary : colors.foreground,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {t.records.dateFilter[mode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {filters.dateMode === "range" ? (
            <View style={[styles.dateRow, { flexDirection: dir }]}>
              <DateInput
                label={t.records.dateFrom}
                value={filters.dateFrom}
                onChange={(dateFrom) => setFilters({ ...filters, dateFrom })}
                colors={colors}
                isRTL={isRTL}
                dir={dir}
              />
              <DateInput
                label={t.records.dateTo}
                value={filters.dateTo}
                onChange={(dateTo) => setFilters({ ...filters, dateTo })}
                colors={colors}
                isRTL={isRTL}
                dir={dir}
              />
            </View>
          ) : null}

          {(filters.dateMode === "on" ||
            filters.dateMode === "before" ||
            filters.dateMode === "after") && (
            <DateInput
              label={t.records.date}
              value={filters.singleDate}
              onChange={(singleDate) => setFilters({ ...filters, singleDate })}
              colors={colors}
              isRTL={isRTL}
              dir={dir}
            />
          )}
        </View>
      ) : null}

      {filtering ? (
        <Pressable onPress={clearFilters} style={styles.clearLink}>
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>
            {t.records.clearFilters}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  const openBodyPart = (part: BodyPart) => {
    router.push(buildBodyPartRecordsHref(part) as never);
  };

  const pageHeaderBlock = (
    <View
      style={[
        styles.pageHeader,
        isSkeleton && styles.pageHeaderSkeleton,
        { flexDirection: dir },
        mobileTitlePaddingTop > 0 && { paddingTop: mobileTitlePaddingTop },
      ]}
    >
      <View style={styles.pageHeaderText}>
        <Text
          style={[
            styles.pageTitle,
            { color: colors.foreground, textAlign, writingDirection: isRTL ? "rtl" : "ltr" },
          ]}
        >
          {t.records.title}
        </Text>
        <Text
          style={[
            styles.pageSubtitle,
            {
              color: colors.mutedForeground,
              textAlign,
              alignSelf: "stretch",
              writingDirection: isRTL ? "rtl" : "ltr",
            },
          ]}
        >
          {t.records.webSubtitle}
        </Text>
      </View>
      {isDesktop ? <MedicalRecordAddBar onAdd={openAdd} layout="header" /> : null}
    </View>
  );

  const viewModeToggleBlock = (
    <View style={isSkeleton ? styles.toggleWrapSkeleton : { marginBottom: 12 }}>
      <RecordsViewModeToggle mode={viewMode} onChange={setViewMode} />
    </View>
  );

  const desktopDashboard = (
    <MedicalRecordsDesktopDashboard
      patientLabel={profile?.name ?? t.records.title}
      categories={visibleCategories}
      grouped={grouped}
      filteredGrouped={grouped}
      searchableCategories={SEARCHABLE_CATEGORIES}
      isFiltering={filtering}
      openSection={openSection}
      onOpenSectionChange={handleOpenSectionChange}
      selectedRecord={selectedRecord}
      onSelectRecord={handleSelectRecord}
      vitalsSelected={vitalsSelected}
      onSelectVitals={handleSelectVitals}
      patientUserId={profile?.id}
      onOpenPdf={setPdfView}
      onZoomImage={setViewingFileUrl}
      filtersSlot={webFiltersPanel}
      requestsSlot={<PatientMedicalRequestsPanel embedded />}
    />
  );

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <MobileWebMenuHeader />
      {isDashboardDesktop ? (
        <>
          <View
            style={[
              styles.container,
              styles.dashboardChrome,
              { maxWidth: WEB_MAX_WIDTH.content },
            ]}
          >
            {pageHeaderBlock}
            {viewModeToggleBlock}
          </View>
          <View
            style={[
              styles.dashboardHost,
              { maxWidth: WEB_MAX_WIDTH.content },
            ]}
          >
            {desktopDashboard}
          </View>
        </>
      ) : (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
          isSkeleton && styles.scrollContentSkeleton,
          isSkeleton && isDesktop && styles.scrollContentSkeletonDesktop,
          {
            paddingBottom: isSkeleton
              ? 12
              : isDesktop
                ? 32
                : mobileAddBarOffset,
          },
        ]}
        scrollEnabled={!isSkeleton}
        showsVerticalScrollIndicator={!isSkeleton}
      >
        <View
          style={[
            styles.container,
            isSkeleton && styles.containerSkeleton,
            isSkeleton && isDesktop && styles.containerSkeletonDesktop,
            { maxWidth: WEB_MAX_WIDTH.content },
          ]}
        >
          <View
            style={[
              styles.pageHeader,
              isSkeleton && styles.pageHeaderSkeleton,
              { flexDirection: dir },
              mobileTitlePaddingTop > 0 && { paddingTop: mobileTitlePaddingTop },
            ]}
          >
            <View style={styles.pageHeaderText}>
              <Text
                style={[
                  styles.pageTitle,
                  { color: colors.foreground, textAlign, writingDirection: isRTL ? "rtl" : "ltr" },
                ]}
              >
                {t.records.title}
              </Text>
              <Text
                style={[
                  styles.pageSubtitle,
                  {
                    color: colors.mutedForeground,
                    textAlign,
                    alignSelf: "stretch",
                    writingDirection: isRTL ? "rtl" : "ltr",
                  },
                ]}
              >
                {t.records.webSubtitle}
              </Text>
            </View>
            {isDesktop ? (
              <MedicalRecordAddBar onAdd={openAdd} layout="header" />
            ) : null}
          </View>

          <View style={isSkeleton ? styles.toggleWrapSkeleton : { marginBottom: 12 }}>
            <RecordsViewModeToggle mode={viewMode} onChange={setViewMode} />
          </View>

          <View
            style={
              isSkeleton && isDesktop
                ? [styles.splitRow, { flexDirection: dir }]
                : undefined
            }
          >
            {isSkeleton ? (
              <View
                style={[
                  styles.splitPane,
                  styles.splitSkeleton,
                  !isDesktop && styles.splitSkeletonMobile,
                  { borderColor: colors.border },
                ]}
              >
                <BodySkeletonView
                  selectedPart={selectedBodyPart}
                  records={displayRecords}
                  onSelectPart={selectBodyPart}
                  onOpenPart={isDesktop ? undefined : openBodyPart}
                />
              </View>
            ) : null}

            {isSkeleton && isDesktop ? (
              <View style={[styles.splitPane, styles.splitRecordsPane]}>
                <ScrollView
                  style={styles.splitPaneScroll}
                  contentContainerStyle={styles.splitRecordsContent}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  <View style={styles.searchBlock}>
                    <View
                      style={[
                        styles.searchRow,
                        {
                          flexDirection: dir,
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                        },
                      ]}
                    >
                      <Search size={18} color={colors.mutedForeground} />
                      <AppTextInput
                        value={filters.text}
                        onChangeText={(text) => setFilters({ ...filters, text })}
                        placeholder={t.records.searchPlaceholder}
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.searchInput, { color: colors.foreground, textAlign }]}
                        accessibilityLabel={t.records.searchLabel}
                      />
                      {filters.text.length > 0 ? (
                        <Pressable
                          onPress={() => setFilters({ ...filters, text: "" })}
                          hitSlop={8}
                        >
                          <X size={16} color={colors.mutedForeground} />
                        </Pressable>
                      ) : null}
                    </View>

                    <PatientMedicalRequestsPanel />

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

                    <Pressable
                      onPress={() => setFiltersOpen((v) => !v)}
                      style={[styles.filtersToggle, { flexDirection: dir }]}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: filtersOpen }}
                    >
                      <Text style={[styles.filtersToggleText, { color: colors.primary }]}>
                        {t.records.filterOptions}
                      </Text>
                      {filtersOpen ? (
                        <ChevronUp size={16} color={colors.primary} />
                      ) : (
                        <ChevronDown size={16} color={colors.primary} />
                      )}
                      {advancedFiltering && !filtersOpen ? (
                        <View style={[styles.filterDot, { backgroundColor: colors.primary }]} />
                      ) : null}
                    </Pressable>

                    {filtersOpen ? (
                      <View style={[styles.advancedFilters, { borderColor: colors.border }]}>
                        <View
                          style={[
                            styles.searchRow,
                            {
                              flexDirection: dir,
                              borderColor: colors.border,
                              backgroundColor: colors.background,
                            },
                          ]}
                        >
                          <Stethoscope size={16} color={colors.mutedForeground} />
                          <AppTextInput
                            value={filters.doctorName}
                            onChangeText={(doctorName) => setFilters({ ...filters, doctorName })}
                            placeholder={t.records.doctorName}
                            placeholderTextColor={colors.mutedForeground}
                            style={[styles.searchInput, { color: colors.foreground, textAlign }]}
                          />
                          {filters.doctorName.length > 0 ? (
                            <Pressable
                              onPress={() => setFilters({ ...filters, doctorName: "" })}
                              hitSlop={8}
                            >
                              <X size={16} color={colors.mutedForeground} />
                            </Pressable>
                          ) : null}
                        </View>

                        <BodyPartAutocomplete
                          value={filters.bodyPart}
                          onChange={selectBodyPart}
                          label={t.records.bodyPart}
                          clearable
                        />

                        <View style={[styles.chipRow, { flexDirection: dir }]}>
                          {DATE_MODES.map((mode) => {
                            const active = filters.dateMode === mode;
                            return (
                              <Pressable
                                key={mode}
                                onPress={() => setDateMode(mode)}
                                style={[
                                  styles.dateChip,
                                  {
                                    backgroundColor: active ? `${colors.primary}12` : "transparent",
                                    borderColor: active ? colors.primary : colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: active ? colors.primary : colors.foreground,
                                    fontWeight: "600",
                                    fontSize: 12,
                                  }}
                                >
                                  {t.records.dateFilter[mode]}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        {filters.dateMode === "range" ? (
                          <View style={[styles.dateRow, { flexDirection: dir }]}>
                            <DateInput
                              label={t.records.dateFrom}
                              value={filters.dateFrom}
                              onChange={(dateFrom) => setFilters({ ...filters, dateFrom })}
                              colors={colors}
                              isRTL={isRTL}
                              dir={dir}
                            />
                            <DateInput
                              label={t.records.dateTo}
                              value={filters.dateTo}
                              onChange={(dateTo) => setFilters({ ...filters, dateTo })}
                              colors={colors}
                              isRTL={isRTL}
                              dir={dir}
                            />
                          </View>
                        ) : null}

                        {(filters.dateMode === "on" ||
                          filters.dateMode === "before" ||
                          filters.dateMode === "after") && (
                          <DateInput
                            label={t.records.date}
                            value={filters.singleDate}
                            onChange={(singleDate) => setFilters({ ...filters, singleDate })}
                            colors={colors}
                            isRTL={isRTL}
                            dir={dir}
                          />
                        )}
                      </View>
                    ) : null}

                    {filtering ? (
                      <Pressable onPress={clearFilters} style={styles.clearLink}>
                        <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>
                          {t.records.clearFilters}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {filteredRecords.length === 0 ? (
                    <View
                      style={[
                        styles.emptyState,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <ClipboardList size={32} color={colors.mutedForeground} />
                      <Text style={[styles.emptyTitle, { color: colors.foreground, textAlign }]}>
                        {displayRecords.length === 0
                          ? t.records.emptyTitle
                          : t.records.emptyFilteredTitle}
                      </Text>
                      <Text
                        style={[styles.emptyBody, { color: colors.mutedForeground, textAlign }]}
                      >
                        {displayRecords.length === 0
                          ? t.records.emptyBody
                          : t.records.emptyFilteredBody}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.timeline}>
                      {timelineGroups.map((group) => (
                        <View key={group.key} style={styles.timelineGroup}>
                          <Text
                            style={[styles.monthLabel, { color: colors.mutedForeground, textAlign }]}
                          >
                            {group.label}
                          </Text>
                          <View
                            style={
                              isDesktop && !isSkeleton
                                ? styles.timelineItemsGrid
                                : styles.timelineItems
                            }
                          >
                            {group.items.map((record, index) => (
                              <RecordTimelineItem
                                key={record.id}
                                record={record}
                                isLast={index === group.items.length - 1}
                                gridMode={isDesktop && !isSkeleton}
                                colors={colors}
                                isRTL={isRTL}
                                dir={dir}
                                textAlign={textAlign}
                                dateLocale={dateLocale}
                                onOpen={() => openRecord(record)}
                                categoryLabel={getLocalizedCategoryLabel(record.category, t)}
                                bodyPartLabel={
                                  record.bodyPart
                                    ? t.records.bodyParts[record.bodyPart]
                                    : undefined
                                }
                                attachmentLabel={t.records.attachmentAvailable}
                                doctorPrefix={t.records.doctorPrefix}
                                symptomsRecordedOne={t.records.symptomsRecordedOne}
                                symptomsRecordedMany={t.records.symptomsRecordedMany}
                              />
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : !isSkeleton ? (
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {webFiltersPanel}

                {filteredRecords.length === 0 ? (
                  <View
                    style={[
                      styles.emptyState,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <ClipboardList size={32} color={colors.mutedForeground} />
                    <Text style={[styles.emptyTitle, { color: colors.foreground, textAlign }]}>
                      {displayRecords.length === 0
                        ? t.records.emptyTitle
                        : t.records.emptyFilteredTitle}
                    </Text>
                    <Text style={[styles.emptyBody, { color: colors.mutedForeground, textAlign }]}>
                      {displayRecords.length === 0
                        ? t.records.emptyBody
                        : t.records.emptyFilteredBody}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timeline}>
                    {timelineGroups.map((group) => (
                      <View key={group.key} style={styles.timelineGroup}>
                        <Text
                          style={[styles.monthLabel, { color: colors.mutedForeground, textAlign }]}
                        >
                          {group.label}
                        </Text>
                        <View
                          style={
                            isDesktop && !isSkeleton
                              ? styles.timelineItemsGrid
                              : styles.timelineItems
                          }
                        >
                          {group.items.map((record, index) => (
                            <RecordTimelineItem
                              key={record.id}
                              record={record}
                              isLast={index === group.items.length - 1}
                              gridMode={isDesktop && !isSkeleton}
                              colors={colors}
                              isRTL={isRTL}
                              dir={dir}
                              textAlign={textAlign}
                              dateLocale={dateLocale}
                              onOpen={() => openRecord(record)}
                              categoryLabel={getLocalizedCategoryLabel(record.category, t)}
                              bodyPartLabel={
                                record.bodyPart
                                  ? t.records.bodyParts[record.bodyPart]
                                  : undefined
                              }
                              attachmentLabel={t.records.attachmentAvailable}
                              doctorPrefix={t.records.doctorPrefix}
                              symptomsRecordedOne={t.records.symptomsRecordedOne}
                              symptomsRecordedMany={t.records.symptomsRecordedMany}
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>

        </View>
      </ScrollView>
      )}

      {!isDesktop ? (
        <RecordsBottomChrome canAdd onAdd={openAdd} />
      ) : null}

      <FullscreenImageViewer uri={viewingFileUrl} onClose={() => setViewingFileUrl(null)} />
      <MedicalPdfViewer view={pdfView} onClose={() => setPdfView(null)} isRTL={isRTL} />
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

function DateInput({
  label,
  value,
  onChange,
  colors,
  isRTL,
  dir,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  dir: "row" | "row-reverse";
}) {
  const textAlign = alignText(isRTL);

  return (
    <View style={styles.dateField}>
      <Text style={[styles.dateLabel, { color: colors.mutedForeground, textAlign }]}>{label}</Text>
      <View
        style={[
          styles.dateInputRow,
          { flexDirection: dir, borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <AppTextInput
          value={formatWebDate(value)}
          onChangeText={(text) => onChange(parseWebDate(text))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.dateInput, { color: colors.foreground, textAlign }]}
        />
        {value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <X size={14} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function RecordTimelineItem({
  record,
  isLast,
  gridMode = false,
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
  symptomsRecordedOne,
  symptomsRecordedMany,
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
  symptomsRecordedOne: string;
  symptomsRecordedMany: string;
  gridMode?: boolean;
}) {
  const meta = getCategoryMeta(record.category);
  const subtitle = getRecordSubtitle(record);
  const formattedDate = new Date(record.date).toLocaleDateString(dateLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <View
      style={[
        gridMode ? styles.timelineGridCell : styles.timelineRow,
        !gridMode && { flexDirection: dir },
      ]}
    >
      {gridMode ? null : (
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: meta.color, borderColor: colors.card }]} />
        {!isLast ? (
          <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
        ) : null}
      </View>
      )}

      <Pressable
        testID="records-row"
        onPress={onOpen}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.recordCard,
          {
            backgroundColor: pressed ? colors.muted : colors.card,
            borderColor: colors.border,
            ...(isRTL
              ? { borderRightWidth: 3, borderRightColor: meta.color }
              : { borderLeftWidth: 3, borderLeftColor: meta.color }),
            transform: hovered ? [{ translateY: -1 }] : undefined,
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
            {record.symptoms.length}{" "}
            {record.symptoms.length === 1 ? symptomsRecordedOne : symptomsRecordedMany}
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
  page: { flex: 1, minHeight: 0, width: "100%", position: "relative" },
  dashboardChrome: {
    width: "100%",
    alignSelf: "center",
    flexShrink: 0,
  },
  dashboardHost: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    alignSelf: "center",
    paddingBottom: WEB_CONTENT_PADDING,
  },
  splitRow: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  skeletonOnly: {
    flex: 1,
    minHeight: 0,
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
    padding: 12,
    backgroundColor: "transparent",
  },
  splitSkeletonMobile: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    padding: 8,
    backgroundColor: "transparent",
  },
  splitRecordsPane: {
    flex: 6,
    flexDirection: "column",
  },
  splitPaneScroll: {
    flex: 1,
    minHeight: 0,
  },
  splitRecordsContent: {
    padding: WEB_CONTENT_PADDING,
    gap: WEB_CONTENT_PADDING,
    paddingBottom: 24,
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: WEB_CONTENT_PADDING,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    paddingHorizontal: WEB_CONTENT_PADDING,
    paddingTop: WEB_CONTENT_PADDING,
    paddingBottom: WEB_CONTENT_PADDING,
  },
  scrollContentSkeleton: {
    flexGrow: 1,
    flex: 1,
    paddingBottom: 12,
  },
  scrollContentSkeletonDesktop: {
    flex: 1,
  },
  container: {
    width: "100%",
    gap: 24,
  },
  containerSkeleton: {
    gap: 10,
  },
  containerSkeletonDesktop: {
    flex: 1,
    minHeight: 0,
  },
  containerSkeletonMobile: {
    flex: 1,
    minHeight: 0,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    width: "100%",
  },
  pageHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  pageHeaderSkeleton: {
    flexShrink: 0,
  },
  toggleWrapSkeleton: {
    flexShrink: 0,
    marginBottom: 0,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    width: "100%",
  },
  searchBlock: {
    gap: 12,
    marginBottom: 24,
  },
  searchBlockCompact: {
    gap: 12,
  },
  searchRow: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    minWidth: 0,
  },
  categoryRow: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    cursor: "pointer" as "auto",
  },
  filtersToggle: {
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 2,
    cursor: "pointer" as "auto",
  },
  filtersToggleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  advancedFilters: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chipRow: {
    flexWrap: "wrap",
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    cursor: "pointer" as "auto",
  },
  dateRow: {
    gap: 10,
  },
  dateField: {
    flex: 1,
    gap: 4,
    minWidth: 140,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateInputRow: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearLink: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    cursor: "pointer" as "auto",
  },
  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 360,
  },
  timeline: {
    gap: 28,
  },
  timelineGroup: {
    gap: 12,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    paddingHorizontal: 4,
  },
  timelineItems: {
    gap: 0,
  },
  timelineItemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  timelineGridCell: {
    width: "31.5%",
    minWidth: 220,
  },
  timelineRow: {
    alignItems: "stretch",
    gap: 14,
  },
  timelineRail: {
    width: 20,
    alignItems: "center",
    paddingTop: 18,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 24,
  },
  recordCard: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
    marginBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    cursor: "pointer" as "auto",
  },
  recordCardTop: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
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
    lineHeight: 19,
    marginTop: 2,
  },
  attachmentRow: {
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  attachmentText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
