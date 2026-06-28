# 10-01 SUMMARY — run_pings data layer + DEL-02
Status: complete · tsc 0; 28 tests green. Migration 0008_add_run_pings generated.
Built: run_pings table (mirror location_pings, keyed on runId) + runPingsRepo (insert/latestForRun/purgeForRun) + test; recordRunPing (driver+ownership+active+coord guards) + getLatestRunPing (admin/driver/**volunteer** — checker fix #1) + tests; markStopDone volunteer-on-active-run path (DEL-02); run_pings purge wired into setRunStatus + markStopDone + overrideStopStatus (checker fix #4).
