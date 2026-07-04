# B1 — Server-action security audit

**Date:** 2026-07-04 · **Auditor:** Fable (design/judgement pass, code-level)
**Scope:** every exported server action (8 modules, 40 actions), the session layer, ownership
predicates in repositories, env validation, Inngest endpoint auth.
**Verdict: STRONG. Zero critical findings. No IDOR paths found.** Four hardening notes below.

## What was verified

| Check | Result |
|---|---|
| Session guard first line of every action | ✓ all 40 — `requireRole`/`requireUser`/`getSession` before any work (`adminActions` 9/9, `runActions` 12/12, `pickupActions` 11/11, `intakeActions` 3/3, `destinationActions` 4/4, `runPingActions` 2/2, `notificationActions` 6/6, `onboardingActions` 1/1) |
| Ownership enforced in SQL, not just JS | ✓ repo predicates carry the owner in the WHERE (`updateIfRequested(id, donorId)`, `claimIfAvailable`, `advance(id, userId, from, to)`, `notifications.markRead(id, userId)`) — no read-then-write races on ownership |
| Server-side re-validation | ✓ Zod `safeParse` on every mutating action; status transitions via `statusMachine`/`canTransition` server-side; GPS coordinates range-validated incl. NaN/Infinity |
| Deactivated users | ✓ `getSession` re-reads `deactivatedAt` per request (fail-open on DB blip — documented trade-off; `banUser` also revokes Clerk-side) |
| Tracking privacy | ✓ pings write-path triple-guarded (role + assigned-to-this-pickup + active status); read-path gated to donor-owner/admin; trails purged on delivered/cancelled (TRK-04/05) |
| Uploads | ✓ signed-upload paths namespaced `kind/userId/uuid.jpg` — no client-controlled path |
| Inngest endpoint | ✓ `signingKey` enforced (`INNGEST_SIGNING_KEY` required by env schema) — public route is signature-verified |
| Env | ✓ Zod schema refuses boot on missing/invalid values (`sk_` prefix checks etc.) |
| Middleware | ✓ defence-in-depth: pages/actions never trust middleware alone (per CVE-2025-29927 note in session.ts) |

## Hardening notes (none blocking; fold into B2/B4 batches)

1. **Volunteer-wide run reads (accepted by design, revisit at DRV-02).** `getRunRoute` /
   `getLatestRunPing` allow ANY volunteer to view any run's live location; `markStopDone` lets any
   volunteer complete a stop on any ACTIVE run. Matches DEL-02 ("any volunteer present confirms the
   drop") in a single-org NGO. When runs gain attached volunteers (DRV-02, Phase 9), tighten to
   attached-volunteer-or-admin.
2. **No rate limiting on ping writes.** `recordPing`/`recordRunPing` accept unbounded inserts from an
   assigned volunteer/driver. Bounded exposure (only own active pickup/run, trail purged at end), but a
   stuck client could spam rows + Worker invocations. Cheap fix: server-side floor (ignore pings <5s
   apart per pickup) in the repo insert. → B2.
3. **`getSession` fail-open on profile read.** Deliberate (availability over strictness for
   soft-deactivation). Fine while `banUser` also revokes tokens — keep the pairing invariant
   documented next to banUser so a future refactor doesn't drop the Clerk-side revoke. → B4 docs.
4. **`geocodePickupAddress`/`resolvePickupLocation` proxy to Nominatim per call** — third-party fetch
   fan-out under auth but no per-user throttle; Nominatim ToS wants ≤1 rps. Cheap in-Worker debounce or
   cache-by-input. → B2.

## Explicitly out of scope / N-A

Razorpay webhook HMAC (payments parked — MUST be verified when Phase 5 unparks), Supabase RLS on
realtime reads (existing SELECT policy mirrors `getLatestPing` gating — verified earlier phases),
multi-tenancy (single org by design).
