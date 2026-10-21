export const INTAKE_EXAM_EVENTS = {
  REMINDER: "intake-exam:reminder",
} as const;

export interface IntakeExamReminderPayload {
  instanceId: string;
  examName: string;
  doctorName: string;
  deadlineAt: string;
  title: string;
  body: string;
}
