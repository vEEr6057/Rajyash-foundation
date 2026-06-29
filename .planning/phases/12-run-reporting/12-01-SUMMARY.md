# 12-01 SUMMARY — Reporting data layer + CSV export

**Status:** complete

## What was built
- `reportsRepo` (`src/server/db/repositories/reports.ts`): three single-round-trip group-by aggregates mirroring `impactReport`'s SQL pattern (`.mapWith(Number)`, coalesce, FILTER):
  - `runSummary` — per-run pickup/drop/completed-drop stop counts (NOT meals; no pickup↔run FK).
  - `destinationBreakdown` — completed drop-stop count per destination (null → 'Ad-hoc').
  - `partnerBreakdown` — delivered-pickup servings/kg/count grouped by `pickups.partnerId` (null → 'Unknown partner').
- `reports.test.ts`: 6 tests (shape + null-coalesce passthrough per method).
- `/admin/reports/export` route: admin-gated (`requireRole(["admin"])`, 403 on AuthError), reuses `toCsv`, single combined CSV with three labelled sections + approximation header.

## Verification
- tsc clean; 6/6 reports tests green.

## Requirements: RPT-01 (data + export layer).
