import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import {
  buildMonthGrid,
  calendarWeekStartsOn,
  monthLabel,
  parseYmd,
  weekRangeForDate,
  weekdayLabels,
  type ScheduleScopeMode,
} from "@/domains/schedule/calendar";
import { useColors } from "@/hooks/useColors";
import { flexRow, localeTag } from "@/utils/rtl";

interface Props {
  isRTL: boolean;
  year: number;
  month: number;
  mode: ScheduleScopeMode;
  selectedDate: string;
  selectedWeekStart: string;
  selectedMonth: number;
  selectedYear: number;
  markedDates?: Set<string>;
  /** When provided, highlights every date in the set (multi-select mode). */
  selectedDates?: Set<string>;
  /** Dates that already have booked appointments — dimmed with an amber dot. */
  bookedDates?: Set<string>;
  singleDaySelection?: boolean;
  /** Day cell size in px (default 36). */
  cellSize?: number;
  /** Center the grid horizontally with even gaps between days. */
  centered?: boolean;
  /** Size day cells to fill the container width (mobile-friendly). */
  responsive?: boolean;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function MonthNavButton({
  onPress,
  icon: Icon,
  colors,
}: {
  onPress: () => void;
  icon: typeof ChevronLeft;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.navBtn,
        Platform.OS === "web" && styles.navBtnWeb,
        (pressed || hovered) && { backgroundColor: `${colors.primary}14` },
      ]}
    >
      <Icon size={28} color={colors.primary} strokeWidth={2.5} />
    </Pressable>
  );
}

