export const REMINDER_EVENTS = {
  SCHEDULED: 'reminders:scheduled',
  CANCELLED: 'reminders:cancelled',
} as const

export interface ReminderScheduledPayload {
  prescriptionId: string
  count: number
}

export interface ReminderCancelledPayload {
  prescriptionId: string
}
