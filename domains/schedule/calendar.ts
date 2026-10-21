import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
  DEFAULT_SLOT_MINUTES,
} from "./constants";
import {
  addDays,
  formatDateYmd,
  type ScheduleOverrideRow,
} from "./api";

export type ScheduleScopeMode = "week" | "month" | "year";

export interface DayHours {
  date: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

const MONTH_LABELS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_LABELS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function monthLabel(monthIndex: number, isRTL: boolean): string {
  const labels = isRTL ? MONTH_LABELS_AR : MONTH_LABELS_EN;
  return labels[monthIndex] ?? "";
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function startOfWeekSunday(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function endOfWeekSaturday(date: Date): Date {
  return addDays(startOfWeekSunday(date), 6);
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1, 12, 0, 0, 0);
}

export function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 12, 0, 0, 0);
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  return {
    start: formatDateYmd(startOfMonth(year, month)),
    end: formatDateYmd(endOfMonth(year, month)),
  };
}

export function yearRange(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function weekRangeForDate(date: Date): { start: string; end: string } {
  return {
    start: formatDateYmd(startOfWeekSunday(date)),
    end: formatDateYmd(endOfWeekSaturday(date)),
  };
}

export function datesBetween(startYmd: string, endYmd: string): string[] {
  const out: string[] = [];
  let cursor = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  while (cursor <= end) {
    out.push(formatDateYmd(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn = 0,
): (string | null)[][] {
  const first = startOfMonth(year, month);
  const last = endOfMonth(year, month);
  const weeks: (string | null)[][] = [];
  const leading = (first.getDay() - weekStartsOn + 7) % 7;
  let week: (string | null)[] = Array(leading).fill(null);

  for (let day = 1; day <= last.getDate(); day++) {
    const date = new Date(year, month, day, 12, 0, 0, 0);
    week.push(formatDateYmd(date));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

/** Sunday-first (US) vs Saturday-first (Arabic ar-EG). */
export function calendarWeekStartsOn(isRTL: boolean): number {
  return isRTL ? 6 : 0;
}

export function weekdayLabels(isRTL: boolean): string[] {
  return isRTL ? WEEKDAY_LABELS_AR : WEEKDAY_LABELS_EN;
}

export { DEFAULT_SCHEDULE_END, DEFAULT_SCHEDULE_START, DEFAULT_SLOT_MINUTES } from "./constants";

export function defaultDayHours(date: string): DayHours {
  const dow = parseYmd(date).getDay();
  return {
    date,
    is_active: true,
    start_time: DEFAULT_SCHEDULE_START,
    end_time: DEFAULT_SCHEDULE_END,
    slot_minutes: 10,
  };
}

export function dayHoursFromWeekly(
  date: string,
  weekly: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_minutes: number;
    is_active: boolean;
  }>,
): DayHours {
  const dow = parseYmd(date).getDay();
  const row = weekly.find((r) => r.day_of_week === dow);
  if (!row) return defaultDayHours(date);
  return {
    date,
    is_active: row.is_active,
    start_time: row.start_time.slice(0, 5),
    end_time: row.end_time.slice(0, 5),
    slot_minutes: row.slot_minutes,
  };
}

export function dayHoursFromOverrides(
  date: string,
  overrides: ScheduleOverrideRow[],
): DayHours | null {
  const hit = overrides.filter(
    (o) => o.start_date <= date && o.end_date >= date,
  );
  if (hit.length === 0) return null;
  if (hit.some((o) => o.is_closed)) {
    return {
      date,
      is_active: false,
      start_time: DEFAULT_SCHEDULE_START,
      end_time: DEFAULT_SCHEDULE_END,
      slot_minutes: 10,
    };
  }
  const open = hit.find((o) => !o.is_closed && o.start_time && o.end_time);
  if (!open?.start_time || !open.end_time) return null;
  return {
    date,
    is_active: true,
    start_time: open.start_time.slice(0, 5),
    end_time: open.end_time.slice(0, 5),
    slot_minutes: open.slot_minutes ?? 10,
  };
}

export function overridesOverlap(
  a: { start_date: string; end_date: string },
  b: { start_date: string; end_date: string },
): boolean {
  return a.start_date <= b.end_date && a.end_date >= b.start_date;
}

export function mergeOverrides(
  existing: ScheduleOverrideRow[],
  range: { start: string; end: string },
  next: ScheduleOverrideRow[],
): ScheduleOverrideRow[] {
  const kept = existing.filter((o) => !overridesOverlap(o, range));
  return [...kept, ...next];
}

export function weekDayOverrides(
  days: DayHours[],
  note: string,
): ScheduleOverrideRow[] {
  return days.map((day) =>
    day.is_active
      ? {
          scope: "day" as const,
          start_date: day.date,
          end_date: day.date,
          is_closed: false,
          start_time: day.start_time,
          end_time: day.end_time,
          slot_minutes: day.slot_minutes,
          note,
        }
      : {
          scope: "day" as const,
          start_date: day.date,
          end_date: day.date,
          is_closed: true,
        },
  );
}

export function periodOverride(
  scope: "week" | "month" | "year",
  range: { start: string; end: string },
  hours: { start_time: string; end_time: string; slot_minutes: number },
  isClosed: boolean,
  note: string,
): ScheduleOverrideRow {
  return {
    scope: scope === "year" ? "month" : scope,
    start_date: range.start,
    end_date: range.end,
    is_closed: isClosed,
    start_time: isClosed ? null : hours.start_time,
    end_time: isClosed ? null : hours.end_time,
    slot_minutes: isClosed ? null : hours.slot_minutes,
    note,
  };
}

export function datesWithOverrides(
  overrides: ScheduleOverrideRow[],
  year: number,
  month: number,
): Set<string> {
  const set = new Set<string>();
  const { start, end } = monthRange(year, month);
  for (const date of datesBetween(start, end)) {
    const has = overrides.some(
      (o) => o.start_date <= date && o.end_date >= date,
    );
    if (has) set.add(date);
  }
  return set;
}

export function isDateInPast(ymd: string): boolean {
  const today = formatDateYmd(new Date());
  return ymd < today;
}

export function isDateBeyond(ymd: string, maxDays: number): boolean {
  const limit = formatDateYmd(addDays(new Date(), maxDays));
  return ymd > limit;
}

export const BOOKING_HORIZON_DAYS = 90;

export const WEEKDAY_LABELS_EN = ["S", "M", "T", "W", "T", "F", "S"];
/** Saturday → Friday (ar-EG week start). */
export const WEEKDAY_LABELS_AR = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];

export function generateDefaultSlots(): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += DEFAULT_SLOT_MINUTES) {
      slots.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }
  return slots;
}

export const ALL_TIME_SLOTS = generateDefaultSlots();
