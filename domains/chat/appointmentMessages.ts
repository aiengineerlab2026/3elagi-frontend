import type { ChatMessage } from "@/domains/chat/types";

export function appointmentIdFromChatMessage(
  message: ChatMessage,
): string | null {
  return message.appointmentAction?.appointment_id?.trim() || null;
}

/** Remove every appointment_action bubble tied to one appointment id. */
export function withoutAppointmentMessages(
  messages: ChatMessage[],
  appointmentId: string,
): ChatMessage[] {
  return messages.filter(
    (message) => message.appointmentAction?.appointment_id !== appointmentId,
  );
}

/**
 * Drop cached appointment_action rows that the server no longer returns
 * (appointment deleted / not found).
 */
export function dropOrphanedAppointmentMessages(
  cached: ChatMessage[],
  authoritative: ChatMessage[],
): ChatMessage[] {
  const validIds = new Set(
    authoritative
      .map(appointmentIdFromChatMessage)
      .filter((id): id is string => !!id),
  );

  return cached.filter((message) => {
    const apptId = appointmentIdFromChatMessage(message);
    if (!apptId) return true;
    return validIds.has(apptId);
  });
}

export function isAppointmentNotFoundError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("appointment not found");
}
