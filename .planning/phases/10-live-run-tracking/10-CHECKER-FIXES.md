# Phase 10 — plan-checker fixes to apply during execution
1. **TRK-05 watcher scope:** relax getLatestRunPing to allow admin + driver(own run) + **volunteer (any)**; add run.liveMap to /portal/run (driver) + /admin/runs/[id] (coordinator). Restaurant-specific watcher page deferred (multi-partner run — fuzzy; note as deferred).
2. **run_pings infra:** apply migration via Supabase MCP, add `run_pings` to the `supabase_realtime` publication, set RLS (mirror location_pings) — else realtime never fires.
3. **No broken typecheck:** create `getRunRoute` in runActions BEFORE `useRunRoute` consumes it (execution order; single typecheck at phase end).
4. **Purge leak:** add `runPingsRepo.purgeForRun` to `overrideStopStatus`'s auto-complete path too (not just markStopDone + setRunStatus).
5. **RunLiveMap i18n:** keep useTranslations("portal") + put run.liveMap.* keys in portal.json (all locales) — next-intl loads any namespace regardless of route, so no mismatch.
6. (warnings) add light useLiveRunLocation / RunTracker tests if cheap; catalog-parity covered by the suite.
