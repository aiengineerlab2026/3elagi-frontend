import { describe, expect, it } from "vitest";
import {
  countUpcomingVideoCalls,
  filterVideoConsultationsForTab,
  mergeVideoConsultationLists,
} from "@/domains/appointments/upcomingVideoCalls";
import type { UpcomingAppointment } from "@/domains/appointments/api";

function appt(
  status: string,
  overrides: Partial<UpcomingAppointment> = {},
): UpcomingAppointment {
  return {
    id: "1",
    date: "2026-08-20",
    time: "10:00",
    status,
    meeting_link: "https://example.com/room",
    other_name: "Dr. Test",
    other_user_id: "user-1",
    booked_via_app: true,
    ...overrides,
  };
}

describe("countUpcomingVideoCalls", () => {
  it("counts scheduled video appointments and ignores cancelled", () => {
    expect(
      countUpcomingVideoCalls([
        appt("confirmed"),
        appt("pending"),
        appt("waiting"),
        appt("cancelled"),
      ]),
    ).toBe(3);
  });
});

describe("filterVideoConsultationsForTab", () => {
  it("keeps payment-pending visits even when the slot date passed", () => {
    expect(
      filterVideoConsultationsForTab([
        appt("pending", {
          id: "pay",
          date: "2020-01-01",
          payment_status: "awaiting_payment",
        }),
      ]),
    ).toHaveLength(1);
  });

  it("drops cancelled visits", () => {
    expect(
      filterVideoConsultationsForTab([appt("cancelled", { id: "x" })]),
    ).toHaveLength(0);
  });
});

describe("mergeVideoConsultationLists", () => {
  it("dedupes by id and prefers the dedicated list", () => {
    const merged = mergeVideoConsultationLists(
      [appt("pending", { id: "a", other_name: "Primary" })],
      [appt("pending", { id: "a", other_name: "Fallback" })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.other_name).toBe("Primary");
  });
});
