import { describe, expect, it } from "vitest";
import {
  dropOrphanedAppointmentMessages,
  withoutAppointmentMessages,
} from "@/domains/chat/appointmentMessages";
import type { ChatMessage } from "@/domains/chat/types";

function appointmentMessage(id: string, appointmentId: string): ChatMessage {
  return {
    id,
    type: "appointment_action",
    text: "Appointment requested",
    senderId: "peer",
    createdAt: "2026-08-30T09:00:00.000Z",
    appointmentAction: {
      appointment_id: appointmentId,
      action: "request",
      date: "2026-08-30",
      time: "09:10:00",
      status: "pending",
    },
  };
}

describe("appointmentMessages", () => {
  it("removes every bubble for a missing appointment id", () => {
    const messages = [
      appointmentMessage("1", "gone"),
      appointmentMessage("2", "gone"),
      appointmentMessage("3", "live"),
    ];
    expect(withoutAppointmentMessages(messages, "gone")).toEqual([
      appointmentMessage("3", "live"),
    ]);
  });

  it("drops cached appointment rows the server no longer returns", () => {
    const cached = [
      appointmentMessage("1", "gone"),
      appointmentMessage("2", "live"),
    ];
    const authoritative = [appointmentMessage("3", "live")];
    expect(dropOrphanedAppointmentMessages(cached, authoritative)).toEqual([
      appointmentMessage("2", "live"),
    ]);
  });
});
