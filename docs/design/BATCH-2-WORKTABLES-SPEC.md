# Batch 2 delta-spec — admin worktables

**Status:** LOCKED build contract. Read [APP-UI-CHARTER.md](APP-UI-CHARTER.md) §3.1/§3.2/§3.4/§3.5 first;
batch 1 primitives (`PageHeader`, `EmptyState`) are merged and MUST be used, not re-invented.
**Screens:** `/admin/pickups` · `/admin/runs` (+ `/admin/runs/new`, `/admin/runs/[id]` light-touch) ·
`/admin/destinations` · `/admin/partners` · `/admin/users` · `/admin/surplus/new` (light-touch).
**Branch:** `feature/ui-batch-2-worktables` off `main` (after PR #62 merges) → PR to `main`.
**Done =** typecheck + eslint + vitest green (no test rewrites expected; snapshot-free per testing-practices).

---

## 1. Shared worktable shell (apply to all five list screens)

1. **PageHeader** replaces every hand-rolled title block:
   - eyebrow `"Admin"` (existing i18n or new key `admin.eyebrow`)
   - title = existing page title key
   - meta = count + context, tabular-nums — e.g. pickups `"176 total · page 1 of 9"`, destinations
     `"10 destinations"`, users `"N users"`. Reuse the counts the pages already query; do NOT add new queries.
   - action = the existing primary CTA ("Log surplus", "New run", "Add a destination", …).
2. **Kill the floating card.** Tables lose `rounded/shadow/bg-card` wrappers → transparent, structure by
   hairlines only: `border-y border-border` on the table block, `divide-y divide-border` rows.
3. **Header row:** `text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground`,
   `py-2.5`. **No asterisks in header labels** (destinations currently shows `NAME*`,
   `ADDRESS / GOOGLE MAPS LOCATION*` — form-label leakage; rename to `Name`, `Address / Maps`).
   Keep existing `SortHead`/`aria-sort` behaviour on pickups.
4. **Body rows:** min-height 44px (`py-3`), hover `bg-surface-2`. Numeric columns (`Stops`, quantities,
   counts) right-aligned + `tabular-nums`.
5. **Empty states:** every list renders `EmptyState` when zero rows (after filters too). Copy (new keys,
   EN below — add GU/HI in same PR):
   - pickups: title `No pickups match` body `Try clearing the filters — surplus usually arrives after lunch and dinner service.`
   - runs: title `No runs yet today` body `Build the first run once pickups start coming in.` action = New run
   - destinations: title `No destinations saved` body `Save the regular drop points so runs can be built in seconds.` action = Add a destination
   - partners: title `No partners yet` body `Add the first restaurant or kitchen you rescue from.`
   - users: title `No users found` body `People appear here after their first sign-in.`

## 2. Toolbar recipe (pickups is the only screen with filters today)

One row, one control height (`h-9`), `flex flex-wrap items-center gap-2`:
- Status `Select` (shadcn, themed — already exists), two date inputs: keep native `<input type="date">`
  but style to match (`h-9 rounded-md border border-border bg-transparent px-3 text-sm`).
- Buttons: `Filter` = primary solid `size="sm"`; `Clear` = ghost `size="sm"`; `Export CSV` = outline
  `size="sm"` pushed right (`ml-auto`). Never three different visual weights side-by-side at equal rank —
  primary/ghost/outline as listed.

## 3. Per-screen deltas

### /admin/pickups
- Volunteer column: assigned → volunteer label in normal ink; unassigned → `text-muted-foreground`
  plain "Unassigned" (localized). No chips, no color (status pill column already carries color).
- Created column stays IST-pinned (`formatWindow`/`APP_TIME_ZONE` — do not touch date logic).

### /admin/runs
- Column header `Driver (optional)` → `Driver`; empty driver cell → `—` muted.
- `Stops` right-aligned tabular. Status pill unchanged. Keep row chevron + row-link behaviour.
- `/admin/runs/new` + `/admin/runs/[id]`: form-sheet light-touch ONLY — content column
  `max-w-[40rem]`, section breaks = hairline + `font-display font-semibold text-[15px]` label (replace
  any boxed section cards). No field/logic changes.

### /admin/destinations
- Drop the redundant `ALL DESTINATIONS` section label (PageHeader meta covers it).
- Address cell: address text; if missing, `—` muted. "Open in Maps" link stays (valid lat/lng fallback),
  `text-primary` with icon, `text-[13px]`.

### /admin/partners, /admin/users
- Shell conversion only (§1). No column changes beyond header-style alignment.

### /admin/surplus/new
- Form-sheet light-touch as runs/new. Nothing else.

## 4. Out of scope

Dashboard/reports (batch 3) · portal screens (batches 4–5) · any schema/query/action change · date-input
component replacement (native stays, styled) · pagination logic (style the existing controls quietly:
ghost text buttons, active page = solid primary, `tabular-nums`).

## 5. Self-QA before PR

1. All five lists: PageHeader (gold eyebrow, slab title, meta), hairline table, no card shadow, 44px rows,
   hover surface-2, caps headers without asterisks.
2. Pickups toolbar single-height; filter/clear/export weights per §2.
3. Force an empty result (filter to a past date range) → EmptyState with LeafMark renders.
4. Both themes; EN/GU/HI keys present; typecheck/eslint/vitest green.
