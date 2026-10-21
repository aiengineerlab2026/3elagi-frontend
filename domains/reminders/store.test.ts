/**
 * store.test.ts — reminders domain store
 *
 * Mocks expo-notifications and the repository to test scheduling logic
 * in isolation (no native bridge required).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock expo-notifications (native module) ──────────────────────────────────
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
  requestPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: vi.fn().mockResolvedValue('mock-notif-id'),
  cancelScheduledNotificationAsync: vi.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 'HIGH' },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}))

// ── Mock auth and medical eventBus subscriptions to prevent side-effects ─────
vi.mock('@/utils/eventBus', () => ({
  emit: vi.fn(),
  on: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/domains/auth/events', () => ({
  AUTH_EVENTS: { LOGOUT: 'auth:logout', LOGIN: 'auth:login' },
}))

vi.mock('@/domains/medical/events', () => ({
  MEDICAL_EVENTS: {
    CLEARED: 'medical:cleared',
    PRESCRIPTION_UPSERTED: 'medical:prescription_upserted',
  },
}))

import { useRemindersStore } from './store'
import type { MedicalRecord } from '@/domains/medical/types'

const mockPrescription: MedicalRecord = {
  id: 'rx-001',
  ownerId: 'user-001',
  category: 'prescription',
  title: 'Sore throat treatment',
  date: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  medications: [
    { medication_name: 'Amoxicillin', dose: '500mg', interval: 'every 8 hours' },
    { medication_name: 'Ibuprofen', dose: '400mg', interval: 'twice daily' },
  ],
}

describe('useRemindersStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useRemindersStore.setState({
      remindersByPrescription: {},
      permissionGranted: false,
      initialised: false,
      error: null,
    })
  })

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts with empty state', () => {
    const state = useRemindersStore.getState()
    expect(state.remindersByPrescription).toEqual({})
    expect(state.permissionGranted).toBe(false)
    expect(state.initialised).toBe(false)
    expect(state.error).toBeNull()
  })

  // ── init ──────────────────────────────────────────────────────────────────

  it('sets initialised=true and permissionGranted=true after successful init', async () => {
    await useRemindersStore.getState().init()
    const state = useRemindersStore.getState()
    expect(state.initialised).toBe(true)
    expect(state.permissionGranted).toBe(true)
    expect(state.error).toBeNull()
  })

  it('sets error when init throws', async () => {
    const { initRemindersChannel } = await import('./repository')
    vi.mocked(initRemindersChannel).mockRejectedValueOnce(new Error('Permission denied'))
    await useRemindersStore.getState().init()
    expect(useRemindersStore.getState().error).toBe('Permission denied')
  })

  // ── scheduleForPrescription ───────────────────────────────────────────────

  it('does not schedule when not initialised', async () => {
    await useRemindersStore.getState().scheduleForPrescription(mockPrescription)
    const state = useRemindersStore.getState()
    expect(state.remindersByPrescription['rx-001']).toBeUndefined()
  })

  it('does not schedule when permission is not granted', async () => {
    useRemindersStore.setState({ initialised: true, permissionGranted: false })
    await useRemindersStore.getState().scheduleForPrescription(mockPrescription)
    expect(useRemindersStore.getState().remindersByPrescription['rx-001']).toBeUndefined()
  })

  it('schedules reminders for each medication after init', async () => {
    useRemindersStore.setState({ initialised: true, permissionGranted: true })
    await useRemindersStore.getState().scheduleForPrescription(mockPrescription)
    const reminders = useRemindersStore.getState().remindersByPrescription['rx-001']
    expect(reminders).toHaveLength(2)
    expect(reminders[0].medicationName).toBe('Amoxicillin')
    expect(reminders[1].medicationName).toBe('Ibuprofen')
  })

  it('stores the notification ID returned by repository', async () => {
    useRemindersStore.setState({ initialised: true, permissionGranted: true })
    await useRemindersStore.getState().scheduleForPrescription(mockPrescription)
    const reminders = useRemindersStore.getState().remindersByPrescription['rx-001']
    expect(reminders[0].notificationId).toBe('mock-notif-id')
  })

  it('stores correct intervalHours derived from interval text', async () => {
    useRemindersStore.setState({ initialised: true, permissionGranted: true })
    await useRemindersStore.getState().scheduleForPrescription(mockPrescription)
    const reminders = useRemindersStore.getState().remindersByPrescription['rx-001']
    expect(reminders[0].intervalHours).toBe(8)   // "every 8 hours"
    expect(reminders[1].intervalHours).toBe(12)  // "twice daily"
  })

  it('skips medications with empty name', async () => {
    useRemindersStore.setState({ initialised: true, permissionGranted: true })
    const prescription: MedicalRecord = {
      ...mockPrescription,
      id: 'rx-002',
      medications: [
        { medication_name: '', dose: '500mg', interval: 'twice daily' },
        { medication_name: 'Paracetamol', dose: '1g', interval: 'every 8 hours' },
      ],
    }
    await useRemindersStore.getState().scheduleForPrescription(prescription)
    const reminders = useRemindersStore.getState().remindersByPrescription['rx-002']
    expect(reminders).toHaveLength(1)
    expect(reminders[0].medicationName).toBe('Paracetamol')
  })

  it('does not schedule for non-prescription records', async () => {
    useRemindersStore.setState({ initialised: true, permissionGranted: true })
    const labRecord: MedicalRecord = {
      ...mockPrescription,
      id: 'lab-001',
      category: 'lab',
    }
    await useRemindersStore.getState().scheduleForPrescription(labRecord)
    expect(useRemindersStore.getState().remindersByPrescription['lab-001']).toBeUndefined()
  })

  it('does not schedule when medications array is empty', async () => {
    useRemindersStore.setState({ initialised: true, permissionGranted: true })
    const emptyRx: MedicalRecord = { ...mockPrescription, id: 'rx-003', medications: [] }
    await useRemindersStore.getState().scheduleForPrescription(emptyRx)
    expect(useRemindersStore.getState().remindersByPrescription['rx-003']).toBeUndefined()
  })

  // ── cancelForPrescription ─────────────────────────────────────────────────

  it('removes prescription from store after cancel', async () => {
    useRemindersStore.setState({
      initialised: true,
      permissionGranted: true,
      remindersByPrescription: {
        'rx-001': [
          {
            notificationId: 'n-1',
            prescriptionId: 'rx-001',
            ownerId: 'user-001',
            medicationName: 'Amoxicillin',
            dose: '500mg',
            intervalHours: 8,
          },
        ],
      },
    })
    await useRemindersStore.getState().cancelForPrescription('rx-001')
    expect(useRemindersStore.getState().remindersByPrescription['rx-001']).toBeUndefined()
  })

  // ── cancelAll ─────────────────────────────────────────────────────────────

  it('clears all reminders on cancelAll', async () => {
    useRemindersStore.setState({
      remindersByPrescription: {
        'rx-001': [
          {
            notificationId: 'n-1',
            prescriptionId: 'rx-001',
            ownerId: 'u-1',
            medicationName: 'Med A',
            dose: '500mg',
            intervalHours: 8,
          },
        ],
      },
    })
    await useRemindersStore.getState().cancelAll()
    expect(useRemindersStore.getState().remindersByPrescription).toEqual({})
  })
})
