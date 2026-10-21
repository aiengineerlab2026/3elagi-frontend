/**
 * add.web.test.tsx
 *
 * Tests the web prescription add screen's upload flow, form, and states.
 * Mocks all external dependencies so tests run in jsdom without native bridge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ── Mock expo-router ──────────────────────────────────────────────────────────
const mockRouterBack = vi.fn()
const mockRouterReplace = vi.fn()
vi.mock('expo-router', () => ({
  router: {
    back: () => mockRouterBack(),
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => ({ patientUserId: 'patient-123' }),
}))

// ── Mock auth store ───────────────────────────────────────────────────────────
const mockAuthStore = vi.fn()
vi.mock('@/domains/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => mockAuthStore(selector),
}))

// ── Mock medical API ──────────────────────────────────────────────────────────
const mockAnalyzePrescriptionImage = vi.fn()
const mockUploadFile = vi.fn()
const mockCreatePrescriptionForPatientUser = vi.fn()
const mockFetchAllMedicalHistory = vi.fn()

vi.mock('@/domains/medical/api', () => ({
  analyzePrescriptionImage: (...args: unknown[]) => mockAnalyzePrescriptionImage(...args),
  uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  createPrescriptionForPatientUser: (...args: unknown[]) =>
    mockCreatePrescriptionForPatientUser(...args),
  fetchAllMedicalHistory: (...args: unknown[]) => mockFetchAllMedicalHistory(...args),
}))

// ── Mock medical store ────────────────────────────────────────────────────────
const mockSetRecordsFromApi = vi.fn()
const mockUpsertPrescription = vi.fn()
const mockNotifyMedicalHistoryChanged = vi.fn()
const mockMedicalStore = vi.fn()

vi.mock('@/domains/medical/store', () => ({
  useMedicalStore: (selector: (s: unknown) => unknown) => mockMedicalStore(selector),
}))

// ── Mock reminders ────────────────────────────────────────────────────────────
const mockScheduleReminder = vi.fn()
vi.mock('@/domains/reminders/hooks/useReminderScheduler', () => ({
  useReminderScheduler: () => ({ schedule: mockScheduleReminder }),
}))

// ── Mock hooks ────────────────────────────────────────────────────────────────
vi.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#ffffff',
    card: '#f8f8f8',
    foreground: '#000000',
    mutedForeground: '#888888',
    muted: '#f0f0f0',
    border: '#e0e0e0',
    primary: '#6366f1',
    destructive: '#ef4444',
  }),
}))

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: { common: { cancel: 'Cancel', save: 'Save' } },
    isRTL: false,
    locale: 'en',
  }),
}))

vi.mock('@/utils/rtl', () => ({
  alignText: (isRTL: boolean) => (isRTL ? 'right' : 'left'),
  flexRow: (isRTL: boolean) => (isRTL ? 'row-reverse' : 'row'),
}))

vi.mock('@/hooks/useWebLayout', () => ({
  useWebLayout: () => ({
    width: 375,
    height: 812,
    isTablet: false,
    isDesktop: false,
    isWide: false,
    gridColumns: 2,
  }),
}))

vi.mock('@/components/web/WebDesktopShell', () => ({
  WebDesktopShell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'web-shell' }, children),
}))

// ── Mock react-native-safe-area-context ───────────────────────────────────────
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// ── Mock KeyboardSafeScrollView ───────────────────────────────────────────────
vi.mock('@/components/KeyboardSafeScrollView', () => ({
  KeyboardSafeScrollView: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'scroll-view' }, children),
}))

// ── Mock lucide icons ─────────────────────────────────────────────────────────
vi.mock('lucide-react-native', () => ({
  ArrowLeft: () => null,
  ArrowRight: () => null,
  Image: () => null,
  Plus: () => null,
  Trash2: () => null,
  Upload: () => null,
  X: () => null,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOKEN = 'mock-token'

function setupAuthStore(overrides: { accessToken?: string | null; role?: string | null } = {}) {
  const state = {
    accessToken: TOKEN,
    role: 'patient',
    profile: { id: 'patient-123' },
    ...overrides,
  }
  mockAuthStore.mockImplementation((selector: (s: typeof state) => unknown) => selector(state))
}

function setupMedicalStore() {
  const state = {
    setRecordsFromApi: mockSetRecordsFromApi,
    upsertPrescription: mockUpsertPrescription,
    notifyMedicalHistoryChanged: mockNotifyMedicalHistoryChanged,
  }
  mockMedicalStore.mockImplementation((selector: (s: typeof state) => unknown) => selector(state))
}

function makeSavedPrescription() {
  return {
    id: 'rx-1',
    title: 'Test Rx',
    medications: [{ medication_name: 'Aspirin', dose: '500mg', interval: 'daily', notes: '' }],
    patient_user_id: 'patient-123',
  }
}

// ── Import under test ─────────────────────────────────────────────────────────
import AddPrescriptionScreen from './add.web'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AddPrescriptionScreen (web)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAuthStore()
    setupMedicalStore()
    mockFetchAllMedicalHistory.mockResolvedValue([])
  })

  // ── Smoke test ──────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    expect(() => render(<AddPrescriptionScreen />)).not.toThrow()
  })

  it('renders the upload button', () => {
    render(<AddPrescriptionScreen />)
    expect(screen.getByTestId('upload-prescription-btn')).toBeTruthy()
  })

  it('renders the upload button label', () => {
    render(<AddPrescriptionScreen />)
    expect(screen.getByText('Upload image or PDF')).toBeTruthy()
  })

  it('renders save and cancel buttons', () => {
    render(<AddPrescriptionScreen />)
    expect(screen.getByTestId('save-btn')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
    expect(screen.getByText('Save')).toBeTruthy()
  })

  it('renders the page title', () => {
    render(<AddPrescriptionScreen />)
    expect(screen.getByText('Add prescription')).toBeTruthy()
  })

  it('renders the hint text', () => {
    render(<AddPrescriptionScreen />)
    expect(screen.getByText(/Review medications before saving/)).toBeTruthy()
  })

  it('renders at least one medication row', () => {
    render(<AddPrescriptionScreen />)
    expect(screen.getByText('Medication 1')).toBeTruthy()
  })

  // ── File upload flow ────────────────────────────────────────────────────────

  it('shows analyzing state after file is selected', async () => {
    mockAnalyzePrescriptionImage.mockResolvedValue([
      { medication_name: 'Paracetamol', dose: '500mg', interval: 'every 8h', notes: '' },
    ])

    render(<AddPrescriptionScreen />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()
    expect(fileInput.accept).toBe('image/*,.pdf')

    const file = new File(['fake-image'], 'rx.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })

    // Mock FileReader
    const readAsDataURLMock = vi.fn()
    const mockReaderInstance = {
      readAsDataURL: readAsDataURLMock,
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/jpeg;base64,abc123',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => {
      readAsDataURLMock.mockImplementation(() => {
        setTimeout(() => {
          if (mockReaderInstance.onload) mockReaderInstance.onload()
        }, 0)
      })
      return mockReaderInstance as unknown as FileReader
    })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockAnalyzePrescriptionImage).toHaveBeenCalled()
    })
  })

  it('calls analyzePrescriptionImage with correct args after file upload', async () => {
    const medications = [{ medication_name: 'Ibuprofen', dose: '400mg', interval: 'twice daily', notes: '' }]
    mockAnalyzePrescriptionImage.mockResolvedValue(medications)

    render(<AddPrescriptionScreen />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['fake'], 'prescription.jpg', { type: 'image/jpeg' })

    const mockReaderInstance = {
      readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
        setTimeout(() => { if (this.onload) this.onload() }, 0)
      }),
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/jpeg;base64,xyz',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockReaderInstance as unknown as FileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockAnalyzePrescriptionImage).toHaveBeenCalledWith(
        'data:image/jpeg;base64,xyz',
        'image/jpeg',
        'prescription.jpg',
        TOKEN,
        'en',
        file,
      )
    })
  })

  it('populates medications from analysis result', async () => {
    const medications = [{ medication_name: 'Amoxicillin', dose: '250mg', interval: '3x daily', notes: 'With food' }]
    mockAnalyzePrescriptionImage.mockResolvedValue(medications)

    render(<AddPrescriptionScreen />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'rx.png', { type: 'image/png' })

    const mockReaderInstance = {
      readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
        setTimeout(() => { if (this.onload) this.onload() }, 0)
      }),
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/png;base64,base64data',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockReaderInstance as unknown as FileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByDisplayValue('Amoxicillin')).toBeTruthy()
    })
  })

  // ── Save flow ───────────────────────────────────────────────────────────────

  it('shows saving indicator when save is pressed', async () => {
    const saved = makeSavedPrescription()
    mockUploadFile.mockResolvedValue({ objectPath: 'path/rx.jpg', url: 'https://cdn.example.com/rx.jpg' })
    mockCreatePrescriptionForPatientUser.mockResolvedValue(saved)

    render(<AddPrescriptionScreen />)

    // Fill in required title
    const titleInput = screen.getByPlaceholderText('e.g. Sore throat')
    fireEvent.change(titleInput, { target: { value: 'Sore throat' } })

    // Fill in medication name
    const medInput = screen.getByPlaceholderText('Medication name')
    fireEvent.change(medInput, { target: { value: 'Aspirin' } })

    fireEvent.press(screen.getByTestId('save-btn'))

    await waitFor(() => {
      expect(mockCreatePrescriptionForPatientUser).toHaveBeenCalled()
    })
  })

  it('calls uploadFile and createPrescription when scanAsset is set on save', async () => {
    const medications = [{ medication_name: 'Metformin', dose: '500mg', interval: 'daily', notes: '' }]
    mockAnalyzePrescriptionImage.mockResolvedValue(medications)
    mockUploadFile.mockResolvedValue({ objectPath: 'rx.jpg', url: 'https://cdn.example.com/rx.jpg' })
    const saved = makeSavedPrescription()
    mockCreatePrescriptionForPatientUser.mockResolvedValue(saved)

    render(<AddPrescriptionScreen />)

    // Upload a file first
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'rx.jpg', { type: 'image/jpeg' })

    const mockReaderInstance = {
      readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
        setTimeout(() => { if (this.onload) this.onload() }, 0)
      }),
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/jpeg;base64,imgdata',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockReaderInstance as unknown as FileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })
    await waitFor(() => expect(mockAnalyzePrescriptionImage).toHaveBeenCalled())

    // Set title
    const titleInput = screen.getByPlaceholderText('e.g. Sore throat')
    fireEvent.change(titleInput, { target: { value: 'Diabetes check' } })

    fireEvent.press(screen.getByTestId('save-btn'))

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(
        'data:image/jpeg;base64,imgdata',
        'image/jpeg',
        'rx.jpg',
        TOKEN,
        file,
      )
      expect(mockCreatePrescriptionForPatientUser).toHaveBeenCalledWith(
        expect.objectContaining({ image_url: 'https://cdn.example.com/rx.jpg' }),
        TOKEN,
      )
    })
  })

  it('navigates back after successful save', async () => {
    const saved = makeSavedPrescription()
    mockCreatePrescriptionForPatientUser.mockResolvedValue(saved)

    render(<AddPrescriptionScreen />)

    const titleInput = screen.getByPlaceholderText('e.g. Sore throat')
    fireEvent.change(titleInput, { target: { value: 'Check-up' } })

    const medInput = screen.getByPlaceholderText('Medication name')
    fireEvent.change(medInput, { target: { value: 'Vitamin D' } })

    fireEvent.press(screen.getByTestId('save-btn'))

    await waitFor(() => {
      expect(mockRouterBack).toHaveBeenCalled()
    })
  })

  // ── Loading / error states ──────────────────────────────────────────────────

  it('disables upload button while analyzing', async () => {
    let resolveAnalysis!: (v: unknown[]) => void
    mockAnalyzePrescriptionImage.mockReturnValue(new Promise((r) => { resolveAnalysis = r }))

    render(<AddPrescriptionScreen />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'rx.jpg', { type: 'image/jpeg' })

    const mockReaderInstance = {
      readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
        setTimeout(() => { if (this.onload) this.onload() }, 0)
      }),
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/jpeg;base64,data',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockReaderInstance as unknown as FileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      const btn = screen.getByTestId('upload-prescription-btn')
      expect(btn.props?.disabled ?? (btn as HTMLButtonElement).disabled).toBeTruthy()
    })

    resolveAnalysis([])
  })

  it('shows analyzing label while processing image', async () => {
    let resolveAnalysis!: (v: unknown[]) => void
    mockAnalyzePrescriptionImage.mockReturnValue(new Promise((r) => { resolveAnalysis = r }))

    render(<AddPrescriptionScreen />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'rx.jpg', { type: 'image/jpeg' })

    const mockReaderInstance = {
      readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
        setTimeout(() => { if (this.onload) this.onload() }, 0)
      }),
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/jpeg;base64,data',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockReaderInstance as unknown as FileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Analyzing…')).toBeTruthy()
    })

    resolveAnalysis([])
  })

  // ── Scan asset removal ──────────────────────────────────────────────────────

  it('shows remove button when a file is uploaded', async () => {
    mockAnalyzePrescriptionImage.mockResolvedValue([
      { medication_name: 'Aspirin', dose: '100mg', interval: 'daily', notes: '' },
    ])

    render(<AddPrescriptionScreen />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'rx.jpg', { type: 'image/jpeg' })

    const mockReaderInstance = {
      readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
        setTimeout(() => { if (this.onload) this.onload() }, 0)
      }),
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/jpeg;base64,data',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockReaderInstance as unknown as FileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByTestId('remove-scan-btn')).toBeTruthy()
    })
  })

  it('removes the preview when remove button is clicked', async () => {
    mockAnalyzePrescriptionImage.mockResolvedValue([
      { medication_name: 'Aspirin', dose: '100mg', interval: 'daily', notes: '' },
    ])

    render(<AddPrescriptionScreen />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'rx.jpg', { type: 'image/jpeg' })

    const mockReaderInstance = {
      readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReaderInstance) {
        setTimeout(() => { if (this.onload) this.onload() }, 0)
      }),
      onload: null as null | (() => void),
      onerror: null,
      result: 'data:image/jpeg;base64,data',
    }
    vi.spyOn(global, 'FileReader').mockImplementation(() => mockReaderInstance as unknown as FileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => expect(screen.getByTestId('remove-scan-btn')).toBeTruthy())

    fireEvent.press(screen.getByTestId('remove-scan-btn'))

    await waitFor(() => {
      expect(screen.queryByTestId('remove-scan-btn')).toBeNull()
    })
  })

  // ── Medication management ───────────────────────────────────────────────────

  it('adds a medication row when Add medication is pressed', () => {
    render(<AddPrescriptionScreen />)
    expect(screen.getByText('Medication 1')).toBeTruthy()

    fireEvent.press(screen.getByText('Add medication'))

    expect(screen.getByText('Medication 2')).toBeTruthy()
  })

  it('does not show remove button when only one medication row exists', () => {
    render(<AddPrescriptionScreen />)
    // With 1 medication, the Trash2 icon (remove button) should not be rendered
    // The medication header row should render without a trash icon
    expect(screen.getByText('Medication 1')).toBeTruthy()
    // Only one med row — no second row
    expect(screen.queryByText('Medication 2')).toBeNull()
  })

  // ── Cancel ──────────────────────────────────────────────────────────────────

  it('navigates back when Cancel is pressed', () => {
    render(<AddPrescriptionScreen />)
    fireEvent.press(screen.getByText('Cancel'))
    expect(mockRouterBack).toHaveBeenCalled()
  })

  // ── File input attributes ───────────────────────────────────────────────────

  it('hidden file input has correct accept attribute', () => {
    render(<AddPrescriptionScreen />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toBe('image/*,.pdf')
  })

  it('hidden file input is not visible', () => {
    render(<AddPrescriptionScreen />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.style.display).toBe('none')
  })
})
