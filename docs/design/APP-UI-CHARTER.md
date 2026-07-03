# App UI Charter — portals & admin (every screen except `/`)

**Status:** LOCKED design direction. Per-batch delta-specs cite this; builders implement those specs.
**Scope:** `/portal/*`, `/admin/*`, `/sign-in`, `/staff`, `/onboarding` + shared chrome (`AuthedHeader`, `AdminSidebar`, `PortalBottomNav`).
**Relation to HOMEPAGE-SPEC.md:** the homepage is the *voice*; the app is the *instrument*. Same brand, two dialects.

---

## 1. Thesis — one brand, two dialects

The homepage earned an identity: warm paper, Roboto Slab at medium weight, gold used as ink and line,
hairline-and-rhythm structure, numbers with provenance. The app screens must feel like the **same
organisation on a working day** — not a different product.

What crosses over (the shared DNA):

1. **Paper grounds.** The app's cream canvas aligns to the homepage paper family.
2. **Slab display.** Roboto Slab (500/600, never above 600) replaces Bricolage Grotesque as the app
   display face. Bricolage is retired entirely (font-budget win; the 700/800-tight-tracking look is
   the templated tell we already banned on the homepage).
3. **Gold as ink, never fill.** Eyebrow labels, section numbers, focus rings use `gold-ink`. No gold
   buttons, no gold backgrounds.
4. **Hairlines over boxes.** Structure comes from rules, alignment and rhythm — not nested bordered
   cards. One elevation level per screen, maximum.
5. **Numbers carry provenance.** Any stat shown in-app states its source/recency in the same breath
   ("counted from deliveries logged in this app", "updated 2 min ago"). Tabular numerals always.
6. **The leaf.** `LeafMark` is the shared brand glyph (empty states, sign-in, loading).

What deliberately does NOT cross over:

