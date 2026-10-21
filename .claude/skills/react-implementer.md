# Skill: React TSX Implementer

## Purpose
Implement features cleanly in a React Native + TypeScript codebase following
domain-driven design, Flux architecture for intra-domain state, and event-driven
architecture for cross-domain communication.

---

## Folder Structure — Domain-Driven Design

Every feature lives inside its domain folder. No exceptions.

```
domains/
  <domain>/
    types.ts         ← entities, value objects, DTOs — pure types, no logic
    repository.ts    ← all API calls for this domain, returns typed entities
    store.ts         ← Zustand slice: state + actions (Flux)
    events.ts        ← event names this domain emits and their payloads
    hooks/           ← UI hooks that compose store + repo
    components/      ← React Native components for this domain only
    index.ts         ← barrel: exports only what other domains/screens need

utils/
  eventBus.ts        ← shared event bus (create once, import everywhere)
```

Rules:
- One domain = one concern. If unsure where something belongs, make a new domain.
- `types.ts` is pure TypeScript — no imports from other domains.
- `repository.ts` only calls the API — no state, no side-effects beyond the call.
- No cross-domain imports inside a domain except through `eventBus`.
- Screens live in `app/` and compose from domain `index.ts` exports only.

---

## Flux Architecture — Intra-Domain State (Zustand)

All state and actions for a domain live in one Zustand slice in `store.ts`.
Components dispatch actions → store updates state → components re-render.
No state lives in components unless it is purely local UI state (e.g. modal open).

```ts
// domains/<domain>/store.ts
import { create } from 'zustand'
import { <Domain>Repository } from './repository'
import { emit } from '@/utils/eventBus'
import type { <Entity> } from './types'

interface <Domain>State {
  // --- state ---
  items: <Entity>[]
  loading: boolean
  error: string | null
  // --- actions ---
  fetch: () => Promise<void>
  clear: () => void
}

export const use<Domain>Store = create<<Domain>State>()((set) => ({
  items: [],
  loading: false,
  error: null,

  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const items = await <Domain>Repository.getAll()
      set({ items, loading: false })
      emit('<domain>:fetched', { count: items.length })  // notify other domains
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  clear: () => set({ items: [], error: null }),
}))
```

Rules:
- One `create` call per domain — no splitting state across multiple stores.
- Actions are async functions inside the store, not hooks, not components.
- Emit an event after significant state changes so other domains can react.
- Never call another domain's store directly — emit an event instead.
- For persistence (auth tokens, etc.) add `persist` middleware — follow the
  pattern in `domains/auth/store.ts`.

---

## Event-Driven Architecture — Cross-Domain Communication

Domains must not import from each other's internals. When domain A needs to
react to something in domain B, domain B emits an event and domain A listens.

### Event Bus

If `utils/eventBus.ts` does not exist, create it:

```ts
// utils/eventBus.ts
type Handler<T = unknown> = (payload: T) => void

const listeners = new Map<string, Set<Handler>>()

export function emit<T>(event: string, payload?: T): void {
  listeners.get(event)?.forEach((h) => h(payload as T))
}

export function on<T>(event: string, handler: Handler<T>): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(handler as Handler)
  return () => listeners.get(event)?.delete(handler as Handler)  // returns unsubscribe
}
```

### Event Definitions

Each domain declares the events it owns in `events.ts`:

```ts
// domains/auth/events.ts
export const AUTH_EVENTS = {
  LOGOUT: 'auth:logout',
  LOGIN:  'auth:login',
} as const

export interface AuthLogoutPayload { userId: string }
export interface AuthLoginPayload  { userId: string; role: string }
```

### Subscribing to Events

Subscribe in `store.ts` at module load time (outside `create`), or in a
`useEffect` inside a root-level component/provider:

```ts
// domains/chat/store.ts
import { on } from '@/utils/eventBus'
import { AUTH_EVENTS } from '@/domains/auth/events'

// subscribe when the module loads
on(AUTH_EVENTS.LOGOUT, () => {
  useChatStore.getState().clear()
})
```

### Rules
- A domain only emits events it owns (defined in its `events.ts`).
- A domain subscribes to events from other domains but never imports their store.
- Event names follow the pattern `<domain>:<verb>` (e.g. `auth:logout`, `doctor:profile_updated`).
- Always return the unsubscribe function from `on()` and call it in cleanup
  (`useEffect` return, store teardown) to prevent memory leaks.
- Do not emit events for purely local UI changes — only for state changes other
  domains might care about.

---

## Component Rules

- One component per file. File name = component name: `ReviewCard.tsx` exports `ReviewCard`.
- No inline styles — use `StyleSheet.create` or the project's existing style pattern.
- Props interface defined above the component, named `<ComponentName>Props`.
- Destructure props at the function signature.
- Components read from domain store via hook — never fetch directly in a component.

```tsx
interface ReviewCardProps {
  review: Review
  onPress?: (id: string) => void
}

export const ReviewCard = ({ review, onPress }: ReviewCardProps) => { ... }
```

---

## TypeScript Rules

- No `any` — use `unknown` + type guards, or define a proper type.
- All API response shapes have an explicit interface in `types.ts`.
- Use `type` for unions/intersections, `interface` for object shapes.
- Export types from `index.ts`.

---

## Hooks Rules

- UI hooks live in `domains/<domain>/hooks/use<Name>.ts`.
- Each hook has one responsibility.
- Hooks compose store selectors + repository calls — they do not own state.
- Always expose `loading`, `error`, and the data explicitly.

---

## Clean Code Rules

- Max function length: 30 lines — extract if longer.
- No magic numbers — use named constants.
- Early returns over nested conditionals.
- Meaningful names only: no `data`, `res`, `tmp`.

---

## File Output

After implementing, list every file created or modified:

```
## Files Changed
- created: domains/reviews/types.ts
- created: domains/reviews/repository.ts
- created: domains/reviews/store.ts
- created: domains/reviews/events.ts
- created: domains/reviews/components/ReviewCard.tsx
- created: domains/reviews/index.ts
- created: utils/eventBus.ts          ← only if it didn't exist
- modified: app/(tabs)/_layout.tsx
```
