# Batch 3 delta-spec — admin dashboard, reports, run detail

**Status:** LOCKED build contract. Read [APP-UI-CHARTER.md](APP-UI-CHARTER.md) first. Batches 1–2 are merged:
`PageHeader` / `EmptyState` / `LedgerRow` exist; the worktable shell pattern is live on the list screens —
match it, don't fork it.
**Screens:** `/admin/dashboard` (finish) · `/admin/reports` · `/admin/runs/[id]` (detail refinement).
**Branch:** `feature/ui-batch-3-dashboard-reports` off `main` (after batch 2 merges) → PR to `main`.
**Done =** typecheck + eslint + vitest green.

---

## 1. /admin/dashboard — finish the ledger conversion

Batch 1 already did PageHeader + top LedgerRow. Remaining:

1. **Chart panels (4: deliveries line, pickup status donut, top partners, top destinations):** replace
   `bg-card rounded shadow` wrappers with hairline panels — `border border-border rounded-lg bg-transparent`,
   NO shadow. Panel title: `font-display font-semibold text-[15px]` + `pb-3 border-b border-border`
   hairline under the title, chart below with `pt-4`.
2. **Chart colors:** series greens must come from tokens (`--primary`, `--leaf` families) — verify after
   the batch-1 primary change; donut/status colors follow the status-pill dot tokens where they represent
   statuses (open=amber, in-progress=blue, delivered=green, cancelled=grey/red). No hex literals in chart
   config if a token/constant exists; otherwise centralize the palette in one `const CHART_COLORS` in the
   dashboard feature.
3. **DIRECTORY section:** the 4 shadowed count cards (Partners / Destinations / Volunteers / Drivers) →
   one `LedgerRow` (4 stats, `md:grid-cols-4`), keep the small `DIRECTORY` label above but restyle to the
   eyebrow treatment: `text-xs font-semibold uppercase tracking-[0.04em] text-gold-ink`.
4. Each directory stat should link to its admin page (wrap cells in `Link` — if `LedgerRow` doesn't
   support it, add an optional `href` per stat to `LedgerRow` (anchor cell wrapper, `hover:bg-surface-2`),
   keep the component backward-compatible).

## 2. /admin/reports

1. **PageHeader:** eyebrow `Admin`, title `Impact report`, meta = the selected range rendered
   human ("1–3 Jul 2026"), action = none.
2. **Toolbar row** (worktable recipe): From/To date inputs (`h-9`, styled native), `Update` = primary
   solid `sm`. The two CSV buttons = outline `sm`, pushed right (`ml-auto`) on the same row (wrap on
   mobile). Their long labels shorten: `Pickups CSV`, `Run impact CSV` (keep full text in `title` attr;
   i18n keys updated, EN/GU/HI).
3. **Top stat cards (3) → `LedgerRow`** (Servings rescued / Kg rescued / Deliveries completed), provenance
   = the existing "Totals count delivered pickups by delivery date…" footnote (move it into the
   LedgerRow provenance slot; delete the loose paragraph). Keep the second footnote ("Run totals show
   stop counts…") as a `text-xs text-muted-foreground` line under the toolbar CSV buttons.
4. **Sections (Run summary / Destination breakdown / Partner breakdown):** section titles →
   `font-display font-semibold text-[15px]` with hairline underneath (match dashboard panel titles);
   tables → worktable shell (hairline `border-y`, caps 11px headers, no tinted header background, 44px
   rows, numerics right + tabular). Inline empty text stays a single quiet row
   (`text-sm text-muted-foreground py-8 text-center`) — NOT the big EmptyState (three per page would
   repeat the leaf).

## 3. /admin/runs/[id] — run detail

1. **PageHeader:** eyebrow `Admin · Dispatch`, title = slot name ("Morning drive"), meta = date + stop
   count + driver name if assigned ("29 Jun 2026 · 2 stops · QA Driver"), action = the status pill
   (pass as `action` node — pill top-right like today).
2. **Stops list:** nested shadow cards → hairline rows: container `border-y border-border divide-y
   divide-border`; each stop row `py-3 flex items-center gap-3`: order number in `font-display
   font-semibold text-sm text-gold-ink w-6 tabular-nums`, kind label (`Pickup`/`Drop`)
   `text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground w-14`, name in normal
   ink, status pill right, then reorder arrows + delete. Delete icon → ghost destructive
   (`text-muted-foreground hover:text-danger`), not permanent red.
3. **Add stop panel:** card → hairline panel (as dashboard §1.1). `Pickup`/`Drop` toggle: keep, style as
   segmented control (existing pattern if one exists; else two `sm` buttons — active primary solid,
   inactive outline). Native `<select>` → existing themed `Select` component if the codebase has one in
   `src/components/ui/select.tsx` (it does — shadcn); swap ONLY the element, zero logic changes.
   `Add pickup stop` button: outline full-width → primary solid `sm`, natural width, left-aligned.
4. NO map work on this page (live tracking is portal-side, batch 5). No reorder/DnD logic changes.

## 4. Out of scope

Portal screens · homepage · schema/queries/actions · chart library swap · Leaflet/maps · pagination
logic · the run-build flow logic (`/admin/runs/new` beyond what batch 2 already did).

## 5. Self-QA before PR

1. Dashboard: zero `shadow-*` inside the page content; 2 LedgerRows + 5 hairline panels; directory
   stats link through; both themes.
2. Reports: PageHeader + toolbar one height; ledger with provenance; 3 hairline sections; CSV buttons
   right; empty rows quiet.
3. Run detail: hairline stops with gold numbers, pill in header, themed Select, both themes.
4. EN/GU/HI keys for changed labels; typecheck/eslint/vitest green.
