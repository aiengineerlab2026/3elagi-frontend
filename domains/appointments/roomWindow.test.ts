import { describe, expect, it } from "vitest";
import { appointmentRoomState, isAppointmentStartInFuture } from "./roomWindow";

const DATE = "2026-08-16";

describe("appointmentRoomState", () => {
  it("stays shut before the slot and opens on the minute", () => {
    expect(appointmentRoomState(DATE, "14:00", 30, new Date(2026, 7, 16, 13, 59))).toBe("early");
    expect(appointmentRoomState(DATE, "14:00", 30, new Date(2026, 7, 16, 14, 0))).toBe("open");
  });

  it("stays open for the booked length, then closes", () => {
    expect(appointmentRoomState(DATE, "14:00", 30, new Date(2026, 7, 16, 14, 30))).toBe("open");
    expect(appointmentRoomState(DATE, "14:00", 30, new Date(2026, 7, 16, 14, 31))).toBe("over");
    // A 60-minute booking keeps the room live twice as long.
    expect(appointmentRoomState(DATE, "14:00", 60, new Date(2026, 7, 16, 14, 59))).toBe("open");
  });

  it("falls back to 30 minutes and flags unscheduled slots", () => {
    expect(appointmentRoomState(DATE, "14:00", undefined, new Date(2026, 7, 16, 14, 29))).toBe("open");
    expect(appointmentRoomState(DATE, "14:00", undefined, new Date(2026, 7, 16, 14, 31))).toBe("over");
    expect(appointmentRoomState(DATE, null, 30)).toBe("unscheduled");
  });
});

describe("isAppointmentStartInFuture", () => {
  it("is true before start and false once the slot begins", () => {
    expect(isAppointmentStartInFuture(DATE, "14:00", new Date(2026, 7, 16, 13, 59))).toBe(true);
    expect(isAppointmentStartInFuture(DATE, "14:00", new Date(2026, 7, 16, 14, 0))).toBe(false);
  });
});
