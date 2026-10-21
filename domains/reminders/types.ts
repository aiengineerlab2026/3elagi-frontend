/** A scheduled local notification for a single medication. */
export interface MedicationReminder {
  notificationId: string
  prescriptionId: string
  ownerId: string
  medicationName: string
  dose: string
  intervalHours: number
}

/** Parsed result of interpreting a free-text interval string. */
export interface ParsedInterval {
  hours: number
  /** Human-readable label derived from the original text */
  label: string
}