1. **Green action vs green state must stay distinguishable.** The app is already green-primary
   (`--primary: #2E7A47` — the saffron of UI-SPEC.md was retired when the brand went green+gold;
   treat UI-SPEC's color section as historical). The rule that keeps "act" and "done" readable in
   one hue: **solid green fill = interactive only** (buttons, active nav pill, current page);
   **state green is always the soft pill** (`--st-delivered-*` bg/fg/dot) and never a solid fill.
   No solid-green decorative elements. — Amended 2026-07-03: charter originally said "saffron
   stays"; that was written against the stale UI-SPEC, not the live app.
2. **Motion budget is frugal** (MOTION.md app budget): ≤200ms, transform+opacity, touch `:active`,
   the `rj-live` pulse and skeleton shimmer are the only loops. No scroll reveals, no count-up
   theatrics in tools people use twice a day.
3. **Density over air.** Editorial whitespace on the homepage; working density here.

## 2. Token changes (single retheme commit, batch 1)

All in `src/app/globals.css` `@theme` / `:root` — screens keep using semantic classes, so this
retunes every screen at once:

| Token | Now | Becomes | Why |
|---|---|---|---|
| `--font-display` | Bricolage Grotesque | `var(--font-roboto-slab)` | shared display voice |
| (display weights) | 700/800 | **500 default, 600 max** | slab warmth lives at 500 |
| `--background` | `#FBF7F0` | `#FAF7F1` | exact homepage paper |
| `--surface-2` | (current) | `#F2ECDF` | homepage paper-2, recessed panels |
| `--border` | (current) | `rgba(30,42,34,.14)` light / `rgba(236,242,233,.13)` dark | homepage hairline |
| new `--gold-ink` | — | `#8A6D1A` light / `#E7C15A` dark | eyebrows, section numbers, focus accents |
| `--primary` | `#2E7A47` light / `#2F8A4F` dark | `#2A5C3C` light (hover `#234E33`) / `#3E8B58` dark (hover `#489A63`) | ONE CTA green everywhere — same as `--rj-green-cta`; kills the two-greens drift between homepage and app |
| status pill tokens | (current) | **unchanged** | already spec'd, working |

Indic display fallbacks follow the homepage wiring: `:lang(gu)` → Baloo Bhai 2, `:lang(hi)` →
Baloo 2, at `0.92em` optical correction for display sizes. Fonts already loaded in `layout.tsx` —
this retheme *removes* Bricolage weights, net font payload goes down.

Dark theme: every token above ships both values; the app already has `.dark` — verify each batch in
both themes before PR.

## 3. Shared patterns (built once in batch 1, consumed everywhere)

### 3.1 PageHeader (every screen starts with one)
```
[eyebrow]  ADMIN · PICKUPS            ← 12px, 0.04em caps, gold-ink
[H1]       Pickups                    ← slab 500, clamp(1.375rem, 2vw, 1.75rem)
[provenance] 14 open · updated 2 min ago   ← 13px ink-soft, tabular-nums
                                      [primary CTA sits right, same row on ≥md]
```
One component (`src/components/PageHeader.tsx`), props: eyebrow, title, meta, action. No screen
hand-rolls its own title block.

### 3.2 EmptyState
LeafMark (muted), one slab sentence, one body line, one CTA. Never a bare "No data." Every list
screen defines its empty state in the batch spec.

### 3.3 Ledger stat (app variant)
Homepage `LedgerImpact` distilled: hairline-ruled row of stats, slab tabular numerals (500), label +
provenance line. Used on admin dashboard, reports, portal dashboards. No stat cards with shadows —
the ledger row IS the pattern.

### 3.4 Table shell
Toolbar (filters left, count + CTA right) · hairline header row (11px caps, 0.04em, ink-soft) ·
44px body rows · row hover = `paper-3` fill (no shadow) · status pills per UI-SPEC · aligned
numerics right + tabular · pagination as quiet text buttons. Sort via existing `SortHead`.

### 3.5 Form sheet
Single column, `max-width: 40rem` · shared `Form*` field components only (frontend-practices §2) ·
section breaks = hairline + slab 600 15px label, not cards · destructive actions separated by a
hairline, never adjacent to submit · map-picker embeds full-bleed within the column.

### 3.6 Field screen (mobile-first: board, map, my run)
Cards allowed here (tap targets), radius 12, one shadow level · primary info 17px+ · tap targets
≥44px · `rj-live` pulse on live elements · Navigate/act buttons full-width at thumb reach ·
sticky bottom action bar pattern for the driver run.

## 4. Voice & microcopy

Human, specific, Ahmedabad-grounded. "No pickups waiting right now — surplus usually arrives after
lunch service." beats "No data found." Buttons say what happens ("Assign driver", "Mark delivered").
Errors say what to do next. All copy through next-intl keys (EN now, GU/HI keys created in the same
PR, machine-draft translations flagged for review).

## 5. Accessibility floor (per batch, non-negotiable)

AA contrast in both themes · visible focus (`outline: 3px solid var(--gold-ink)` chrome; `--ring`
inside forms) · `aria-sort` on sortable headers (exists) · one `h1` per page (the PageHeader) ·
status pills never color-only (dot + label) · `prefers-reduced-motion` honoured.

## 6. Batch order & the pipeline

Audit (Haiku, screenshots+inventory) → delta-spec (Fable, cites this charter) → build (Opus,
branch → PR, typecheck/lint/tests/build) → design QA (Fable, live screenshots vs spec) → merge.

1. **Shell + auth** — token retheme §2, PageHeader/EmptyState/Ledger primitives §3, AuthedHeader,
   AdminSidebar, sign-in/staff/onboarding.
2. **Admin worktables** — pickups, runs (+new/detail), destinations, partners, users.
3. **Admin dashboard + reports + tracking.**
4. **Donor portal** — dashboard, log surplus, my pickups (+detail/edit).
5. **Volunteer + driver** — board, board/map, my run.

A later batch never re-decides charter questions; if a batch spec needs to contradict this file,
the charter gets amended first (one line, dated) so the contract stays single-source.
