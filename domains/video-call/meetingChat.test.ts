import { describe, expect, it } from "vitest";
import {
  buildDirectMeetingSession,
  resolveMeetingChatPeerId,
} from "@/domains/video-call/meetingChat";

describe("meetingChat", () => {
  it("resolves peer from peerUserId param for direct joins", () => {
    expect(
      resolveMeetingChatPeerId({
        isDoctor: false,
        session: buildDirectMeetingSession({
          meetingUrl: "https://room.test",
          durationMinutes: 30,
          isDoctor: false,
          selfUserId: "patient-1",
          peerUserId: "doctor-9",
        }),
        peerUserIdParam: "doctor-9",
      }),
    ).toBe("doctor-9");
  });

  it("builds direct session ids from role + peer", () => {
    const session = buildDirectMeetingSession({
      meetingUrl: "https://room.test",
      durationMinutes: 30,
      isDoctor: true,
      selfUserId: "doctor-1",
      selfName: "Dr. Ali",
      peerUserId: "patient-2",
      peerName: "Sara",
    });
    expect(session.patientUserId).toBe("patient-2");
    expect(session.doctorUserId).toBe("doctor-1");
    expect(session.patientName).toBe("Sara");
    expect(session.doctorName).toBe("Dr. Ali");
  });
});
