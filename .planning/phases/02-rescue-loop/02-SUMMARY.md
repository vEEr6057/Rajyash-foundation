# Phase 2: Rescue Loop Core — Summary

**Built:** 2026-06-26 (autonomous) · **Branch:** `feature/phase-2-rescue-loop` (stacked on phase-1)
**Status:** Code complete + verified. DB migration applied live. Supabase Storage key is the one deferred touchpoint.

## What was built
The end-to-end rescue loop — donor posts → volunteer claims → status machine → proof photo.

| Area | Files |
|---|---|
| Schema | `src/server/db/schema.ts` (pickups + status_events + 3 enums), migration `0001_*.sql` **applied to Supabase (RLS on)** |
| Repos | `repositories/pickups.ts` (atomic `claimIfAvailable`, conditional `advance`, owner-scoped edit/cancel), `repositories/statusEvents.ts` |
| Status machine | `features/pickups/lib/statusMachine.ts` (pure) + `VALID_TRANSITIONS` in constants — 11 unit tests |
| Storage | `src/lib/storage.ts` (service-role signed upload/download, server-only) + client compression in `PhotoUploader` |
| Geocoding | `src/lib/geocoding.ts` (Nominatim, free, User-Agent) |
| Server actions | `features/pickups/actions/pickupActions.ts` — create/update/cancel/repost/claim/advance/setProof/requestUpload/geocode; first-line auth + ownership (no IDOR); `force-dynamic` + `revalidatePath` |
| Donor UI | `PickupForm` (RHF+Zod, category/qty/window/address+geocode+draggable pin/safety/photo), pages: list, new, detail, edit |
| Volunteer UI | board (list + map), `ClaimButton`, `StatusAdvanceSection` (proof gates delivery), pages: board, board/map |
| Shared | `PickupStatusPill` (design tokens), `PickupCard`, `MapView`+`MapViewInner` (react-leaflet, dynamic ssr:false), role-based dashboard nav |

## Verification (all green)
`typecheck` ✓ · `lint` ✓ (1 font warning) · `test` ✓ 24 passed · `next build` ✓ 13 routes

## Requirements
DON-01..06 + VOL-01..06 — all covered.

## Decisions / deviations
- Skipped the separate plan-checker + the mock/adapter service layer — Phase 2 is server-first (server components + actions), so data flows via repos in server components per frontend-practices §5 ("server components are the default"). Status machine is the unit-tested core instead.
- Applied the pickups migration **live via Supabase MCP** (not deferred) + enabled RLS (app connects as `postgres` role → bypasses; blocks anon PostgREST to PII).
- Atomic claim via conditional `UPDATE … WHERE status='requested' RETURNING` (0 rows = taken) — no transactions.

## Deferred (one touchpoint)
- **Supabase Storage**: create a private bucket `pickups` + set the real `SUPABASE_SERVICE_ROLE_KEY` (env + Cloudflare secret). Until then, photo upload/preview no-ops gracefully (detail page skips missing images). Everything else (post/claim/status/board/map) works against the live DB.
- Redeploy to Cloudflare (`pnpm run deploy`) to publish Phase 2; add the new secret first.

## Stacked PR
PR #2 base = `feature/phase-1-foundation` (stacked). Rebase onto main when PR #1 merges.
