/** Default consultation length when the doctor has not configured one. */
export const DEFAULT_APPOINTMENT_MINUTES = 30;

export type AppointmentRoomState = "early" | "open" | "over" | "unscheduled";

/**
 * A booked room is only live between its start time and the end of the slot,
 * so nobody joins a day early or wanders back in hours later.
 */
export function appointmentRoomState(
  date: string,
  time: string | null,
  durationMinutes: number | undefined,
  now: Date = new Date(),
): AppointmentRoomState {
  const startsAt = appointmentStart(date, time);
  if (!startsAt) return "unscheduled";
  const minutes = durationMinutes && durationMinutes > 0
    ? durationMinutes
    : DEFAULT_APPOINTMENT_MINUTES;
  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
  if (now < startsAt) return "early";
  if (now > endsAt) return "over";
  return "open";
}

/** True while the scheduled start is still in the future (reschedule allowed). */
export function isAppointmentStartInFuture(
  date: string,
  time: string | null,
  now: Date = new Date(),
): boolean {
  const startsAt = appointmentStart(date, time);
  if (!startsAt) return false;
  return startsAt.getTime() > now.getTime();
}

/** `date` is YYYY-MM-DD and `time` HH:mm (24h); null time means unscheduled. */
export function appointmentStart(date: string, time: string | null): Date | null {
  if (!date || !time) return null;
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const [year, month, day] = date.split("-").map((part) => Number(part));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
