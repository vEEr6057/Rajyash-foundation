# Batch 1 delta-spec — token retheme, shared primitives, chrome, auth

**Status:** LOCKED build contract. Cites [APP-UI-CHARTER.md](APP-UI-CHARTER.md) — read it first; this file only
lists the deltas. Builder: implement verbatim, no improvisation on hex values, weights, or copy.
**Branch:** `feature/ui-batch-1-shell-auth` → PR to `main`. Conventional commits, NO Co-Authored-By trailer.
**Done =** `SKIP_ENV_VALIDATION=1 npx tsc --noEmit` + `npx eslint` on touched files + `npx vitest --run`
(282 green, no test changes expected) + both themes eyeballed.

---

## 1. Token retheme — `src/app/globals.css`

Charter §2, exact values:

1. `--font-display: var(--font-roboto-slab), Georgia, serif;` (drop `--font-bricolage` + Mukta from the
   display stack; Mukta stays the body face).
2. Add app-wide Indic display fallbacks (mirror the `.rj-home` pattern at root level):
   ```css
   :root:lang(gu) { --font-display: var(--font-baloo-bhai2), "Noto Sans Gujarati", sans-serif; }
   :root:lang(hi) { --font-display: var(--font-baloo2), var(--font-noto-devanagari), sans-serif; }
   ```
3. Light: `--background: #FAF7F1` · `--surface-2: #F2ECDF` · `--border: rgba(30,42,34,.14)`.
   Dark: `--border: rgba(236,242,233,.13)`. (Dark grounds otherwise untouched — unification is a
   deferred batch-3 decision.)
4. New token both themes: `--gold-ink: #8A6D1A;` light / `--gold-ink: #E7C15A;` dark. Map into
   `@theme` as `--color-gold-ink` so `text-gold-ink` works.
5. Primary unification: light `--primary: #2A5C3C`, `--primary-hover: #234E33`; dark
   `--primary: #3E8B58`, `--primary-hover: #489A63`. Leave `--leaf` + status pills untouched.

## 2. Font loading — `src/app/layout.tsx`

Remove the `Bricolage_Grotesque` import, its `variable`, and its className wiring. Roboto Slab, Roboto,
Mukta, Baloo Bhai 2, Baloo 2, Notos already load — no additions. Verify no other file references
`--font-bricolage` (grep) — globals.css step 1 removes the last one.

## 3. Weight discipline sweep (mechanical)

