# 11-01 SUMMARY — Intake schema + actions

**Status:** complete

## What was built
- `pickups` table: added `partnerId` (nullable FK → partners), `verifiedAt` (timestamptz), `verifiedBy` (text). Schema + Drizzle migration `0009_intake_columns.sql`.
- `pickupsRepo`: `setPartnerId`, `verify`, `unverify`.
- `createPickup` (INT-01): best-effort back-fill of `partnerId` from the donor's `profiles.partnerId` after create.
- `intakeActions.ts` (INT-02/03): `logSurplus` (admin-gated; partner-validated; donorId=admin, partnerId set, safetyAttested=true), `verifyPickup`, `unverifyPickup` (admin-gated toggles).
- `intakeActions.test.ts`: 9 tests (gate, validation, partner-not-found, happy paths, NOT_FOUND).

## Verification
- `tsc --noEmit` clean; `intakeActions.test.ts` 9/9 green.

## Requirements: INT-01 (backfill), INT-02 (logSurplus), INT-03 (verify columns + actions).
