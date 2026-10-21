export const APPOINTMENT_EVENTS = {
  REMINDER: "appointment:reminder",
  UPDATED: "appointment:updated",
} as const;

export interface AppointmentReminderPayload {
  appointmentId: string;
  sessionId?: string;
  meetingLink?: string;
  when: string;
  otherParticipantName?: string;
}

export interface AppointmentUpdatedPayload {
  appointmentId?: string;
  peerId?: string;
  actorId?: string;
  actorName?: string;
  action?: "confirm" | "reject" | "cancel";
  date?: string;
  time?: string;
  status?: string;
}
