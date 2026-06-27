# Testing playbook — Food Rescue web app

Adapted from the Quixera (`kaka`) frontend testing playbook. We test with **Vitest + Testing Library**
(`@testing-library/react`, `user-event`, `jest-dom`) on jsdom. Shared setup in `src/test/setup.ts`.

The problem this rule solves: auto-generated tests tend to produce one test file per source file — a test for the
constants, the barrel, every hook. It looks like coverage but tells you almost nothing about whether the app works.
Ten tests that scream when a real feature breaks beat a hundred that confirm files exist.

**The rule of thumb:**

> Only write a test if it could realistically fail when something breaks. If you could delete the test and no real
> bug would ever slip through, it wasn't worth writing.

Before writing a test, ask: *If this feature broke tomorrow, would this test catch it — or could it only fail because
I made a typo in the test?* If you can't point to a real bug it would catch, skip it.

## What we DON'T test

Leave these out of the spec entirely:

- **Generated code** (DB client types, codegen output) — not ours to break.
- **Barrels / `index.ts` re-exports** — no logic, only exports.
- **Constants, enums, query-key maps, config objects** — a test that retypes the constant checks it equals itself.
- **Type-only files** — TypeScript already checks these.
- **App wiring** — root layout, providers, router setup. If broken the app wouldn't boot.
- **Frozen mock services** (`features/*/mocks/`) — fixtures, not logic.
- **Plain presentational components** — props in, markup out, no branching → nothing to assert.
- **The libraries themselves** — shadcn, Radix, TanStack Query. Trust them.
- **"It renders without throwing" tests** — feel productive, prove almost nothing.
- **Implementation details** — don't assert internal state names, that a function was called, or render counts. Test
  what the user sees.

## What IS worth testing (in order of confidence bought)

1. **Zod validation schemas** — cheapest, highest value. Valid object passes; each *invalid* case produces the exact
   message a user would see (required, formats, min/max, cross-field rules).
2. **Hooks with real logic** — anything that computes/derives state (filter toggles, selection). `renderHook` + `act`.
3. **Mappers & transforms** — API↔UI shape conversions, and the awkward seams (0-indexed store ↔ 1-indexed API) where
   off-by-one and shape bugs hide.
4. **Zustand stores** — setters and especially knock-on effects (changing a filter resets `page` → 0) and `partialize`.
5. **Components that make decisions** — only ones with real branching, tested as a user experiences them: error state
   shows the error, empty state shows empty UI, loading shows skeleton, a role check hides/shows an action, valid submit
   calls the handler with the *right* data, invalid submit shows the inline error and doesn't submit.

## How to write behavior tests

- **Find things like a user would** — `getByRole`, `getByLabelText`, `getByText`. `getByTestId` only as last resort.
- **Use `user-event`, not `fireEvent`.**
- **Assert on what the user sees/feels** — visible text, a disabled button, the data a handler got — not internal state.
- **One behavior per test, named like a sentence** — `it('shows a validation error when email is empty')`.
- **Set up shared wiring once** — a `renderWithClient` helper with a fresh `QueryClient` (`retry: false`) per test. No
  real network; assert against the mock service or a mocked query result.
- **Skip whole-component snapshots** — they break on cosmetic changes and get blindly updated.
- **Cover edge cases that matter** — empty list, single item, boundary value, error path. Three meaningful cases beat thirty mechanical ones.

## Done when

A reviewer can read just the test names and understand what the feature promises. Every test could genuinely fail if
the feature broke. No leftover tests for constants, barrels, types, app wiring, or "renders without throwing." Green
under `pnpm test`.