export function ScheduleMonthGrid({
  isRTL,
  year,
  month,
  mode,
  selectedDate,
  selectedWeekStart,
  selectedMonth,
  selectedYear,
  markedDates,
  selectedDates,
  bookedDates,
  singleDaySelection = false,
  cellSize = 36,
  centered = false,
  responsive = false,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const colors = useColors();
  const dir = flexRow(isRTL);
  const weekStartsOn = calendarWeekStartsOn(isRTL);
  const labels = weekdayLabels(isRTL);
  const rowDir = isRTL ? "row-reverse" : "row";
  const dateLocale = localeTag(isRTL);
  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const weeks = useMemo(
    () => buildMonthGrid(year, month, weekStartsOn),
    [year, month, weekStartsOn],
  );
  const dayCellStyle = responsive
    ? styles.dayCellFlex
    : {
        width: cellSize,
        height: cellSize,
        borderRadius: cellSize / 2,
      };
  const weekdayStyle = responsive
    ? styles.weekdayFlex
    : {
        width: cellSize,
        textAlign: "center" as const,
        fontSize: cellSize >= 44 ? 12 : 11,
        fontWeight: "700" as const,
      };
  const cellGap = responsive ? 6 : centered ? 8 : 0;
  const gridWidth = cellSize * 7 + cellGap * 6;
  const rowLayout = responsive
    ? ({ gap: cellGap } as ViewStyle)
    : centered
      ? ({ justifyContent: "center", gap: cellGap } as ViewStyle)
      : ({ justifyContent: "space-between" } as ViewStyle);

  const isInSelectedWeek = (date: string) => {
    if (mode !== "week") return false;
    const range = weekRangeForDate(parseYmd(selectedWeekStart));
    return date >= range.start && date <= range.end;
  };

  const isSelectedMonthTile = (m: number) =>
    mode === "month" && m === selectedMonth && year === selectedYear;

  const isSelectedYear = (y: number) => mode === "year" && y === selectedYear;

  if (mode === "year") {
    const years = [year - 1, year, year + 1];
    return (
      <View style={styles.wrap}>
        <View style={[styles.navRow, { flexDirection: dir }]}>
          <MonthNavButton onPress={onPrevMonth} icon={PrevIcon} colors={colors} />
          <Text style={[styles.monthTitle, { color: colors.foreground, writingDirection: isRTL ? "rtl" : "ltr" }]}>
            {monthLabel(month, isRTL)} {year}
          </Text>
          <MonthNavButton onPress={onNextMonth} icon={NextIcon} colors={colors} />
        </View>
        <View style={[styles.yearGrid, { flexDirection: rowDir }]}>
          {years.map((y) => (
            <Pressable
              key={y}
              onPress={() => onSelectDate(`${y}-01-01`)}
              style={[
                styles.yearTile,
                {
                  borderColor: isSelectedYear(y) ? colors.primary : colors.border,
                  backgroundColor: isSelectedYear(y) ? `${colors.primary}18` : colors.muted,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{y}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.monthsGrid, { flexDirection: rowDir }]}>
          {Array.from({ length: 12 }, (_, m) => (
            <Pressable
              key={m}
              onPress={() => onSelectDate(`${selectedYear}-${String(m + 1).padStart(2, "0")}-01`)}
              style={[
                styles.monthTile,
                {
                  borderColor: isSelectedMonthTile(m) ? colors.primary : colors.border,
                  backgroundColor: isSelectedMonthTile(m) ? `${colors.primary}18` : colors.background,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 12 }}>
                {monthLabel(m, isRTL)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        responsive && styles.wrapResponsive,
        centered && !responsive && { width: "100%", maxWidth: gridWidth, alignSelf: "center" },
      ]}
    >
      <View style={[styles.navRow, { flexDirection: dir }]}>
        <MonthNavButton onPress={onPrevMonth} icon={PrevIcon} colors={colors} />
        <Text
          style={[
            styles.monthTitle,
            responsive && styles.monthTitleResponsive,
            { color: colors.foreground, writingDirection: isRTL ? "rtl" : "ltr" },
          ]}
          numberOfLines={1}
        >
          {monthLabel(month, isRTL)} {year}
        </Text>
        <MonthNavButton onPress={onNextMonth} icon={NextIcon} colors={colors} />
      </View>

      <View style={[styles.weekdayRow, { flexDirection: rowDir }, rowLayout]}>
        {labels.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            style={[weekdayStyle, { color: colors.mutedForeground }]}
          >
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={[styles.weekRow, { flexDirection: rowDir }, rowLayout]}>
          {week.map((date, di) => {
            if (!date) {
              return <View key={`empty-${wi}-${di}`} style={[styles.dayCell, dayCellStyle]} />;
            }
            const inMonth = parseYmd(date).getMonth() === month;
            const selected = selectedDates
              ? selectedDates.has(date)
              : singleDaySelection
                ? selectedDate === date
                : mode === "month"
                  ? parseYmd(date).getMonth() === selectedMonth &&
                    parseYmd(date).getFullYear() === selectedYear
                  : mode === "week"
                    ? isInSelectedWeek(date)
                    : selectedDate === date;
            const marked = markedDates?.has(date);
            const booked = bookedDates?.has(date);

            return (
              <Pressable
                key={date}
                onPress={() => onSelectDate(date)}
                style={[
                  styles.dayCell,
                  dayCellStyle,
                  booked && !selected && { backgroundColor: "#f59e0b1A" },
                  selected && {
                    backgroundColor: `${colors.primary}22`,
                    borderColor: colors.primary,
                    borderWidth: 1,
                  },
                  !inMonth && { opacity: 0.35 },
                ]}
              >
                <Text
                  style={{
                    color: selected
                      ? colors.primary
                      : booked
                        ? colors.mutedForeground
                        : colors.foreground,
                    fontWeight: selected ? "800" : "500",
                    fontSize: responsive ? 12 : 13,
                  }}
                >
                  {parseYmd(date).getDate().toLocaleString(dateLocale)}
                </Text>
                {marked ? (
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                ) : booked ? (
                  <View style={[styles.dot, { backgroundColor: "#f59e0b" }]} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  wrapResponsive: {
    width: "100%",
  },
  navRow: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  navBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  navBtnWeb: {
    cursor: "pointer",
  } as ViewStyle,
  monthTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  monthTitleResponsive: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 4,
  },
  weekdayRow: {
    paddingHorizontal: 2,
    width: "100%",
  },
  weekRow: {
    width: "100%",
  },
  weekdayFlex: {
    flex: 1,
    minWidth: 0,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellFlex: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  yearGrid: {
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  yearTile: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  monthsGrid: {
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  monthTile: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
