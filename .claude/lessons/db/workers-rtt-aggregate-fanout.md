---
id: workers-rtt-aggregate-fanout
topic: db
severity: high
status: verified
tags: [workers, postgres, latency, withTimeout, dashboard, aggregates, round-trips, json_build_object]
related-files: [src/server/db/repositories/stats.ts, src/app/admin/dashboard/page.tsx, src/lib/withTimeout.ts]
created: 2026-07-07
verified-by: wrangler-tail capture + single-statement rewrite; live dashboard went from all-zero to real numbers same deploy
---

## Symptom
Admin dashboard rendered ALL analytics as 0 on live (Workers) for days while list pages worked
and the same queries ran in ~1-2s locally. No visible error — every aggregate was wrapped in
`withTimeout(..., 8000, fallback)` + `.catch(() => zeros)`, so the failure LOOKED like data.

## Root cause
Round-trip arithmetic, not query cost. The page fired ~9 queries; on Workers each request opens
fresh Postgres connections (pool max 5, no cross-request socket reuse) and each query pays
Worker→Supabase cross-region RTT (+TLS setup per connection). ~9 serialized/contended round
trips ≈ 6-10s → straddled the 8s budget → every tile silently fell back to zero. Confirmed by
`wrangler tail`: `withTimeout: dependency exceeded budget — dashboard.overview/trend, ms: 8000`.

## Verified fix
Make the database do the fan-out: ALL dashboard aggregates in ONE statement —
`select json_build_object('pickupAgg', (select json_agg(...)), 'trend', (...), ...)` —
one connection, one round trip (2.2s cold incl. TLS, sub-second warm). Page went from ~9 DB
reads to 3. Keep `withTimeout` as the guard, but treat its fallback rate as an ALARM, not a
feature: if a fallback fires on every request, the page is broken and nobody sees an error.

## Tripwire
On Workers+remote-Postgres, count ROUND TRIPS, not query cost — N parallel cheap queries ≈
N × (RTT + maybe TLS). Multi-aggregate pages get one json_build_object statement. And any
`withTimeout`/`.catch(zeros)` fallback needs a tail check after deploy — silent degradation
reads as "no data" to users and "no error" to developers.
