# Batch 5 delta-spec — volunteer board + driver run

**Status:** LOCKED build contract. Read [APP-UI-CHARTER.md](APP-UI-CHARTER.md) §3.6 (field screen) first.
Batches 1–4 merged; reuse `PageHeader` / `EmptyState` / the batch-4 pickup-card recipe — do not fork.
**Screens:** `/portal/board` (+ its map view) · `/portal/dashboard` (volunteer variant) · `/portal/run`.
**Branch:** `feature/ui-batch-5-volunteer-driver` off `main` → PR. Done = typecheck+eslint+vitest green.

---

## 1. /portal/board (volunteer)

1. **PageHeader:** eyebrow `Volunteer`, title `Available pickups`, meta = `N waiting` (count already
   loaded), action = none.
2. **List/Map toggle** → proper segmented control, one height (`h-9`): active = primary solid, inactive
   = outline (match the batch-3 Pickup/Drop segment treatment). Keep icons.
3. **Cards:** adopt the batch-4 `PickupCard` recipe verbatim (rounded-xl, hairline border, shadow-sm,
   active/hover `bg-surface-2`, quantity in slab tabular). ≥`md`: 2-col grid. Claim interactions/logic
   untouched (incl. the claim-success `successPop` motion if wired).
4. **Empty:** `EmptyState` — title `All clear right now`, body `New surplus usually appears after lunch
   and dinner service — check back around then.` No action button.
5. **Map view:** map panel hairline-framed (`border border-border rounded-lg overflow-hidden`),
   height `min(70dvh, 640px)`; marker/popup logic untouched. Toggle state/URL behaviour untouched.

## 2. /portal/dashboard (volunteer variant)

Same treatment as batch-4 donor dashboard (§5 there): PageHeader (eyebrow `Volunteer`), stats →
`LedgerRow`, claimed-pickup cards = shared `PickupCard`. No new queries.

## 3. /portal/run (driver)

1. **PageHeader:** eyebrow `Driver`, title `My Run`, meta = run date + slot + `N stops` when a run is
   assigned (IST-pinned formatters only).
2. **No-run state:** convert to the `EmptyState` primitive but KEEP the two good pieces of the current
   card: the message voice and the coordinator phone line. Layout: LeafMark, title `No run yet`, body
   `No run assigned to you yet. Check back later.`, then a hairline and
   `Questions? Call the coordinator: <tel link>` (`text-sm`, link `text-primary`). Phone number comes
   from wherever it lives today (constant/i18n) — do not hardcode a new copy of it.
3. **Active run (field screen, thumb-first):**
   - Stops = hairline rows (mirror the batch-3 admin run-detail recipe: gold slab order number, kind
     eyebrow, name, status pill) BUT with mobile-first sizing: rows `py-4`, name `text-base`.
   - The CURRENT stop (first not-done) is the only elevated element on screen: `border border-border
     rounded-xl bg-surface-2 p-4` block above the list, containing the stop info + two full-width
     buttons stacked `gap-2`: `Navigate` (outline, external-link icon, existing deep-link) and
     `Mark done` (primary solid, `h-12`). Done/future stops stay in the quiet list below.
   - If the page already renders per-stop Navigate/Mark-done buttons inline, restructure the
     *presentation* to current-stop-first as above — but ZERO changes to the underlying actions,
     ordering rules, or run-completion behaviour (`markStopDone` contract untouched).
   - Run-complete state: keep the existing completion toast/summary; add `LeafMark` + slab
     `Run complete` heading if a static completed view exists.
4. Tap targets ≥44px everywhere; test at 390px.

## 4. Out of scope

Admin + donor screens · claim/assign/mark-done logic · GPS/tracking hooks · deep-link URLs ·
bottom-nav config · notifications.

## 5. Self-QA before PR

1. 390px: board cards, segmented toggle, driver current-stop block + h-12 Mark done reachable.
2. Board map framed, markers fine; list/map toggle preserves behaviour.
3. Driver no-run state shows leaf + phone link; active run shows exactly ONE elevated block.
4. Both themes, EN/GU/HI keys for new copy, suite green.
