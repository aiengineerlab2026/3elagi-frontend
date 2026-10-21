import { describe, expect, it } from "vitest";
import { formatVideoParticipantName } from "@/domains/video-call/participantNames";

describe("formatVideoParticipantName", () => {
  it("prefixes patient and doctor names", () => {
    expect(
      formatVideoParticipantName({
        role: "patient",
        name: "Sara",
        roleLabel: "Patient",
      }),
    ).toBe("Patient Sara");
    expect(
      formatVideoParticipantName({
        role: "doctor",
        name: "Ahmed",
        roleLabel: "Doctor",
      }),
    ).toBe("Doctor Ahmed");
  });

  it("does not double-prefix", () => {
    expect(
      formatVideoParticipantName({
        role: "patient",
        name: "Patient Sara",
        roleLabel: "Patient",
      }),
    ).toBe("Patient Sara");
  });

  it("shows the role alone when the name is missing or is the role word", () => {
    // Regression: an empty name used to render as "Doctor Doctor".
    expect(
      formatVideoParticipantName({ role: "doctor", name: "", roleLabel: "Doctor" }),
    ).toBe("Doctor");
    expect(
      formatVideoParticipantName({ role: "doctor", name: "doctor", roleLabel: "Doctor" }),
    ).toBe("Doctor");
  });
});
