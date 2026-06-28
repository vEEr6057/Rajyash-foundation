# 08-01 SUMMARY — schema + repo + Zod

**Status:** complete · tsc 0, 8 Zod tests pass.

## Built
- `destinations` table in `src/server/db/schema.ts` (id, name, area, lat, lng, city default Ahmedabad, active default true, createdAt, updatedAt) + `Destination`/`NewDestination` types.
- `destinationsRepo` (`src/server/db/repositories/destinations.ts`) — create/getById/list/update/delete, server-only, mirrors partnersRepo.
- `destinationSchema` + `DestinationInput` (`src/features/admin/validations/destination.ts`) + 8 tests.
- `ROUTES.adminDestinations` + `QUERY_KEYS.destinations` in `src/config/constants.ts`.

## Pre-done (recorded, no tasks)
- DRV-01 (driver in ROLES/SELECTABLE_ROLES + onboarding), DEL-01 (proof optional), DRV-02 (volunteer role present; run-link = Phase 9).

## For 08-02
Consumes `destinations` table, `destinationsRepo`, `destinationSchema`, `ROUTES.adminDestinations`, `QUERY_KEYS.destinations`. Migration generate+apply happens in 08-02.
