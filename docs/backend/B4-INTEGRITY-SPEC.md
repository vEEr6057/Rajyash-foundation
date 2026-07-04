# B4 — Data integrity (build contract)

**Status:** LOCKED (Fable audit, 2026-07-04).
**Audit verdict:** the core loop is race-safe — pickup transitions ride conditional UPDATEs keyed on
(id, owner, from-status); stop/run transitions check the pure machines server-side; children of
pickups/runs cascade correctly (`status_events`, `pings`, `notifications`, `run_stops`, `run_pings`).
Four gaps below. **No schema/migration changes in this batch** — all fixes are action/repo-level.

## 1. `deleteDestination` fails ugly when referenced (mirror `deletePartner`)

`run_stops.destination_id` is a NO-ACTION FK; deleting a referenced destination throws → generic
"Could not delete the destination." `deletePartner` already does this right (catches `23503` →
CONFLICT with guidance). Do the same here: catch FK violation → `fail("CONFLICT", …)` with copy that
points at the `active` flag: "This destination is used by past runs — mark it inactive instead of
deleting." (i18n keys EN/GU/HI if the message surfaces through a translated toast — follow how the
partner CONFLICT message is surfaced today.) Also check `deletePartner`'s catch covers the
`run_stops.partner_id` reference (its current copy only mentions donors — broaden to "linked donors
or past run stops").

## 2. Run mutations ignore run status (stops of completed/cancelled runs are editable)

`addPickupStop` / `addDropStop` / `removeStop` / `reorderStops` have no run-status guard — an admin
can mutate the stop list of a `completed`/`cancelled` run (silently corrupts reports; `run/completed`
was already emitted). `deleteRun` can delete an `active` run mid-drive (driver's screen loses the
run without explanation).

Fix (per action, after the existing NOT_FOUND check):
- add/remove/reorder stops: allowed only while `run.status` is `planned` or `active` — else
  `fail("CONFLICT", "This run is completed/cancelled — stops can no longer change.")`.
- `deleteRun`: allowed only for `planned` or `cancelled` runs — an `active` run must be cancelled
  first (`fail("CONFLICT", "Cancel the run before deleting it.")`); a `completed` run is a record —
  block deletion outright (same CONFLICT path, copy: "Completed runs are kept for reporting.").
- `removeStop`/`reorderStops` need the run row anyway — fetch once, reuse.

## 3. `overrideStopStatus` can strand a completed run with a pending stop

Admin override deliberately bypasses the stop machine (fine) — but reverting a stop to `pending` on
a `completed` run leaves run=completed with unfinished stops, and `VALID_RUN_TRANSITIONS.completed`
is `[]` so the run can never reopen. Fix: in `overrideStopStatus`, when the target run is
`completed` or `cancelled`, reject with `fail("CONFLICT", "This run is closed — stop statuses are
final.")`. (Do NOT add a reopen transition — dispatch is twice-daily; a wrong completion is handled
by building a new run.)

## 4. Stale `requested` pickups linger forever

A pickup nobody claims stays `requested` past its window — polluting the volunteer board (capped at
100 by B2, but stale entries crowd out fresh ones since board sorts newest-first... verify: stale
YOUNG entries are impossible; the pollution is old windows). Extend the B3 hygiene sweeper
(`src/server/inngest/functions/hygiene.ts`) with one more step: auto-cancel pickups where
`status = 'requested'` AND `window_end < now() - interval '48 hours'` — set status to `cancelled`
via a repo method that ALSO writes a `status_events` row per pickup (actor = the pickup's own
`donor_id`, since `actor_id` FKs to profiles; add a `note`/reason if status_events has a field for
it — check schema; if not, the event row alone is fine) and logs the count. Do NOT touch claimed
pickups (accepted/en_route/picked_up) — a human decision; instead log a `logger.warn` count of
claimed-but-stale (window_end + 72h) pickups as an ops breadcrumb.

## Also in this PR (docs housekeeping)

Commit the untracked `docs/backend/B1-SECURITY-AUDIT.md`, `B2-EFFICIENCY-SPEC.md`,
`B3-NOTIFICATIONS-SPEC.md`, `B4-INTEGRITY-SPEC.md` + the modified `docs/design/UI-SPEC.md`
(staleness banner) as a final `docs:` commit.

## Out of scope

Schema/migrations · reopen transitions · volunteer un-claim flows · payments · anything portal-UI.

## Validation bar

`tsc` + `eslint` (changed files explicit) + `vitest --run` zero new failures. New tests: one per
guard (status-guarded stop mutation, closed-run override, delete-run matrix) + the sweeper's
auto-cancel step (mock repo, assert status_events written), following runActions.test.ts mocking
style. Conventional commits, no Co-Authored-By, no local build, PR to main, do not merge.
