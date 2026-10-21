# Skill: React Testing with Vitest + Testing Library

## Purpose
Write unit and component tests that verify behavior, not implementation.
Tests must be readable, maintainable, and give genuine confidence.

## Stack
- Vitest for test runner
- @testing-library/react for component rendering
- @testing-library/user-event for interactions
- @testing-library/jest-dom for matchers
- msw for API mocking (if applicable)

## Core Philosophy
- Test behavior the user sees, not internal implementation
- Never test: state variable values, internal method calls, prop passing
- Always test: what renders, what happens on interaction, what shows on error

## File Conventions
- Test file lives next to the component: `UserCard.test.tsx`
- Hook test: `useLogin.test.ts`
- Test file mirrors the component structure, not a flat dump

## Component Test Structure
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { UserCard } from './UserCard'

const defaultProps = {
  userId: 'user-1',
  onSelect: vi.fn(),
}

describe('UserCard', () => {
  it('renders the user name', () => {
    render(<UserCard {...defaultProps} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('calls onSelect with userId when clicked', async () => {
    const onSelect = vi.fn()
    render(<UserCard {...defaultProps} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /select/i }))
    expect(onSelect).toHaveBeenCalledWith('user-1')
  })

  it('shows loading state while fetching', () => {
    render(<UserCard {...defaultProps} isLoading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

## Hook Test Structure
```ts
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useLogin } from './useLogin'

describe('useLogin', () => {
  it('sets loading true while submitting', async () => {
    const { result } = renderHook(() => useLogin())
    act(() => { result.current.submit({ email: 'a@b.com', password: '123' }) })
    expect(result.current.isLoading).toBe(true)
  })
})
```

## Query Priority (use in this order)
1. `getByRole` — always prefer this
2. `getByLabelText` — for form fields
3. `getByPlaceholderText` — fallback for inputs
4. `getByText` — for non-interactive content
5. `getByTestId` — last resort only

## What to Test Per Component
- [ ] Renders without crashing (smoke test)
- [ ] Renders correct content with default props
- [ ] Renders correct content with edge-case props (empty, null, long strings)
- [ ] User interactions trigger correct callbacks
- [ ] Loading state renders correctly
- [ ] Error state renders correctly
- [ ] Conditional rendering behaves correctly

## What NOT to Test
- Implementation details (state variable names, internal functions)
- CSS classes or styles
- Third-party library internals
- Snapshot tests for complex components (brittle)

## Mocking Rules
- Mock at the module boundary, not deep inside
- Always reset mocks between tests: use `beforeEach(() => vi.clearAllMocks())`
- For API calls, mock the hook or service layer, not fetch directly

## Coverage Expectations
- Every component gets at minimum: smoke test + interaction test + error state test
- Every custom hook gets: initial state test + action test + error test
- Aim for behavior coverage, not line coverage

## Output Format
After writing tests, provide this summary:
```
## Tests Written
- UserCard.test.tsx — 5 tests (render, interaction, loading, error, empty state)
- useLogin.test.ts — 3 tests (initial state, submit, error)

## Coverage Areas
- [ ] Smoke tests
- [ ] Interaction tests
- [ ] Loading states
- [ ] Error states
- [ ] Edge cases

## Not Tested (and why)
- ...
```