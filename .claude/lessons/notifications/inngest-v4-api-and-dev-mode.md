---
id: inngest-v4-api-and-dev-mode
topic: notifications
severity: high
status: verified
tags: [inngest, dev-mode, workers, opennext, createFunction, INNGEST_DEV, e2e]
related-files: [src/server/inngest/client.ts, src/server/inngest/functions/notify.ts, src/app/api/inngest/route.ts]
created: 2026-06-26
verified-by: Phase 4 E2E — full event->fn->notification pipeline ran on inngest-cli dev
---

## Symptom (two distinct walls)
1. **Typecheck**: `Module '"inngest"' has no exported member 'EventSchemas'` and
   `createFunction` → "Expected 2 arguments, but got 3" + handler params implicitly `any`.
2. **Runtime/E2E**: `inngest-cli dev` never executed functions. `PUT /api/inngest` returned
   *"Cannot deploy localhost functions to production. Please use a forwarder like ngrok"* and
   `GET /api/inngest` returned `{"message":"Unauthorized"}`.

## Root cause
- **Inngest v4 API differs from v3** (the version most pretraining + many tutorials assume):
  `EventSchemas` is removed; `inngest.createFunction(options, handler)` is **2-arg** with the
  triggers + `idempotency` living INSIDE the options object (not a separate 2nd arg).
- The SDK ran in **production mode** because an explicit `signingKey` was set. In prod mode it
  tries to register with Inngest **Cloud** (rejecting a localhost URL) and the serve handler
  requires a signed request — so the local `inngest-cli dev` could never sync/execute.

## Verified fix
- Client: `new Inngest({ id, eventKey, signingKey })` — drop `EventSchemas`/`schemas`
  (events go untyped; validate payloads with your own pure functions instead).
- Function: triggers + idempotency in the options object:
  ```ts
  inngest.createFunction(
    { id, retries, idempotency: "event.data.eventId", triggers: [{ event: "..." }, ...] },
    async ({ event, step }) => { ... },
  );
  ```
- Local dev: set **`INNGEST_DEV=1`** in `.env.local` (or `INNGEST_DEV=http://localhost:8288`).
  Forces dev mode → SDK talks to `inngest-cli dev` (no signature, no Cloud). Confirm via
  `GET /api/inngest` → `{"mode":"dev","function_count":N}`. **NEVER set `INNGEST_DEV` in prod.**
- Run order: `pnpm dev` (with INNGEST_DEV) first, THEN
  `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest --no-discovery`.

## Tripwire
On Inngest: assume **v4** API (2-arg createFunction, no EventSchemas). If `inngest-cli dev`
won't run functions and you see "Cannot deploy localhost to production", the SDK is in prod
mode — set `INNGEST_DEV`. Events reaching the dev server but no notification = check the
function synced (`GET /api/inngest` mode:dev). Related: [[inngest-dev-flood-corrupts-next]].
