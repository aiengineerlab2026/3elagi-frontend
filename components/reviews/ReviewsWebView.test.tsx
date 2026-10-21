/**
 * ReviewsWebView.test.tsx
 *
 * Tests the ReviewsWebView component's rendering and interaction logic.
 * Mocks all external dependencies (hooks, API) so tests run without a native bridge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ── Mock @react-navigation/native ─────────────────────────────────────────────
vi.mock('@react-navigation/native', () => ({
  useFocusEffect: vi.fn((cb: () => void) => { cb(); }),
}))

// ── Mock expo-router ──────────────────────────────────────────────────────────
vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => null,
}))

// ── Mock auth store ───────────────────────────────────────────────────────────
const mockAuthStore = vi.fn()
vi.mock('@/domains/auth/store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => mockAuthStore(selector),
}))

// ── Mock doctor API ───────────────────────────────────────────────────────────
const mockFetchMyReviews = vi.fn()
vi.mock('@/domains/doctor/api', () => ({
  fetchMyReviews: (...args: unknown[]) => mockFetchMyReviews(...args),
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
  }),
}))

vi.mock('@/hooks/useI18n', () => ({
  useI18n: () => ({
    t: {
      reviews: {
        title: 'My Reviews',
        empty: 'No reviews yet',
        emptyHint: 'Patient reviews will appear here once submitted.',
        loadMore: 'Load more',
        errorRetry: 'Retry',
      },
    },
    isRTL: false,
  }),
}))

vi.mock('@/hooks/useWebLayout', () => ({
  useWebLayout: () => ({ isDesktop: true, isTablet: false, isWide: false }),
}))

vi.mock('@/utils/rtl', () => ({
  alignText: (isRTL: boolean) => (isRTL ? 'right' : 'left'),
  flexRow: (isRTL: boolean) => (isRTL ? 'row-reverse' : 'row'),
  localeTag: (isRTL: boolean) => (isRTL ? 'ar-EG' : 'en-US'),
}))

// ── Mock lucide icons ─────────────────────────────────────────────────────────
vi.mock('lucide-react-native', () => ({
  Star: () => null,
  RefreshCw: () => null,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOKEN = 'mock-token'

function setupAuthStore(overrides: { accessToken?: string | null; role?: string | null } = {}) {
  const state = {
    accessToken: TOKEN,
    role: 'doctor',
    ...overrides,
  }
  mockAuthStore.mockImplementation((selector: (s: typeof state) => unknown) =>
    selector(state),
  )
}

const makeReviews = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `review-${i + 1}`,
    patientName: `Patient ${i + 1}`,
    rating: (i % 5) + 1,
    comment: `Comment ${i + 1}`,
    createdAt: '2024-01-15T10:00:00Z',
  }))

const makePagination = (page: number, totalPages: number, total: number) => ({
  page,
  limit: 10,
  total,
  totalPages,
})

// ── Import under test ─────────────────────────────────────────────────────────
import { ReviewsWebView } from './ReviewsWebView'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReviewsWebView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Smoke test ──────────────────────────────────────────────────────────────

  it('renders without crashing', () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: [],
      pagination: makePagination(1, 1, 0),
    })
    expect(() => render(<ReviewsWebView />)).not.toThrow()
  })

  // ── Doctor-only guard ───────────────────────────────────────────────────────

  it('shows "for doctors only" when role is not doctor', async () => {
    setupAuthStore({ role: 'patient' })

    render(<ReviewsWebView />)

    expect(screen.getByText('For doctors only')).toBeTruthy()
  })

  it('does not fetch reviews when role is patient', () => {
    setupAuthStore({ role: 'patient' })

    render(<ReviewsWebView />)

    expect(mockFetchMyReviews).not.toHaveBeenCalled()
  })

  // ── Empty state ─────────────────────────────────────────────────────────────

  it('shows empty state when there are no reviews', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: [],
      pagination: makePagination(1, 1, 0),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeTruthy()
    })
    expect(screen.getByText('No reviews yet')).toBeTruthy()
  })

  // ── Reviews list ────────────────────────────────────────────────────────────

  it('renders review cards when reviews are returned', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: makeReviews(3),
      pagination: makePagination(1, 1, 3),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getAllByTestId('review-card')).toHaveLength(3)
    })
  })

  it('shows patient names in review cards', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: makeReviews(2),
      pagination: makePagination(1, 1, 2),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeTruthy()
      expect(screen.getByText('Patient 2')).toBeTruthy()
    })
  })

  it('shows review comments in cards', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: makeReviews(1),
      pagination: makePagination(1, 1, 1),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByText('Comment 1')).toBeTruthy()
    })
  })

  // ── Pagination ──────────────────────────────────────────────────────────────

  it('shows load-more button when more pages exist', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: makeReviews(10),
      pagination: makePagination(1, 3, 25),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('load-more-btn')).toBeTruthy()
    })
  })

  it('does not show load-more when on last page', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: makeReviews(3),
      pagination: makePagination(1, 1, 3),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.queryByTestId('load-more-btn')).toBeNull()
    })
  })

  it('loads next page when load-more is pressed', async () => {
    setupAuthStore()
    const page1Items = makeReviews(10)
    const page2Items = makeReviews(3).map((r) => ({ ...r, id: `p2-${r.id}` }))

    mockFetchMyReviews
      .mockResolvedValueOnce({
        items: page1Items,
        pagination: makePagination(1, 2, 13),
      })
      .mockResolvedValueOnce({
        items: page2Items,
        pagination: makePagination(2, 2, 13),
      })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('load-more-btn')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('load-more-btn'))

    await waitFor(() => {
      expect(mockFetchMyReviews).toHaveBeenCalledTimes(2)
      expect(mockFetchMyReviews).toHaveBeenCalledWith(TOKEN, 2, 10)
    })
  })

  // ── Error state ─────────────────────────────────────────────────────────────

  it('shows error message when fetch fails', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockRejectedValue(new Error('Network error'))

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy()
      expect(screen.getByText('Network error')).toBeTruthy()
    })
  })

  it('shows retry button on error', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockRejectedValue(new Error('Network error'))

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('retry-btn')).toBeTruthy()
    })
  })

  it('retries fetch when retry button is pressed', async () => {
    setupAuthStore()
    mockFetchMyReviews
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        items: makeReviews(1),
        pagination: makePagination(1, 1, 1),
      })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('retry-btn')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('retry-btn'))

    await waitFor(() => {
      expect(mockFetchMyReviews).toHaveBeenCalledTimes(2)
    })
  })

  // ── Refresh ─────────────────────────────────────────────────────────────────

  it('renders the refresh button', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: [],
      pagination: makePagination(1, 1, 0),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('refresh-btn')).toBeTruthy()
    })
  })

  it('calls fetch again when refresh button is pressed', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: makeReviews(2),
      pagination: makePagination(1, 1, 2),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(screen.getByTestId('refresh-btn')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('refresh-btn'))

    await waitFor(() => {
      // Called once on focus, once on refresh
      expect(mockFetchMyReviews).toHaveBeenCalledTimes(2)
      expect(mockFetchMyReviews).toHaveBeenCalledWith(TOKEN, 1, 10)
    })
  })

  // ── API call params ─────────────────────────────────────────────────────────

  it('passes token, page=1, and limit=10 on initial load', async () => {
    setupAuthStore()
    mockFetchMyReviews.mockResolvedValue({
      items: [],
      pagination: makePagination(1, 1, 0),
    })

    render(<ReviewsWebView />)

    await waitFor(() => {
      expect(mockFetchMyReviews).toHaveBeenCalledWith(TOKEN, 1, 10)
    })
  })

  it('does not fetch when accessToken is null', () => {
    setupAuthStore({ accessToken: null })

    render(<ReviewsWebView />)

    // role is doctor, but no token — load bails early
    expect(mockFetchMyReviews).not.toHaveBeenCalled()
  })
})
