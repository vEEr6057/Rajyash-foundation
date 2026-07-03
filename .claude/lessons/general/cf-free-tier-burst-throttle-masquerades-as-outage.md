# CF "Worker exceeded resource limits" can be client-scoped throttling, not an app bug

**2026-07-03 · general/MEDIUM/verified**

## Symptom
Mid-way through an automated Playwright sweep (rapid-fire SSR page loads across roles), every
subsequent page — including `/sign-in` and even `/robots.txt` — returned Cloudflare's
"Worker exceeded resource limits" (503, `no-store`). Looked exactly like a total prod outage /
CPU regression. Meanwhile `curl`/PowerShell from the same machine got 200s.

## Root cause
Workers free tier (10ms CPU/request) + a bursting client. After enough over-budget requests in a
short window, Cloudflare serves the resource-limits 503 to **that client's browser instance**
(sticky per context/connection) while the origin stays healthy for everyone else. A brand-new
`browser.newContext()` immediately got 200 on the same routes; the old context kept getting 503
even after `clearCookies()` and cache-busting query strings.

## How to diagnose (5 minutes, not an hour)
1. `curl -I` / PowerShell `Invoke-WebRequest` the same URL — 200 means origin is up.
2. Same-page `fetch('/robots.txt', {credentials:'omit'})` vs a full navigation — split result
   confirms client-scoped, not route-scoped.
3. Playwright: `browser.newContext()` → 200 ⇒ throttle is pinned to the old context. Not an app bug.
4. Only if a FRESH context + fresh sign-in still 503s is it a real capacity/regression problem.

## Fix / prevention
- Pace automated sweeps: ≥800ms between SSR navigations, reuse one session per role, don't
  re-sign-in per page.
- QA agents must not diagnose "backend N+1 / admin panel down" from in-browser 503s alone —
  require the fresh-context cross-check first.
- Real capacity note: heavy admin SSR pages sit close to the 10ms free-tier CPU budget; bursts
  from a single user CAN trip this. Revisit if real coordinators ever see it outside automation.
