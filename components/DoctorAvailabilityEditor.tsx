import { Check, Clock } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ScheduleMonthGrid } from "@/components/schedule/ScheduleMonthGrid";
import { WEB_BREAKPOINTS } from "@/constants/webLayout";
import { fetchMyAppointments } from "@/domains/appointments/api";
import {
  fetchMyScheduleOverrides,
  saveMyScheduleOverrides,
  type ScheduleOverrideRow,
} from "@/domains/schedule/api";
import {
  buildMonthGrid,
  calendarWeekStartsOn,
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  DEFAULT_SLOT_MINUTES,
  isDateInPast,
} from "@/domains/schedule/calendar";
import { useColors } from "@/hooks/useColors";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

interface Props {
  isRTL: boolean;
  token: string;
  /** Render inside a parent card (no outer border/background). */
  embedded?: boolean;
  /** Weekly planner styling with weekday quick-select presets. */
  variant?: "calendar" | "weekly";
  /**
   * Reuse the calendar for something other than the meeting schedule (surgery
   * slot proposals): the caller supplies marks, extra controls and the save.
   */
  custom?: {
    header?: React.ReactNode;
    footer?: React.ReactNode;
    markedDates: Set<string>;
    bookedDates: Set<string>;
    legend: { marked: string; booked: string };
    saveLabel: string;
    disabled?: boolean;
    /** Resolves to the success message shown to the user. */
    onSave: (dates: string[], from: string, to: string) => Promise<string>;
  };
}

/** 30-minute time options for the from/to dropdowns. */
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 30) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

function nextHalfHourAfter(time: string): string | null {
  const idx = TIME_OPTIONS.indexOf(time);
  return idx >= 0 && idx < TIME_OPTIONS.length - 1 ? TIME_OPTIONS[idx + 1] : null;
}

