# UX Improvements v1 — spec

Source: full-app walkthrough during handbook v2 capture (2026-07-05) — every screen, all four
roles. Each item = observed friction, not a guess. Status key: `W1` = wave 1 (building now),
`W2` = wave 2 (queued), `HUMAN` = needs a person, `DONE-ELSEWHERE` = covered by another PR.

Binding rules for every item: `.claude/rules/frontend-practices.md` (reuse-first, thin pages,
FormSheet pattern, mapper layer), `production-discipline.md` §2 (ownership re-checked on every
read; status transitions only via the state machine; no client-trusted authz values),
`testing-practices.md` (behavior tests only). All strings via next-intl (EN real, GU/HI drafted
+ `_review: "pending"`), catalog parity enforced by test. Design tokens only — no invented hex.

---

## Driver (mobile-first, highest stakes)

### UX-1 · W1 · Claim from the board card
**Problem:** Board card → detail page → claim = one hop too many; even our QA agent tripped.
**Fix:** "Claim" button on each board card (`AvailablePickupsList` card) with a confirm popover.
Card body still links to detail. Uses the existing `claimPickup` action (atomic
claim-if-available — unchanged). On success: toast + card removed/optimistic refresh.
**Accept:** claim possible in 2 taps from board; conflict (already claimed) shows the existing
conflict message inline, card clears.

### UX-3 · W1 · Call-donor button
**Problem:** Address shown, phone shown as text — driver has to memorize/copy the number.
**Fix:** `tel:` anchor button (phone icon + number) on driver pickup detail + on each run stop
that has a donor/contact phone. Render only when phone exists.
**Accept:** tapping dials on mobile; no layout jump when phone absent.

### UX-4 · W1 · Open-in-Google-Maps deep links
**Problem:** Leaflet map is view-only; drivers actually navigate in Google Maps.
**Fix:** "Navigate" button on driver pickup detail + each run stop:
`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` (coords when present, else
URL-encoded address). `target="_blank" rel="noopener"`.
**Accept:** opens GMaps app/tab with destination prefilled.

### UX-5 · W1 · Sticky full-width status-advance button (mobile)
**Problem:** The advance action ("Picked up" → "En route" → …) is a small button — gloves-and-
hurry UX.
**Fix:** On driver pickup detail (mobile viewport), the primary advance action becomes a sticky
bottom bar: full-width, min-h-12, safe-area padding. Desktop unchanged. Still calls the same
server-enforced transition action.
**Accept:** advance reachable with thumb without scrolling on a 640px viewport.

### UX-2 · W2 · Distance-aware board ordering
Nearest-first sort (or distance chips) using browser geolocation; fallback = current
chronological. Deferred: needs geo-permission UX + haversine util + empty-geo handling.

## Donor

### UX-6 · W1 · Repeat-last-pickup prefill + sticky submit
**Problem:** Restaurants post near-identical surplus daily; the post sheet is long on a phone.
**Fix:** (a) If the donor has ≥1 previous pickup, show "Repeat last pickup" at the top of the
post FormSheet — prefills food type/qty/unit/description/address from their most recent pickup
(server action returns the donor's own last pickup — ownership by `donorId = session.userId`);
window/photo NOT prefilled (always fresh). (b) Submit button sticky at sheet bottom on mobile.
**Accept:** returning donor posts in <30s; prefill never leaks another donor's data (ownership
in the query, not the client).

### UX-7 · W1 · Status timeline on donor pickup detail
**Problem:** Donor sees nothing between "posted" and driver moving (tracking is en_route-only
by design — that stays).
**Fix:** Vertical stage timeline on donor pickup detail: posted → claimed/assigned → en route →
delivered, driven by the pickup's `statusEvents` (already audited server-side). Current stage
highlighted (`rj-live` pulse on active). Timestamps shown; actor names NOT shown to donors
(privacy) — just the stage + time.
**Accept:** donor always sees where their pickup is in the loop; no extra queries on list pages
(detail only).