Grep `font-display` across `src/`. On every element also carrying `font-bold` / `font-extrabold`:
headings and titles → `font-medium` (500); small labels/wordmarks (≤ 14px) → `font-semibold` (600).
Remove any `tracking-tight`/`tracking-tighter` on the same element (slab wants normal tracking).
Do NOT touch `.rj-home` homepage components (they don't use `font-display`) or status pills.

## 4. New shared primitives — `src/components/`

### 4.1 `LeafMark` extraction
Move `LeafMark` from `src/features/public/components/RescueLine.tsx` to `src/components/LeafMark.tsx`
(verbatim), re-export it from RescueLine (`export { LeafMark } from "@/components/LeafMark";`) so
homepage imports keep working.

### 4.2 `PageHeader.tsx`
```tsx
export function PageHeader({ eyebrow, title, meta, action }: {
  eyebrow?: string; title: string; meta?: string; action?: React.ReactNode;
}) 
```
Renders:
- eyebrow: `text-xs font-semibold uppercase tracking-[0.04em] text-gold-ink`
- title (`<h1>`): `font-display font-medium text-[clamp(1.375rem,2vw,1.75rem)] leading-tight text-balance`
- meta: `text-[13px] text-muted-foreground tabular-nums`
- layout: text block left; `action` right-aligned on `sm:flex-row` (stacks on mobile); `mb-6` bottom margin.
No card, no border — type only.

### 4.3 `EmptyState.tsx`
```tsx
export function EmptyState({ title, body, action }: {
  title: string; body?: string; action?: React.ReactNode;
})
```
Centered column, `py-16`: `LeafMark` at `size-8 text-gold-ink opacity-70`, title `font-display
font-medium text-lg`, body `text-sm text-muted-foreground max-w-sm text-balance`, optional action.
Built now, adopted per-screen in batches 2–5 (no adoption in this batch).

### 4.4 `LedgerRow.tsx`
```tsx
export function LedgerRow({ stats, provenance }: {
  stats: { value: string; label: string }[]; provenance?: string;
})
```
- Container: `border-y border-border` (hairlines top+bottom), NO card, NO shadow, transparent bg.
- Stats: `grid grid-cols-2 md:grid-cols-{n} divide-x divide-border` — each cell `px-4 py-5 first:pl-0`:
  value `font-display font-medium tabular-nums text-[clamp(1.75rem,3vw,2.25rem)] leading-none`,
  label `mt-1.5 text-[13px] text-muted-foreground`.
- provenance: `pt-2.5 text-xs text-muted-foreground` below the ruled block.
These are presentational components — **no tests** (testing-practices: props in, markup out).

## 5. Reference adoption — admin dashboard stat cards → LedgerRow

`src/app/admin/dashboard/page.tsx` (or its stat components): replace the six shadowed stat cards
(Meals rescued / Kg rescued / Deliveries / Open pickups / In progress / Active runs) with ONE
`LedgerRow` (6 stats, `md:grid-cols-6`, 2-col mobile) + provenance
`"Counted from deliveries logged in this app — not estimates."` (new i18n key, see §8). Keep the
existing "Updated Jul 3, 11:25 PM" line by moving it into `PageHeader meta` — adopt `PageHeader`
here too (eyebrow `"Admin"`, title `"Overview"`, existing action buttons as `action`). Charts,
directory cards, everything else on the page: untouched (batch 3).

## 6. Chrome

### 6.1 `src/components/AuthedHeader.tsx`
- Replace the two-line text brand with: `<img src="/images/rajyash/logo.png" alt={t("appName")} width={120} height={32} className="h-8 w-auto" />` (same asset as PublicHeader). Remove tagline line.
- Keep LanguageSwitcher / ThemeToggle / UserButton as-is.

### 6.2 `src/features/admin/components/AdminNav.tsx` (sidebar + mobile)
- Wordmark row: `LeafMark` `size-4 text-gold-ink` + "Admin" in `font-display font-semibold text-sm` +
  keep link to overview if present.
- Active item: keep the soft green pill (state, not action — charter §1); ensure text uses `--primary`
  and bg is a soft green (existing). Hover on inactive: `bg-surface-2`.
- No structural changes (items, order, icons stay).

## 7. Auth — `AuthSplitLayout`, sign-in, sign-up, staff

### 7.1 `src/features/auth/components/AuthSplitLayout.tsx` (redesign, keep the API + add one prop)
New props: `{ children, headline?, subline?, eyebrow?, stat?, statNote? }` (all optional strings except children).
- **Panel bg:** solid `var(--primary)` (which is now `#2A5C3C`) — delete the gradient and the blur
  blob div. White text.
- **Top:** existing home link; brand = logo img is white-incompatible → keep text brand but
  `font-display font-medium text-xl`, tagline `text-sm text-white/70` (unchanged copy).
- **Middle:** replace `HandHeart` with `<LeafMark className="mb-5 size-9 text-[#F6C445]" />`.
  Headline `<h2>`: `font-display font-medium text-[clamp(1.75rem,2.6vw,2.25rem)] leading-[1.15] text-balance` —
  default copy = new key `auth.headline`, rendered via `t.rich("headline", { g: (c) => <span className="text-[#F6C445]">{c}</span> })`.
  Subline: `mt-3 text-white/80` — new key `auth.subline`.
- **Bottom:** replace icon+line with a mini-provenance block:
  stat `font-display font-medium text-2xl tabular-nums` (default `auth.stat`) + note
  `text-sm text-white/70 max-w-xs` (default `auth.statNote`).
- The `headline`/`subline`/`stat`/`statNote` props override the defaults as plain strings (staff page).
- Mobile brand block (card column): `font-display font-medium` (weight sweep §3 covers it).

### 7.2 Clerk theming — `src/lib/clerkAppearance.ts` (new) + `src/app/layout.tsx`
```ts
import type { Appearance } from "@clerk/types";

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#2A5C3C",
    colorText: "#22271F",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-mukta), system-ui, sans-serif",
  },
  elements: {
    cardBox: "shadow-lg",
    formButtonPrimary: "text-sm normal-case",
  },
};
```
Apply once: `<ClerkProvider appearance={clerkAppearance} …>` in `src/app/layout.tsx` (covers SignIn,
SignUp, UserButton everywhere). Also pass `localization={{ signIn: { start: { title: "Welcome back", subtitle: "Sign in to continue to Food Rescue" } } }}`
via the existing localization mechanism IF one exists; if ClerkProvider has no localization prop wired
yet, add this object inline — it kills the "Sign in to Rajyash-foundation" hyphenated default. English
only (Clerk copy is not in next-intl scope).

### 7.3 `/staff` page — `src/app/staff/[[...staff]]/page.tsx`
Pass overrides: `eyebrow="Staff"`, headline = new key `auth.staffHeadline`, subline = `auth.staffSubline`,
stat = `auth.staffStat`, statNote = `auth.staffStatNote`. Eyebrow renders above the headline:
`text-xs font-semibold uppercase tracking-[0.04em] text-[#F6C445]`.

## 8. i18n keys (add to `messages/en.json` + GU/HI translations in the same PR)

Namespace `auth`:
| key | en |
|---|---|
| `headline` | `We rise by <g>lifting</g> others.` |
| `subline` | `Surplus food from Ahmedabad's kitchens, delivered to people who need it — the same evening.` |
| `stat` | `300+ people fed daily` |
| `statNote` | `Counted from deliveries logged in this app — not estimates.` |
| `staffHeadline` | `Tonight's runs start here.` |
| `staffSubline` | `Coordinate pickups, drivers and deliveries across the city.` |
| `staffStat` | `9,000+ people a month` |
| `staffStatNote` | `Reached by runs dispatched from this desk.` |

Namespace `admin` (dashboard): `provenance` = `Counted from deliveries logged in this app — not estimates.`
GU/HI: translate faithfully, keep the `<g>` tag around the equivalent of "lifting" / "ઊંચકીને" /
"उठाकर" (translator's judgement, tag must wrap ONE word/phrase).

## 9. Out of scope (do NOT touch)

Homepage/`.rj-home` anything · admin charts + directory cards · table screens · forms · date inputs ·
board/run screens · onboarding layout (it inherits the retheme passively) · dark-ground unification ·
PWA/manifest colors.

## 10. Self-QA before PR (builder)

1. Grep: zero `Bricolage`/`font-bricolage` references; zero `font-extrabold` adjacent to `font-display`.
2. `/sign-in` + `/staff` locally: panel solid green, gold accent word, provenance stat, themed Clerk
   card (green button, 12px radius), staff shows eyebrow + different copy.
3. `/admin/dashboard`: PageHeader + one ruled LedgerRow, no stat cards, charts intact.
4. Both themes on the three screens above; EN/GU/HI renders (Baloo displays for GU/HI headings).
5. Full: typecheck + eslint + vitest + `pnpm build` skipped locally on Windows (CI builds on Linux —
   opennext Windows bug, see lesson `opennext-windows-build-middleware-500`).
