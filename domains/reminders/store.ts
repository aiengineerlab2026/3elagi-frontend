/**
 * reminders/store.ts
 *
 * Manages scheduled prescription reminders.
 * Scheduling logic lives here — never in a component.
 *
 * Cross-domain wiring (via eventBus):
 *   - Subscribes to medical:prescription_upserted → schedules reminders
 *   - Subscribes to auth:logout → cancels all reminders
 */
import { create } from 'zustand'
import { Platform } from 'react-native'
import { on, emit } from '@/utils/eventBus'
import { MEDICAL_EVENTS } from '@/domains/medical/events'
import { AUTH_EVENTS } from '@/domains/auth/events'
import { REMINDER_EVENTS } from './events'
import {
  initRemindersChannel,
  requestRemindersPermission,
  scheduleMedicationReminder,
  cancelPrescriptionReminders,
  cancelAllReminders,
} from './repository'
import { parseIntervalToHours } from './intervalParser'
import type { MedicationReminder } from './types'
import type { MedicalPrescriptionUpsertedPayload } from '@/domains/medical/events'
import type { MedicalRecord } from '@/domains/medical/types'

interface RemindersState {
  /** All currently scheduled reminders keyed by prescriptionId */
  remindersByPrescription: Record<string, MedicationReminder[]>
  permissionGranted: boolean
  initialised: boolean
  error: string | null

  /** Call once at app startup to request permission and init channel */
  init: () => Promise<void>

  /**
   * Schedule reminders for every medication in a prescription.
   * Cancels any existing reminders for that prescriptionId first.
   */
  scheduleForPrescription: (prescription: MedicalRecord) => Promise<void>

  /** Cancel all reminders for a given prescription */
  cancelForPrescription: (prescriptionId: string) => Promise<void>

  /** Cancel every reminder (called on logout) */
  cancelAll: () => Promise<void>
}

export const useRemindersStore = create<RemindersState>()((set, get) => ({
  remindersByPrescription: {},
  permissionGranted: false,
  initialised: false,
  error: null,

  init: async () => {
    try {
      await initRemindersChannel()
      const granted = await requestRemindersPermission()
      set({ permissionGranted: granted, initialised: true, error: null })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  scheduleForPrescription: async (prescription) => {
    const { permissionGranted, initialised, remindersByPrescription } = get()

    if (!initialised || !permissionGranted) return
    if (prescription.category !== 'prescription') return
    if (!prescription.medications?.length) return

    // Cancel existing reminders for this prescription before rescheduling
    const existing = remindersByPrescription[prescription.id] ?? []
    if (existing.length) {
      await cancelPrescriptionReminders(existing)
    }

    const scheduled: MedicationReminder[] = []

    for (const med of prescription.medications) {
      if (!med.medication_name.trim()) continue

      const { hours: intervalHours } = parseIntervalToHours(med.interval)

      try {
        const notificationId = await scheduleMedicationReminder({
          prescriptionId: prescription.id,
          ownerId: prescription.ownerId,
          medicationName: med.medication_name,
          dose: med.dose ?? '',
          intervalHours,
        })

        scheduled.push({
          notificationId,
          prescriptionId: prescription.id,
          ownerId: prescription.ownerId,
          medicationName: med.medication_name,
          dose: med.dose ?? '',
          intervalHours,
        })
      } catch {
        // Non-fatal: continue scheduling other medications
      }
    }

    set((state) => ({
      remindersByPrescription: {
        ...state.remindersByPrescription,
        [prescription.id]: scheduled,
      },
    }))

    emit(REMINDER_EVENTS.SCHEDULED, {
      prescriptionId: prescription.id,
      count: scheduled.length,
    })
  },

  cancelForPrescription: async (prescriptionId) => {
    const { remindersByPrescription } = get()
    const existing = remindersByPrescription[prescriptionId] ?? []

    if (existing.length) {
      await cancelPrescriptionReminders(existing)
    }

    set((state) => {
      const updated = { ...state.remindersByPrescription }
      delete updated[prescriptionId]
      return { remindersByPrescription: updated }
    })

    emit(REMINDER_EVENTS.CANCELLED, { prescriptionId })
  },

  cancelAll: async () => {
    if (Platform.OS === 'web') {
      set({ remindersByPrescription: {} })
      return
    }

    await cancelAllReminders()
    set({ remindersByPrescription: {} })
  },
}))

// ── Cross-domain subscriptions ────────────────────────────────────────────────

/**
 * When a prescription is upserted in the medical domain, schedule/reschedule
 * its reminders. We receive only the prescriptionId and ownerId from the event;
 * the full MedicalRecord must be looked up from the medical store.
 *
 * To avoid a direct store import we rely on the caller (the component that
 * calls upsertPrescription) to also dispatch scheduleForPrescription, OR we
 * accept the prescription record directly via the event payload.
 *
 * Architecture note: the medical domain event only carries IDs. The full
 * record is fetched by the screen after upsert and passed directly to
 * scheduleForPrescription via the hook useReminderScheduler.
 */
on<MedicalPrescriptionUpsertedPayload>(
  MEDICAL_EVENTS.PRESCRIPTION_UPSERTED,
  (_payload) => {
    // Intentionally left lightweight: the hook useReminderScheduler passes
    // the full MedicalRecord to scheduleForPrescription directly.
    // This subscription exists to allow future expansion (e.g. analytics).
  },
)

on(AUTH_EVENTS.LOGOUT, () => {
  void useRemindersStore.getState().cancelAll()
})
