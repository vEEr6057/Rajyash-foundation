# B2 — Query efficiency + Workers CPU budget (build contract)

**Status:** LOCKED. Findings from the B2 audit (Fable, 2026-07-04) + B1 hardening notes 2 & 4
([B1-SECURITY-AUDIT.md](B1-SECURITY-AUDIT.md)). Context: Cloudflare Workers free tier = 10ms CPU per
request; the audit-burst throttling incident showed heavy SSR paths sit near the ceiling.
**Baseline is healthy** — `stats.ts` (parallel GROUP BY fan-out), `reports.ts` (JOIN+GROUP BY),
`listForAdminPaged` (parallel page+count), and index coverage are all correct. This batch fixes the
five deviations found.

## 1. Runs page N+1 (`src/app/admin/runs/page.tsx:33-35`)

`runs.map(r => runStopsRepo.getByRunId(r.id).then(s => s.length))` fetches FULL stop rows per run to
count them — N queries, N result sets. Fix: new `runStopsRepo.countByRunIds(runIds: string[])` →
single `select runId, count(*) group by run_id where run_id in (...)` returning
`Record<string, number>`; page consumes it. (Mirror the count-filter pattern in
`reportsRepo.runSummary`.) `getByRunId` keeps its other callers.

## 2. Whole-profiles fetch for a dropdown (`src/app/admin/runs/page.tsx:26-32`)

`profilesRepo.listAll()` pulls the entire profiles table to derive (a) active drivers, (b) a
driver-name map. Fix: `profilesRepo.listByRole(role)` (WHERE role = $1 AND deactivated_at IS NULL) —
drivers list serves both uses (only driver ids ever appear in `runs.driverId`). Check other
`listAll()` call sites (grep) — apply the same where a single role is wanted; leave genuine
all-user screens (admin/users) alone.

## 3. Unbounded list caps (defensive, display unchanged today)

Add sensible LIMITs — these tables grow monotonically and each row is SSR-serialized:
- `pickupsRepo.listOpen()` → LIMIT 100 (board never usefully shows more)
- `pickupsRepo.listByDonor()` / `listByVolunteer()` → LIMIT 100, newest-first (already sorted)
- `runsRepo.listRuns()` → LIMIT 100, newest-first
No pagination UI in this batch — cap only. Add a one-line comment on each: cap exists for the
Workers CPU budget; paginate when an owner actually exceeds it.

## 4. GPS ping rate floor (B1 note 2)

`recordPing` / `recordRunPing`: reject (silently succeed, `{ok:true}` — the client must not retry a
throttled ping) when the newest existing ping for that pickup/run is **< 5 seconds old**. Implement
in the repo as ONE statement — `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM pings WHERE
pickup_id = $1 AND created_at > now() - interval '5 seconds')` — not read-then-write. Existing
`(pickupId, createdAt desc)` / `(runId, createdAt desc)` indexes make the guard cheap. Add one unit
test per repo (insert, immediate second insert → row count stays 1).

## 5. Nominatim throttle + memo (B1 note 4)

`src/lib/geocoding.ts`: (a) module-level in-memory memo `Map<normalizedQuery, result>` (cap ~100
entries, FIFO evict) — repeated Find clicks and identical addresses skip the network; (b) module-level
`lastCallAt` — if the last Nominatim call was < 1s ago, `await` the difference before fetching
(Nominatim ToS ≤1 rps). Per-isolate best effort is acceptable — document that in a comment (a global
limiter needs a DO/KV and isn't warranted at this volume).

## Out of scope

Schema/index changes (coverage verified adequate) · pagination UI · caching layers (KV/DO) ·
`markStopDone`'s single-run stop refetch (bounded, fine) · anything in `stats.ts`/`reports.ts`.

## Validation bar

`tsc --noEmit` + `eslint` (changed ts files) + `vitest --run` zero new failures (8 known env-flaky).
New tests: countByRunIds shape, ping rate-floor (×2), geocode memo hit (mock fetch, assert single
call). Conventional commits, no Co-Authored-By, no local build (opennext Windows bug), PR to main,
do not merge.
