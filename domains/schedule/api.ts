import { API_BASE } from "@/constants/api";
import {
  DEFAULT_SCHEDULE_END,
  DEFAULT_SCHEDULE_START,
} from "@/domains/schedule/constants";

export interface DoctorScheduleRow {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
}

export interface ScheduleOverrideRow {
  id?: string;
  scope: "day" | "week" | "month";
  start_date: string;
  end_date: string;
  is_closed: boolean;
  start_time?: string | null;
  end_time?: string | null;
  slot_minutes?: number | null;
  note?: string | null;
}

export interface DoctorSlot {
  time: string;
  taken: boolean;
}

export async function fetchMySchedule(token: string): Promise<DoctorScheduleRow[]> {
  const res = await fetch(`${API_BASE}/schedules/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => [])) as DoctorScheduleRow[];
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to load schedule (${res.status})`,
    );
  }
  return Array.isArray(data) ? data : [];
}

export async function saveMySchedule(
  token: string,
  items: DoctorScheduleRow[],
): Promise<DoctorScheduleRow[]> {
  const res = await fetch(`${API_BASE}/schedules/me`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
  const data = (await res.json().catch(() => [])) as DoctorScheduleRow[];
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to save schedule (${res.status})`,
    );
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchMyScheduleOverrides(
  token: string,
): Promise<ScheduleOverrideRow[]> {
  const res = await fetch(`${API_BASE}/schedules/me/overrides`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => [])) as ScheduleOverrideRow[];
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to load overrides (${res.status})`,
    );
  }
  return Array.isArray(data) ? data : [];
}

export async function saveMyScheduleOverrides(
  token: string,
  items: ScheduleOverrideRow[],
): Promise<ScheduleOverrideRow[]> {
  const res = await fetch(`${API_BASE}/schedules/me/overrides`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });
  const data = (await res.json().catch(() => [])) as ScheduleOverrideRow[];
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to save overrides (${res.status})`,
    );
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchDoctorSlots(
  doctorEntityId: string,
  date: string,
): Promise<DoctorSlot[]> {
  const res = await fetch(
    `${API_BASE}/public/doctors/${doctorEntityId}/slots?date=${encodeURIComponent(date)}`,
  );
  const data = (await res.json().catch(() => [])) as DoctorSlot[];
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message ?? `Failed to load slots (${res.status})`,
    );
  }
  return Array.isArray(data) ? data : [];
}

export function formatDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function nextWeekRange(from = new Date()): { start: string; end: string } {
  const day = from.getDay();
  const daysUntilNextMonday = day === 0 ? 1 : 8 - day;
  const start = addDays(from, daysUntilNextMonday);
  const end = addDays(start, 6);
  return { start: formatDateYmd(start), end: formatDateYmd(end) };
}

export const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LABELS_AR = ["أحد", "إثن", "ثلث", "أرب", "خمي", "جمع", "سبت"];

export function defaultWeekRows(): DoctorScheduleRow[] {
  return Array.from({ length: 7 }, (_, day_of_week) => ({
    day_of_week,
    start_time: DEFAULT_SCHEDULE_START,
    end_time: DEFAULT_SCHEDULE_END,
    slot_minutes: 10,
    is_active: true,
  }));
}

export function mergeScheduleRows(existing: DoctorScheduleRow[]): DoctorScheduleRow[] {
  const base = defaultWeekRows();
  const byDay = new Map(existing.map((row) => [row.day_of_week, row]));
  return base.map((row) => {
    const found = byDay.get(row.day_of_week);
    if (!found) return row;
    return {
      ...row,
      ...found,
      start_time: found.start_time?.slice(0, 5) ?? row.start_time,
      end_time: found.end_time?.slice(0, 5) ?? row.end_time,
    };
  });
}