function TimeSelect({
  label,
  value,
  onChange,
  isRTL,
  colors,
  options = TIME_OPTIONS,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  options?: string[];
}) {
  const [open, setOpen] = useState(false);
  const scrollIndex = Math.max(0, options.indexOf(value));
  return (
    <View style={styles.timeCol}>
      <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.timeBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <Clock size={15} color={colors.primary} />
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}>{value}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.timeSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(t) => t}
              style={{ maxHeight: 320 }}
              getItemLayout={(_, i) => ({ length: 44, offset: 44 * i, index: i })}
              initialScrollIndex={scrollIndex}
              renderItem={({ item }) => {
                const on = item === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={[styles.timeOption, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Text
                      style={{
                        color: on ? colors.primary : colors.foreground,
                        fontWeight: on ? "800" : "500",
                        fontSize: 15,
                      }}
                    >
                      {item}
                    </Text>
                    {on ? <Check size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DoctorAvailabilityEditor({
  isRTL,
  token,
  embedded = false,
  variant = "calendar",
  custom,
}: Props) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const isMobileLayout =
    Platform.OS !== "web" || screenWidth < WEB_BREAKPOINTS.tablet;
  const now = useMemo(() => new Date(), []);
  const weekStartsOn = calendarWeekStartsOn(isRTL);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<ScheduleOverrideRow[]>([]);
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());
  const [fromTime, setFromTime] = useState(DEFAULT_SCHEDULE_START);
  const [toTime, setToTime] = useState(DEFAULT_SCHEDULE_END);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isCustom = !!custom;
  const load = useCallback(async () => {
    if (isCustom) {
      setLoading(false);
      return;
    }
    try {
      const [ov, appts] = await Promise.all([
        fetchMyScheduleOverrides(token),
        fetchMyAppointments(token).catch(() => []),
      ]);
      setOverrides(ov);
      const booked = new Set<string>();
      for (const a of appts) {
        if (a.date && a.status !== "cancelled" && a.status !== "rejected") {
          booked.add(a.date);
        }
      }
      setBookedDates(booked);
    } catch {
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  }, [token, isCustom]);

  useEffect(() => {
    void load();
  }, [load]);

  const toTimeOptions = useMemo(
    () => TIME_OPTIONS.filter((t) => t > fromTime),
    [fromTime],
  );

  const handleFromTimeChange = (next: string) => {
    setFromTime(next);
    if (toTime <= next) {
      const bumped = nextHalfHourAfter(next) ?? DEFAULT_SCHEDULE_END;
      if (bumped > next) setToTime(bumped);
    }
  };

  // Dates that already have an open (available) override — shown as a dot.
  const scheduleMarkedDates = useMemo(() => {
    const s = new Set<string>();
    for (const o of overrides) {
      if (o.start_date === o.end_date && !o.is_closed) s.add(o.start_date);
    }
    return s;
  }, [overrides]);
  const markedDates = custom?.markedDates ?? scheduleMarkedDates;

  const monthDays = useMemo(
    () =>
      buildMonthGrid(year, month, weekStartsOn)
        .flat()
        .filter((d): d is string => !!d && !isDateInPast(d)),
    [year, month, weekStartsOn],
  );
  const wholeMonthSelected =
    monthDays.length > 0 && monthDays.every((d) => selected.has(d));

  const goMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const toggleDate = (date: string) => {
    if (isDateInPast(date)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const toggleWholeMonth = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (wholeMonthSelected) monthDays.forEach((d) => next.delete(d));
      else monthDays.forEach((d) => next.add(d));
      return next;
    });
  };

  /** Weekday: 1=Mon … 5=Fri (JS getDay: 0=Sun). */
  const selectWeekdays = (weekdays: number[]) => {
    const matching = monthDays.filter((d) => {
      const dow = new Date(`${d}T12:00:00`).getDay();
      return weekdays.includes(dow);
    });
    setSelected((prev) => {
      const next = new Set(prev);
      matching.forEach((d) => next.add(d));
      return next;
    });
  };

  const weekdayPresets = [
    {
      key: "mon-fri",
      labelEn: "Mon–Fri",
      labelAr: "الإثنين–الجمعة",
      days: [1, 2, 3, 4, 5],
    },
    {
      key: "weekend",
      labelEn: "Sat–Sun",
      labelAr: "السبت–الأحد",
      days: [0, 6],
    },
  ];

  const persist = async () => {
    if (selected.size === 0) {
      Alert.alert(
        isRTL ? "لم يتم اختيار أيام" : "No days selected",
        isRTL ? "اختر يومًا أو أكثر من التقويم." : "Pick one or more days on the calendar.",
      );
      return;
    }
    if (toTime <= fromTime) {
      Alert.alert(
        isRTL ? "وقت غير صالح" : "Invalid time",
        isRTL ? "يجب أن يكون وقت النهاية بعد البداية." : "End time must be after start time.",
      );
      return;
    }
    if (custom) {
      setSaving(true);
      try {
        const message = await custom.onSave(Array.from(selected).sort(), fromTime, toTime);
        setSelected(new Set());
        showSuccessToast(message);
      } catch (e) {
        showErrorToast(isRTL ? "خطأ" : "Error", (e as Error).message);
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      const fresh: ScheduleOverrideRow[] = Array.from(selected).map((date) => ({
        scope: "day",
        start_date: date,
        end_date: date,
        is_closed: false,
        start_time: fromTime,
        end_time: toTime,
        slot_minutes: DEFAULT_SLOT_MINUTES,
      }));
      const kept = overrides.filter(
        (o) => !(o.start_date === o.end_date && selected.has(o.start_date)),
      );
      const saved = await saveMyScheduleOverrides(token, [...kept, ...fresh]);
      setOverrides(saved);
      setSelected(new Set());
      Alert.alert(
        isRTL ? "تم الحفظ" : "Saved",
        isRTL
          ? `الأيام متاحة من ${fromTime} إلى ${toTime}.`
          : `Days available ${fromTime}–${toTime}.`,
      );
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />;
  }

  const body = (
    <>
      {custom?.header}
      {!embedded ? (
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {isRTL ? "أوقات التوفر" : "Availability"}
        </Text>
      ) : null}
      <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
        {variant === "weekly"
          ? isRTL
            ? "اختر أيامًا من التقويم أو استخدم اختصارات أيام الأسبوع، ثم حدّد وقت البداية والنهاية."
            : "Pick days on the calendar or use weekday shortcuts, then set from/to times."
          : isRTL
            ? "اختر أيامًا من التقويم (يمكن اختيار عدة أيام أو شهور)، ثم حدّد وقت البداية والنهاية."
            : "Pick days on the calendar (across any months/years), then set a from/to time."}
      </Text>

      {variant === "weekly" ? (
        <View style={[styles.weekdayRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {weekdayPresets.map((preset) => (
            <Pressable
              key={preset.key}
              onPress={() => selectWeekdays(preset.days)}
              style={[styles.weekdayChip, { borderColor: colors.border, backgroundColor: colors.muted }]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                {isRTL ? preset.labelAr : preset.labelEn}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={toggleWholeMonth}
        disabled={monthDays.length === 0}
        style={[
          styles.wholeMonthBtn,
          {
            alignSelf: isRTL ? "flex-end" : "flex-start",
            borderColor: wholeMonthSelected ? colors.primary : colors.border,
            backgroundColor: wholeMonthSelected ? `${colors.primary}14` : "transparent",
          },
        ]}
      >
        <Text
          style={{
            color: wholeMonthSelected ? colors.primary : colors.foreground,
            fontWeight: "700",
            fontSize: 13,
          }}
        >
          {wholeMonthSelected
            ? isRTL
              ? "إلغاء اختيار الشهر"
              : "Deselect month"
            : isRTL
              ? "اختيار الشهر كامل"
              : "Select whole month"}
        </Text>
      </Pressable>

      <View
        testID="profile-calendar"
        style={[
          styles.calendarWrap,
          isMobileLayout && styles.calendarWrapMobile,
        ]}
      >
        <ScheduleMonthGrid
          isRTL={isRTL}
          year={year}
          month={month}
          mode="week"
          cellSize={isMobileLayout ? 36 : 48}
          centered={!isMobileLayout}
          responsive={isMobileLayout}
          selectedDate=""
          selectedWeekStart={`${year}-01-01`}
          selectedMonth={month}
          selectedYear={year}
          selectedDates={selected}
          markedDates={markedDates}
          bookedDates={custom?.bookedDates ?? bookedDates}
          onSelectDate={toggleDate}
          onPrevMonth={() => goMonth(-1)}
          onNextMonth={() => goMonth(1)}
        />
      </View>

      <View style={[styles.legendRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {custom?.legend.marked ?? (isRTL ? "متاح" : "Available")}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {custom?.legend.booked ?? (isRTL ? "محجوز" : "Booked")}
          </Text>
        </View>
      </View>

      <View style={[styles.timeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <TimeSelect
          label={isRTL ? "من" : "From"}
          value={fromTime}
          onChange={handleFromTimeChange}
          isRTL={isRTL}
          colors={colors}
        />
        <TimeSelect
          label={isRTL ? "إلى" : "To"}
          value={toTime}
          onChange={setToTime}
          isRTL={isRTL}
          colors={colors}
          options={toTimeOptions}
        />
      </View>

      {custom?.footer}

      <Text
        style={[
          styles.selectedCount,
          { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
        ]}
      >
        {selected.size > 0
          ? isRTL
            ? `${selected.size} يوم مختار`
            : `${selected.size} day(s) selected`
          : isRTL
            ? "لم يتم اختيار أيام"
            : "No days selected"}
      </Text>

      <Pressable
        onPress={() => void persist()}
        disabled={saving || custom?.disabled}
        style={[
          embedded ? styles.saveBtnEmbedded : styles.saveBtn,
          embedded ? { alignSelf: isRTL ? "flex-start" : "flex-end" } : null,
          {
            backgroundColor: embedded ? "transparent" : colors.primary,
            borderColor: embedded ? colors.border : colors.primary,
            opacity: saving || custom?.disabled ? 0.6 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={embedded ? colors.primary : "#fff"} />
        ) : (
          <Text
            style={[
              styles.saveText,
              embedded ? { color: colors.primary } : { color: "#fff" },
            ]}
          >
            {custom?.saveLabel ?? (isRTL ? "حفظ الجدول" : "Save schedule")}
          </Text>
        )}
      </Pressable>
    </>
  );

  if (embedded) {
    return <View style={styles.embedded}>{body}</View>;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  embedded: {
    width: "100%",
    maxWidth: "100%",
    gap: 14,
    overflow: "hidden",
  },
  calendarWrap: {
    width: "100%",
    maxWidth: "100%",
    alignItems: "center",
    alignSelf: "stretch",
    overflow: "hidden",
  },
  calendarWrapMobile: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    width: "100%",
    maxWidth: 560,
    overflow: "hidden",
  },
  title: { fontSize: 16, fontWeight: "800" },
  hint: { fontSize: 13, lineHeight: 18 },
  wholeMonthBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  weekdayRow: {
    flexWrap: "wrap",
    gap: 8,
  },
  weekdayChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  legendRow: { gap: 16, marginTop: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  timeRow: {
    gap: 10,
    marginTop: 8,
    width: "100%",
    maxWidth: "100%",
  },
  timeCol: { flex: 1, minWidth: 0, gap: 4 },
  timeLabel: { fontSize: 12, fontWeight: "700" },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 0,
  },
  selectedCount: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  saveBtn: {
    width: "100%",
    maxWidth: "100%",
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveBtnEmbedded: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  timeSheet: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
    maxWidth: 360,
    width: "100%",
    alignSelf: "center",
  },
  sheetTitle: { fontSize: 15, fontWeight: "800" },
  timeOption: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    height: 44,
  },
});
