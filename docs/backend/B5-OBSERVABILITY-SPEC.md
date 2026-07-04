# B5 — Observability (build contract)

**Status:** LOCKED (Fable audit, 2026-07-04).
**Audit verdict:** logging discipline is perfect (structured JSON `logger`, zero bare `console.*`
in `src/`), action errors are consistently logged at boundaries, Inngest failures covered by B3's
`onFailure`. The gap: nothing PERSISTS — Workers console output is ephemeral (`wrangler tail` only),
client-side errors vanish entirely, CSP reports go nowhere. Five small items, all free-tier.

## 1. Cloudflare Workers Logs (zero code — the big win)

`wrangler.jsonc`: add
```jsonc
"observability": { "enabled": true, "head_sampling_rate": 1 }
```
Free plan: persistent, queryable invocation logs (3-day retention). Every existing `logger.*` JSON
line becomes searchable in the dashboard. Note in the PR body that it takes effect on next deploy;
no dashboard action needed.

## 2. `/api/health` (uptime probe target)

Route handler `src/app/api/health/route.ts`: `GET` → `SELECT 1` through the existing db client +
return `{ ok: true, ts }` (200) or `{ ok: false }` (503) — nothing else (no versions, no env echo).
`export const dynamic = "force-dynamic"`. Add to `isPublicRoute` in `src/middleware.ts`. Owner will
point free UptimeRobot at it (ops task, note in PR).

## 3. Client-error reporting (error boundaries currently swallow everything)

New server action `reportClientError(input: { message: string; digest?: string; url?: string })`:
- No auth required (public pages error too) — but hard caps: message ≤ 500 chars, digest ≤ 100,
  url ≤ 300; strings coerced/truncated, then `logger.error("client-error", {...})`. No DB writes —
  log-only (Workers Logs persists it). Zod-validate; on invalid input just return `{ok:false}`.
- Wire into `src/app/error.tsx` AND `global-error.tsx` (if present): fire-and-forget on mount
  (useEffect, once), keep the existing retry UI untouched.

## 4. CSP report collector (report-only header currently reports to nowhere)

- Route `src/app/api/csp-report/route.ts`: `POST` → parse the report (both `application/csp-report`
  and `application/reports+json` shapes defensively), `logger.warn("csp-violation", { blockedUri,
  violatedDirective, documentUri })` — truncate fields, tolerate garbage bodies (204 always).
  Module-level counter: after 50 logs per isolate, stop logging (flood guard).
- `src/middleware.ts`: append `report-uri /api/csp-report` to `CSP_REPORT_ONLY`; add the route to
  `isPublicRoute` AND ensure the middleware doesn't redirect POSTs to it.
- (Enforcement flip stays P2 — after a clean week in Workers Logs.)

## 5. Cloudflare Web Analytics beacon (clears the pending P1 standards item)

Root layout: render `<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
data-cf-beacon='{"token": "..."}' />` ONLY when `NEXT_PUBLIC_CF_BEACON_TOKEN` is set (add to
`src/config/env.ts` as optional). Cookieless, free. NOTE for middleware/CSP: add
`static.cloudflareinsights.com` to the CSP script-src + connect-src in the report-only header.
Owner creates the Web Analytics site in the CF dashboard and sets the secret (PR body: exact
instruction + `wrangler secret`/dashboard env var name... it's NEXT_PUBLIC_* → build-time env in the
GitHub Action — instruct adding it to the repo's Actions variables).

## Out of scope

Sentry/external APM (Workers Logs suffices at this scale) · paid Logpush · alerting rules ·
CSP enforcement flip · uptime-monitor account creation (owner).

## Validation bar

`tsc` + `eslint` (changed files explicit) + `vitest --run` zero new failures. Tests: the two route
handlers (health 200/503 with mocked db; csp-report tolerates garbage), reportClientError caps
(oversize input truncated, invalid input safe). Conventional commits, no Co-Authored-By, no local
build, PR to main, do not merge.
