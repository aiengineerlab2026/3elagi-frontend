/**
 * useReminderScheduler
 *
 * Exposes a single `scheduleForPrescription` action that components call
 * after a prescription is created or loaded.
 *
 * Only patients get reminders — doctors do not need to be reminded to take
 * medications. This guard lives here so the store stays role-agnostic.
 */
import { useAuthStore } from '@/domains/auth/store'
import { useRemindersStore } from '../store'
import type { MedicalRecord } from '@/domains/medical/types'

export function useReminderScheduler() {
  const role = useAuthStore((s) => s.role)
  const scheduleForPrescription = useRemindersStore((s) => s.scheduleForPrescription)

  const schedule = (prescription: MedicalRecord) => {
    if (role?.toLowerCase() !== 'patient') return
    if (prescription.category !== 'prescription') return
    void scheduleForPrescription(prescription)
  }

  return { schedule }
}
