import type { UpcomingAppointment } from "@/domains/appointments/api";

const UPCOMING_VIDEO_STATUSES = new Set([
  "pending",
  "confirmed",
  "waiting",
  "active",
]);

function localTodayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Matches /appointments/video-consultations visibility rules on the client. */
export function filterVideoConsultationsForTab(
  appointments: UpcomingAppointment[],
): UpcomingAppointment[] {
  const today = localTodayYmd();
  return appointments.filter((item) => {
    if (item.status === "cancelled" || item.status === "rejected") return false;
    const payment = item.payment_status ?? "none";
    if (payment === "awaiting_payment" || payment === "proof_submitted") {
      return true;
    }
    return item.date >= today && UPCOMING_VIDEO_STATUSES.has(item.status);
  });
}

function dedupeById(items: UpcomingAppointment[]): UpcomingAppointment[] {
  const seen = new Set<string>();
  const out: UpcomingAppointment[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Merge dedicated video-consultations API rows with /appointments/my fallback. */
export function mergeVideoConsultationLists(
  primary: UpcomingAppointment[],
  fromMyAppointments: UpcomingAppointment[],
): UpcomingAppointment[] {
  return dedupeById([...primary, ...filterVideoConsultationsForTab(fromMyAppointments)]);
}

/** Scheduled video consultations still on the calendar (not cancelled). */
export function countUpcomingVideoCalls(
  appointments: UpcomingAppointment[],
): number {
  return appointments.filter((item) => UPCOMING_VIDEO_STATUSES.has(item.status))
    .length;
}
