import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Calendar, ChevronDown, ChevronUp, Search, SlidersHorizontal, Stethoscope, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppTextInput } from "@/components/AppTextInput";
import { BodyPartAutocomplete } from "@/components/records/BodyPartAutocomplete";
import {
  EMPTY_MEDICAL_FILTERS,
  hasActiveFilters,
  type DateFilterMode,
  type MedicalHistoryFilters,
} from "@/domains/medical/search";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, localeTag } from "@/utils/rtl";

type PickerTarget = "from" | "to" | "single" | null;

function formatDate(d: Date | null, locale: string): string {
  if (!d) return "";
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function DateFieldButton({
  label,
  value,
  onPress,
  onClear,
  colors,
  isRTL,
  dir,
}: {
  label: string;
  value: Date | null;
  onPress: () => void;
  onClear: () => void;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  dir: "row" | "row-reverse";
}) {
  const locale = localeTag(isRTL);
  return (
    <View style={styles.dateFieldWrap}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.mutedForeground, textAlign: alignText(isRTL) },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.dateFieldRow,
          { flexDirection: dir, borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Pressable onPress={onPress} style={[styles.dateFieldPress, { flexDirection: dir }]}>
          <Calendar size={16} color={colors.primary} />
          <Text
            style={[
              styles.dateFieldText,
              {
                color: value ? colors.foreground : colors.mutedForeground,
                textAlign: alignText(isRTL),
              },
            ]}
          >
            {value ? formatDate(value, locale) : isRTL ? "اختر تاريخًا" : "Select date"}
          </Text>
        </Pressable>
        {value && (
          <Pressable onPress={onClear} hitSlop={8} style={styles.dateClear}>
            <X size={14} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function MedicalHistoryFilterPanel({
  filters,
  onChange,
  isRTL,
  dir,
  embedded = false,
  defaultExpanded = false,
}: {
  filters: MedicalHistoryFilters;
  onChange: (f: MedicalHistoryFilters) => void;
  isRTL: boolean;
  dir: "row" | "row-reverse";
  /** Tighter layout for modals / sheets */
  embedded?: boolean;
  defaultExpanded?: boolean;
}) {
  const colors = useColors();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [iosDraft, setIosDraft] = useState<Date>(new Date());

  const active = hasActiveFilters(filters);
  const locale = localeTag(isRTL);
  const textAlign = alignText(isRTL);

  const collapsedSummary = (() => {
    if (!active) return isRTL ? "اضغط للتصفية" : "Tap to filter";
    const parts: string[] = [];
    if (filters.text.trim()) {
      parts.push(`"${filters.text.trim()}"`);
    }
    if (filters.doctorName.trim()) {
      parts.push(
        isRTL
          ? `د. ${filters.doctorName.trim()}`
          : `Dr. ${filters.doctorName.trim()}`,
      );
    }
    if (filters.bodyPart) {
      parts.push(
        filters.bodyPart === "general"
          ? t.records.bodyPartAll
          : t.records.bodyParts[filters.bodyPart],
      );
    }
    if (filters.dateMode === "range") {
      const from = filters.dateFrom ? formatDate(filters.dateFrom, locale) : "…";
      const to = filters.dateTo ? formatDate(filters.dateTo, locale) : "…";
      parts.push(isRTL ? `${from} – ${to}` : `${from} – ${to}`);
    } else if (filters.dateMode === "on" && filters.singleDate) {
      parts.push(
        isRTL
          ? `في ${formatDate(filters.singleDate, locale)}`
          : `On ${formatDate(filters.singleDate, locale)}`,
      );
    } else if (filters.dateMode === "before" && filters.singleDate) {
      parts.push(
        isRTL
          ? `قبل ${formatDate(filters.singleDate, locale)}`
          : `Before ${formatDate(filters.singleDate, locale)}`,
      );
    } else if (filters.dateMode === "after" && filters.singleDate) {
      parts.push(
        isRTL
          ? `بعد ${formatDate(filters.singleDate, locale)}`
          : `After ${formatDate(filters.singleDate, locale)}`,
      );
    }
    return parts.join(" · ");
  })();

  const openPicker = (target: PickerTarget, current: Date | null) => {
    setIosDraft(current ?? new Date());
    setPickerTarget(target);
  };

  const applyDate = (date: Date) => {
    if (pickerTarget === "from") onChange({ ...filters, dateFrom: date });
    else if (pickerTarget === "to") onChange({ ...filters, dateTo: date });
    else if (pickerTarget === "single") onChange({ ...filters, singleDate: date });
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      setPickerTarget(null);
      return;
    }
    if (selected) {
      if (Platform.OS === "android") {
        applyDate(selected);
        setPickerTarget(null);
      } else {
        setIosDraft(selected);
      }
    }
  };

  const pickerValue =
    pickerTarget === "from"
      ? filters.dateFrom
      : pickerTarget === "to"
        ? filters.dateTo
        : filters.singleDate;

  const setDateMode = (mode: DateFilterMode) => {
    onChange({
      ...filters,
      dateMode: mode,
      ...(mode === "any"
        ? { dateFrom: null, dateTo: null, singleDate: null }
        : mode === "range"
          ? { singleDate: null }
          : { dateFrom: null, dateTo: null }),
    });
  };

  const modes: { key: DateFilterMode; labelEn: string; labelAr: string }[] = [
    { key: "any", labelEn: "Any date", labelAr: "أي تاريخ" },
    { key: "on", labelEn: "On date", labelAr: "تاريخ محدد" },
    { key: "range", labelEn: "Range", labelAr: "نطاق" },
    { key: "before", labelEn: "Before", labelAr: "قبل" },
    { key: "after", labelEn: "After", labelAr: "بعد" },
  ];

  return (
    <View
      style={[
        styles.panel,
        embedded && styles.panelEmbedded,
        {
          backgroundColor: colors.filterPanel,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <View style={[styles.panelHeader, { flexDirection: dir }]}>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={[styles.headerLeft, { flexDirection: dir }]}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <SlidersHorizontal size={18} color={active ? colors.primary : colors.mutedForeground} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.panelTitle, { color: colors.foreground, textAlign }]}>
              {isRTL ? "تصفية السجل" : "Filter records"}
            </Text>
            {!expanded && (
              <Text
                style={[styles.collapsedHint, { color: colors.mutedForeground, textAlign }]}
                numberOfLines={1}
              >
                {collapsedSummary}
              </Text>
            )}
          </View>
          {active && !expanded && (
            <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
          )}
        </Pressable>
        {active && !expanded && (
          <Pressable onPress={() => onChange(EMPTY_MEDICAL_FILTERS)} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          {expanded ? (
            <ChevronUp size={18} color={colors.mutedForeground} />
          ) : (
            <ChevronDown size={18} color={colors.mutedForeground} />
          )}
        </Pressable>
      </View>

      {expanded && (
        <>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, textAlign }]}>
        {isRTL ? "بحث بالنص" : "Search text"}
      </Text>
      <View
        style={[
          styles.textRow,
          { flexDirection: dir, borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Search size={16} color={colors.mutedForeground} />
        <AppTextInput
          value={filters.text}
          onChangeText={(text) => onChange({ ...filters, text })}
          placeholder={isRTL ? "عنوان، وصف، أعراض…" : "Title, description, symptoms…"}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.textInput,
            { color: colors.foreground, textAlign },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {filters.text.length > 0 && (
          <Pressable onPress={() => onChange({ ...filters, text: "" })} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12, textAlign }]}>
        {isRTL ? "اسم الطبيب (التشخيص)" : "Doctor name (diagnosis)"}
      </Text>
      <View
        style={[
          styles.textRow,
          { flexDirection: dir, borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Stethoscope size={16} color={colors.mutedForeground} />
        <AppTextInput
          value={filters.doctorName}
          onChangeText={(doctorName) => onChange({ ...filters, doctorName })}
          placeholder={isRTL ? "مثال: أحمد" : "e.g. Smith"}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.textInput,
            { color: colors.foreground, textAlign },
          ]}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {filters.doctorName.length > 0 && (
          <Pressable onPress={() => onChange({ ...filters, doctorName: "" })} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={{ marginTop: 12 }}>
        <BodyPartAutocomplete
          value={filters.bodyPart}
          onChange={(bodyPart) => onChange({ ...filters, bodyPart })}
          label={t.records.bodyPart}
          clearable
        />
      </View>

      <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12, textAlign }]}>
        {isRTL ? "التاريخ" : "Date"}
      </Text>
      <View style={[styles.modeRow, { flexDirection: dir }]}>
        {modes.map((m) => {
          const sel = filters.dateMode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setDateMode(m.key)}
              style={[
                styles.modeChip,
                {
                  backgroundColor: sel ? colors.primary : colors.card,
                  borderColor: sel ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: sel ? "#fff" : colors.foreground,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {isRTL ? m.labelAr : m.labelEn}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filters.dateMode === "range" && (
        <View style={styles.dateFieldsCol}>
          <DateFieldButton
            label={isRTL ? "من" : "From"}
            value={filters.dateFrom}
            onPress={() => openPicker("from", filters.dateFrom)}
            onClear={() => onChange({ ...filters, dateFrom: null })}
            colors={colors}
            isRTL={isRTL}
            dir={dir}
          />
          <DateFieldButton
            label={isRTL ? "إلى" : "To"}
            value={filters.dateTo}
            onPress={() => openPicker("to", filters.dateTo)}
            onClear={() => onChange({ ...filters, dateTo: null })}
            colors={colors}
            isRTL={isRTL}
            dir={dir}
          />
        </View>
      )}

      {(filters.dateMode === "on" ||
        filters.dateMode === "before" ||
        filters.dateMode === "after") && (
        <DateFieldButton
          label={
            filters.dateMode === "on"
              ? isRTL
                ? "التاريخ المحدد"
                : "Specific date"
              : isRTL
                ? "التاريخ"
                : "Date"
          }
          value={filters.singleDate}
          onPress={() => openPicker("single", filters.singleDate)}
          onClear={() => onChange({ ...filters, singleDate: null })}
          colors={colors}
          isRTL={isRTL}
          dir={dir}
        />
      )}

        {active && (
          <Pressable
            onPress={() => onChange(EMPTY_MEDICAL_FILTERS)}
            style={[styles.clearAllRow, { borderColor: colors.border }]}
          >
            <Text style={[styles.clearAll, { color: colors.primary }]}>
              {isRTL ? "مسح جميع الفلاتر" : "Clear all filters"}
            </Text>
          </Pressable>
        )}
        </>
      )}

      {pickerTarget && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerValue ?? iosDraft}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      )}

      {pickerTarget && Platform.OS === "ios" && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setPickerTarget(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerTarget(null)} />
          <View style={[styles.iosSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.iosSheetHeader, { flexDirection: dir }]}>
              <Pressable onPress={() => setPickerTarget(null)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                  {isRTL ? "إلغاء" : "Cancel"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  applyDate(iosDraft);
                  setPickerTarget(null);
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: "700" }}>
                  {isRTL ? "تم" : "Done"}
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={iosDraft}
              mode="date"
              display="spinner"
              onChange={onPickerChange}
              locale={isRTL ? "ar" : undefined}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  panelEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  panelHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  headerLeft: { flex: 1, alignItems: "center", gap: 10 },
  panelTitle: { fontSize: 15, fontWeight: "800" },
  collapsedHint: { fontSize: 12, fontWeight: "500" },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  clearAll: { fontSize: 13, fontWeight: "700" },
  clearAllRow: {
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 10 },
  textRow: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  modeRow: { flexWrap: "wrap", gap: 8, marginBottom: 4 },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateFieldsCol: { gap: 10, marginTop: 8 },
  dateFieldWrap: { marginTop: 8 },
  dateFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  dateFieldPress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateFieldText: { fontSize: 14, fontWeight: "500" },
  dateClear: { paddingHorizontal: 12, paddingVertical: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  iosSheetHeader: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
});
