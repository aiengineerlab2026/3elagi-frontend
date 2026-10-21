import { describe, expect, it, vi } from "vitest";

const sendMessage = vi.fn();
vi.mock("@/domains/chat/store", () => ({
  useChatStore: { getState: () => ({ sendMessage }) },
}));

const { sharePrescriptionToChat } = await import("./sharePrescriptionToChat");

describe("sharePrescriptionToChat", () => {
  it("sends a medical_link the API will accept", async () => {
    await sharePrescriptionToChat({
      patientUserId: "patient-1",
      prescriptionId: "rx-9",
      title: "Amoxicillin course",
      token: "tok",
      selfId: "doctor-1",
      selfRole: "doctor",
    });

    const [peerId, input, token, selfId, selfRole] = sendMessage.mock.calls[0];
    expect(peerId).toBe("patient-1");
    expect(token).toBe("tok");
    expect(selfId).toBe("doctor-1");
    expect(selfRole).toBe("doctor");
    expect(input).toEqual({
      recipientId: "patient-1",
      type: "medical_link",
      content: "Amoxicillin course",
      medicalLink: {
        // The API rejects any record_type outside its allowed list — this is
        // why prescriptions never showed up in chat before.
        record_type: "prescription",
        record_id: "rx-9",
        title: "Amoxicillin course",
      },
    });
  });
});
