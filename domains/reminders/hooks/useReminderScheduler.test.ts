/**
 * useReminderScheduler.test.ts
 *
 * Tests the role-guard and delegation logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockScheduleForPrescription = vi.fn()

vi.mock('@/domains/auth/store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../store', () => ({
  useRemindersStore: vi.fn(),
}))

import { useAuthStore } from '@/domains/auth/store'
import { useRemindersStore } from '../store'
import { useReminderScheduler } from './useReminderScheduler'
import type { MedicalRecord } from '@/domains/medical/types'

const mockPrescription: MedicalRecord = {
  id: 'rx-1',
  ownerId: 'user-1',
  category: 'prescription',
  title: 'Test prescription',
  date: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  medications: [{ medication_name: 'TestMed', dose: '500mg', interval: 'twice daily' }],
}

describe('useReminderScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRemindersStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ scheduleForPrescription: mockScheduleForPrescription }),
    )
  })

  it('calls scheduleForPrescription when role is patient', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ role: 'patient' }),
    )
    const { result } = renderHook(() => useReminderScheduler())
    result.current.schedule(mockPrescription)
    expect(mockScheduleForPrescription).toHaveBeenCalledWith(mockPrescription)
  })

  it('calls scheduleForPrescription when role is Patient (case-insensitive)', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ role: 'Patient' }),
    )
    const { result } = renderHook(() => useReminderScheduler())
    result.current.schedule(mockPrescription)
    expect(mockScheduleForPrescription).toHaveBeenCalledWith(mockPrescription)
  })

  it('does NOT schedule when role is doctor', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ role: 'doctor' }),
    )
    const { result } = renderHook(() => useReminderScheduler())
    result.current.schedule(mockPrescription)
    expect(mockScheduleForPrescription).not.toHaveBeenCalled()
  })

  it('does NOT schedule when role is null', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ role: null }),
    )
    const { result } = renderHook(() => useReminderScheduler())
    result.current.schedule(mockPrescription)
    expect(mockScheduleForPrescription).not.toHaveBeenCalled()
  })

  it('does NOT schedule for non-prescription records even when role is patient', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ role: 'patient' }),
    )
    const labRecord: MedicalRecord = { ...mockPrescription, category: 'lab' }
    const { result } = renderHook(() => useReminderScheduler())
    result.current.schedule(labRecord)
    expect(mockScheduleForPrescription).not.toHaveBeenCalled()
  })

  it('returns a schedule function from the hook', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ role: 'patient' }),
    )
    const { result } = renderHook(() => useReminderScheduler())
    expect(typeof result.current.schedule).toBe('function')
  })
})
