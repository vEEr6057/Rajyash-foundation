# Security Review — 2026-07-05 (pre-launch)

Reviewer: Claude Fable 5, single-threaded full-app pass. Scope: dependencies, secrets,
authn/authz + IDOR, payments, RLS/database boundary, injection/XSS, SSRF, abuse/DoS,
CSP/headers. Live database state verified via read-only SQL (not inferred from code).

**Verdict:** application code is solid. The one serious issue is a **latent** database
one — the entire RLS security boundary exists only in the live DB, not in migrations, so
the planned "create a dev Supabase project" / any rebuild would ship a **wide-open**
database. Current production posture is correctly locked. Fix the reproducibility gap
before the env-split task or launch.

## Findings

### HIGH-1 — The RLS boundary is untracked (not in any migration)
The live DB is correctly secured: RLS is **enabled on all 12 public tables**, the browser-read
tables (`location_pings`, `run_pings`) have precise `authenticated`-only SELECT policies, and
the `private.can_view_pickup_pings()` helper is hardened (`SECURITY DEFINER`, empty
`search_path`, `STABLE`). The other 10 tables are RLS-enabled with no policy = default-deny
(only the service-role key, used server-side, reads them).

**But none of this is in the repo.** `grep` across all migrations finds zero `ENABLE ROW LEVEL
SECURITY`, zero `CREATE POLICY`, zero function DDL. It was applied out-of-band (dashboard /
ad-hoc SQL). Consequences:
- **The anon role has default FULL grants** (SELECT/INSERT/UPDATE/DELETE) on every table —
  confirmed. RLS is the ONLY thing standing between the public anon key (shipped in the client
  bundle) and every donor/volunteer/recipient/donation record.
- Rebuilding from migrations (the env-split task creates a fresh dev project; a prod restore
  would too) runs `drizzle-kit migrate` which knows nothing about RLS → tables created with
  RLS **off** and anon full grants → **complete data breach on the new project.**
- Drizzle does not manage RLS; `drizzle-kit generate` will never capture it.
- Violates the project's own rule "schema changes via migration, reviewed in PR" — the most
  security-critical schema is entirely unreviewed and unversioned.

**Fix:** author a committed SQL migration that reproduces the live setup exactly (enable RLS
per table, the two ping policies, the helper function, and an explicit `revoke`/grant posture),
and make it part of the baseline any new project applies. Source of truth to copy is the live
DB (queried in this review). Verify by creating the dev project and confirming anon reads
return zero rows.

### HIGH-2 — CLAUDE.md documents the opposite of reality ("no RLS")
`CLAUDE.md` Constraints: *"Single-tenant — deliberately no multi-tenancy/RLS."* This is false
and dangerous: RLS is present and load-bearing. It misled THIS review's first pass (assumed no
RLS) and would mislead anyone building the RLS migration for HIGH-1. **Fix:** correct the line
to state RLS IS used to gate the anon/authenticated Supabase roles (single-tenant refers to one
org, not absence of RLS).

### MED-1 — `createDonationOrder` is unauthenticated with no rate limit
Public donation is intentional (no account needed) — but the action mints a Razorpay order +
inserts a `donations` row on every call with no throttle or CAPTCHA. An unauthenticated script
can flood: `donations` table growth (500 MB free cap), Razorpay order-quota burn, and Worker
request exhaustion (100k/day free = DoS + the kill switch is the only lever). **Fix:** add
Cloudflare Turnstile to the donate form (free; `challenges.cloudflare.com` is already in the CSP
allowlist) and verify the token server-side in the action before minting. Keep it
unauthenticated — Turnstile, not login.

### MED-2 — CSP is report-only; never enforcing
`middleware.ts` sets `Content-Security-Policy-Report-Only` with `script-src 'unsafe-inline'
'unsafe-eval'`. Report-only provides **zero** XSS protection — it only logs. Known-deferred, but
launch is now. **Fix:** tighten (drop `unsafe-eval` if the bundle allows; move to nonce/hash for
inline) and flip to enforcing `Content-Security-Policy` before serving the real domain. Do it
on a canary deploy — CSP breakage is high-blast-radius.

### LOW-1 — `/api/client-error` has no server-side rate limit
The client reporter caps 5/page-load, but that's bypassable by POSTing the endpoint directly.
8 KB body cap exists; no per-isolate flood guard. Could spam Workers Logs / burn requests.
**Fix:** copy the `csp-report` route's pattern — a `MAX_LOGS_PER_ISOLATE` counter.

### LOW-2 — `resolveShortMapsUrl` follows redirects (blind SSRF surface)
Input is constrained to `maps.app.goo.gl`/`goo.gl/maps`, the response body is never read (only
`res.url`), and `global_fetch_strictly_public` blocks private-range fetches. Residual: the
shortener's redirect can point the server-side fetch at any **public** URL. Low. **Fix (optional):**
after redirect, assert the final host is a google.com maps host before trusting; reject otherwise.

## Verified clean (positives)
- `pnpm audit --prod`: no known vulnerabilities. Two version-pinned overrides already in place.
- No secrets in git history; `.env*` gitignored (`.env.example` only tracked); no hardcoded
  live keys in `src` (only `whsec_test` fixtures).
- Photo access: pickup detail page gates ownership/visibility BEFORE minting signed download
  URLs — no photo IDOR. Signed-upload paths are server-composed (no user-supplied path segment).
- Razorpay webhook: constant-time HMAC compare (WebCrypto), atomic idempotency, amount
  verification (added #87), paid-downgrade guard (added #84).
- Server actions: role + ownership re-checked server-side; authz values never from request body.
- No `eval`/`new Function`. Both `dangerouslySetInnerHTML` uses are static (JSON-LD, `__name`
  polyfill) — no user data.
- Security headers set (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy).

## Priority order for launch
1. HIGH-1 RLS migration (blocks the env-split task — do FIRST).
2. HIGH-2 CLAUDE.md correction (5 min; prevents the next person re-misunderstanding).
3. MED-1 Turnstile on donations (before live payments).
4. MED-2 CSP enforcing (canary deploy before/at cutover).
5. LOW-1, LOW-2 (fast follow).
