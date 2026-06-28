# 09-04 SUMMARY — coordinator dispatch UI + migration
Status: complete · tsc 0, lint 0, 238 tests pass. Migration 0007 applied to prod Supabase.
Built: RunStatusPill, RunCard, BuildRunForm, StopList (with reorder ↑/↓ — checker fix #1), AddStopForm (kind + saved/adhoc toggles; no shadcn Tabs — not installed), RunStatusControls; /admin/runs (list), /admin/runs/new (create), /admin/runs/[id] (detail + stops + add + status controls); admin dashboard "Dispatch Runs" card; i18n runs.* (admin) + runStatus.* (common) en/gu/hi; migration 0007 (4 enums + runs + run_stops + FKs + indexes) applied.
