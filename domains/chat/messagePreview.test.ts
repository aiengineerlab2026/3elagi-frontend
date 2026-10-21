import { describe, expect, it } from "vitest";
import { messagePreviewText } from "./messagePreview";
import type { ChatMessage, ConsultationActionType } from "./types";

const msg = (action: ConsultationActionType): ChatMessage =>
  ({
    id: action,
    type: "consultation_action",
    text: "",
    consultationAction: { action, consultation_id: "c1" },
  }) as unknown as ChatMessage;

describe("messagePreviewText", () => {
  // The bug: accept/reject hit the fallback and read as "Consultation cancelled".
  it("labels each consultation action distinctly", () => {
    const seen = (["start", "accept", "reject", "end", "cancel"] as const).map(
      (a) => messagePreviewText(msg(a), false),
    );
    expect(seen).toEqual([
      "Consultation started",
      "Consultation accepted",
      "Consultation request declined",
      "Consultation ended",
      "Consultation cancelled",
    ]);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("shows a pending request as awaiting the doctor", () => {
    const m = msg("start");
    m.consultationAction!.status = "pending";
    expect(messagePreviewText(m, false)).toBe(
      "Consultation request — awaiting the doctor",
    );
  });
});