### UX-8 · W1 · Delivery proof-back to the donor
**Problem:** Driver uploads a proof photo; the donor never sees the impact.
**Fix:** On a `delivered` pickup's donor detail: "Your food reached <destination>" block with
the proof photo (only when `proofPhotoUrl` exists). Reuse the existing ownership-checked donor
pickup query — add the field to its mapper; NO new public URL surface (same signed/stored URL
handling as the driver's own view).
**Accept:** delivered pickup shows photo + destination to its owner only.

## Volunteer

### UX-9 · W2 · Distributions map view
Drop-stop pins for today's active runs + count of confirmed helpers. Medium (new map compose).

### UX-10 · W2 · Volunteer landing rebalance
Demote the read-only board to a "what's cooking" feed; make Today's Distributions the
volunteer home. Product-level nav change — wants co-founder eyes.

## Admin

### UX-11 · W1 · Dashboard load time (SSR hang)
**Problem:** Admin Overview SSR takes >60s intermittently (observed live during capture).
Aggregates (stat tiles, 30-day chart, status donut, top partners/destinations, rescue-time
percentile) appear to run serially on a pooled connection.
**Fix:** (a) `Promise.all` every independent aggregate. (b) Wrap the aggregate reads in
`unstable_cache` (or `cache()` + revalidate) with `revalidate: 60` — SAFE here: single-tenant,
aggregates contain no per-user data, page itself stays authed (cache the DATA functions, never
the page). (c) Merge trivially-mergeable counts into one SQL round trip where obvious.
**Accept:** dashboard TTFB < 3s warm, < 8s cold; numbers identical to before (spot-check vs
live counts); no caching of anything session-scoped.

### UX-14 · W1 · Status-event timeline on admin run/pickup detail
**Problem:** `statusEvents` (from → to, actor, timestamp) already recorded, never displayed;
support/debug flies blind.
**Fix:** Collapsible "History" section on admin run detail (per stop) and admin pickup detail:
chronological event list — `<from> → <to> · <actor role/name> · <time IST>`. Admin-only.
**Accept:** every transition visible; admins can answer "who moved this and when" without SQL.

### UX-15 · W1 · Destination active/inactive toggle
**Problem:** Schema has `active`; form never exposes it; delete-conflict message tells admins to
"mark inactive" — a path that doesn't exist (found during handbook verification).
**Fix:** Switch/checkbox in `DestinationForm` (edit mode), persisted via the existing update
action; destination pickers filter to active by default. List shows an Inactive badge.
**Accept:** the delete-conflict guidance is now followable end-to-end.

### UX-12 · W2 · Bulk assign on the pickups list
Multi-select rows → one assign-to-driver/run dialog. Medium (table selection state + batch
action with per-row atomic claim semantics).

### UX-13 · W2 · Users table search + role filter
Name/email search + role filter. **Blocked** until `feature/admin-invite-provisioning` merges
(same surface).

## Cross-cutting

### UX-16 · W1 · Instructive empty states
**Problem:** Empty board / pickups / distributions / notification feed all say a bare "nothing
here" — teach nothing.
**Fix:** One shared `EmptyState` component (icon + title + one-line "what appears here" + at
most one action button); adopt it in: driver board, donor pickups list, volunteer
distributions, notification feed, admin pickups/runs empty tables.
**Accept:** each empty state names what will appear and the single next action; component
reused, not forked.

### UX-17 · W1 · PWA install nudge
**Problem:** Serwist PWA is live; nobody's told to install it.
**Fix:** Dismissible banner (portal layouts only, not public pages) after the 2nd signed-in
visit (localStorage counter): captures `beforeinstallprompt` → "Install" triggers the native
prompt; iOS Safari (no event) shows a one-line "Share → Add to Home Screen" hint. Never shows
when already installed (`display-mode: standalone`) or after dismissal (localStorage flag).
**Accept:** shows at most once-per-dismissal, works on Chrome/Android, degrades to hint on iOS.

### UX-18 · HUMAN · GU/HI native-speaker review
All `_review: "pending"` strings need a native pass before real drivers see them. Not agent
work — foundation task (add to OWNER-TASKS).

### UX-19 · W1 · Post-deploy asset-integrity guard (the deferred D1)
**Problem:** A deploy once shipped with every client JS chunk 404ing; curl-the-HTML smoke
checks can't catch it (lesson: `curl-smoke-check-misses-dead-client-js`).
**Fix:** Step in `deploy.yml` after the deploy: fetch the live homepage, extract one referenced
`/_next/static/chunks/*.js` URL, `curl -f` it — non-200 fails the workflow loudly.
**Accept:** a deploy with dead client assets turns the deploy run red instead of silently
shipping a blank app.

---

## Waves & integration — ONE PR

All W1 work lands as **one PR / one deployment**: builders work in parallel worktrees off
`main`, the orchestrator reviews each diff and integrates everything onto
`feature/ux-improvements-v1`, adds UX-19, re-runs all gates on the combined branch, opens a
single PR.

- **W1-A** (builder) — UX-1, UX-3, UX-4, UX-5 (driver)
- **W1-B** (builder) — UX-6, UX-7, UX-8 (donor)
- **W1-C** (builder) — UX-11, UX-14, UX-15 (admin)
- **W1-D** (builder) — UX-16, UX-17 (cross-cutting)
- **Integration** (orchestrator) — merge A–D, UX-19, combined `pnpm typecheck && pnpm lint &&
  pnpm test:run`, i18n-conflict resolution (C's `admin.json` vs the invite PR), single PR.
- **W2** — UX-2, UX-9, UX-10, UX-12, UX-13 (13 unblocks after the invite PR merges)
