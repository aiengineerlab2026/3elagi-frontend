import { useChatStore } from "@/domains/chat/store";

/**
 * Post a prescription the doctor just wrote into the patient's chat thread.
 * Without this the prescription only ever landed in the records screen and the
 * patient never saw it in chat.
 */
export async function sharePrescriptionToChat(args: {
  patientUserId: string;
  prescriptionId: string;
  title: string;
  token: string;
  selfId: string;
  selfRole: string | null;
}): Promise<void> {
  await useChatStore.getState().sendMessage(
    args.patientUserId,
    {
      recipientId: args.patientUserId,
      type: "medical_link",
      content: args.title,
      medicalLink: {
        record_type: "prescription",
        record_id: args.prescriptionId,
        title: args.title,
      },
    },
    args.token,
    args.selfId,
    args.selfRole,
  );
}
