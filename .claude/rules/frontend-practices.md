# Frontend playbook — Food Rescue web app

Adapted from the Quixera (`kaka`) frontend playbook for our **Next.js + PostgreSQL** stack.
The clean-code core is unchanged — reuse, keep things small and single-purpose, name them well.

The habit that matters most: **look before you build.** What you need usually already exists.

## 1. Reuse first — check shared folders before writing anything

Need a component, field, hook, or helper? Check in order:

- **`src/components/ui/`** — shadcn/Radix primitives (Button, Dialog, Table, Tabs, Badge, Input…). Never re-create one in a feature.
- **`src/components/forms/`** — shared form field components (see §2).
- **`src/lib/`** — `cn`, `logger`, formatters, date utils.
- **`src/features/<feature>/components/shared/`** — composed list/table pieces for that feature.

If something close exists, extend it (add a prop) instead of forking a copy. Build new only when nothing fits — put it where the next person will find it.

## 2. Forms — shared field components + React Hook Form + Zod

Each field component renders label + control + inline error from just `control` + `name`. Don't hand-wire `register` on a raw `<Input>` with a manual error `<p>`, and never mix styles in one form.

```tsx
// Don't
<Input {...register('firstName')} /> {errors.firstName && <p>…</p>}
// Do
<FormField control={control} name="firstName" label="First Name*" />
<FormSelect control={control} name="role" label="Role" options={ROLE_OPTIONS} />
```

- Read-only/view mode → pass `disabled` to the same field, don't fork the layout.
- Missing a field kind? Add a `Form*` component to `src/components/forms/` so the next form reuses it.
- Validation text comes from the Zod schema via `zodResolver` — never render error strings by hand.
- Zod v4 syntax: `{ error: 'msg' }` (not `{ required_error }`); `{ message: 'msg' }` for `min`/`max`.

## 3. Don't repeat yourself — fix it on the second copy

If a **substantial** block (a form section, a card, a non-trivial hook/transform) shows up **twice**, extract it into one reusable piece right then — don't wait for a third. Tiny snippets (a 3-line className) can stay.

## 4. Thin pages, single-purpose components

- Route files (`app/**/page.tsx`) just orchestrate: read params, call the data hook / server action, compose components. No business logic, no raw `fetch` in the page.
- **Modulith — machine-enforced (2026-07, PR #118).** Features are modules with a public API:
  `index.ts` (client-safe: components/hooks/lib/validations) + `server.ts` (server actions —
  separate so action re-exports never ride the client-safe barrel). `eslint-plugin-boundaries`
  makes violations lint errors: other modules and `app/**` enter a feature only through those two
  files; within a feature use relative sibling imports (a module never imports its own barrel —
  that's a cycle). Adding to a module's public surface = add the `export *` line to the right barrel.
- Chrome components that compose feature UI (e.g. `AuthedHeader`) are app-layer composition —
  they live in `src/app/_chrome/`, not `src/components/` (shared may not import features).
- Feature code lives in `src/features/<name>/{components,hooks,services,store,types,validations}`.
- One component, one job. If it fetches *and* lays out *and* renders a form *and* a table, that's several components.
- Keep components small (~5–40 lines); lift a section out before it grows past that.

## 5. Data & state

- **Server components / server actions** are the default for data that doesn't need client interactivity. Reach for client fetching only when you need it.
- **Server state in client components** → TanStack Query in a feature data hook (`useXData`) that calls the feature service.
- **Service layer + mock parity** → every feature has a real `<feature>Service.ts` and a `Mock<Feature>Service.ts`; the adapter picks based on env (`NEXT_PUBLIC_USE_MOCK_DATA`). Add a real method → add the mock too. Mocks are **frozen reference implementations** (the contract) — never edited to chase a refactor.

  ```ts
  // src/features/<feature>/services/<feature>Adapter.ts
  export const PickupService = isUsingMockData() ? MockPickupService : RealPickupService;
  ```

- **Adapter/mapper layer is mandatory.** DB/API shapes are mapped through pure mapper functions before reaching components — don't import raw DB row types into JSX. Mappers take no hooks, do no I/O, and own seams (e.g. 0-indexed UI ↔ 1-indexed API, enum normalization).
- **UI state** → Zustand, one store per feature; reset dependent state in setters (e.g. changing a filter resets `page` → 0); persist with `partialize`. (Dep removed 2026-07-06 as unused — v1 shipped on server components; `pnpm add zustand` again when the first real client store appears.)
- **One source of truth per value** — if the backend owns it (a status name, dial code), normalize it in one helper and reuse, not inline in three places.
- **Centralize query keys** in `src/config/constants.ts` (`QUERY_KEYS.pickups`, `QUERY_KEYS.pickup(id)`).

## 6. Naming & comments

- Names say what they hold or do: `remainingAttempts` not `n`; booleans `isPending`/`hasChanges`; verbs for handlers (`handleSave`).
- Default to no comment. Add one only for a non-obvious *why* (a backend quirk, a constraint). Never restate the code.

## 7. Env validation

Validate env at startup via Zod (`src/config/env.ts`) and refuse to boot on a missing/invalid value. Keep a `.env.example` committed.

## 8. Done means

Passes `pnpm typecheck` + `pnpm lint` (includes boundaries rules) + `pnpm knip` (dead files/deps gate) + the production build. Log via `logger` from `src/lib` (no `console.*` outside the logger). Use design tokens / Tailwind classes (no hardcoded hex when a token exists). Page `metadata.title` never hardcodes the brand suffix — the layout template appends it.

For what (and what not) to test, see [testing-practices.md](testing-practices.md) — meaningful behavior/logic tests, never a test-per-file.
