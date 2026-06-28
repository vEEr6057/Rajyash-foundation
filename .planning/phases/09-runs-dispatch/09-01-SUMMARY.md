# 09-01 SUMMARY — schema + status machine + repos
Status: complete · tsc 0, 11 runStatusMachine tests pass.
Built: 4 pgEnums (run_status/run_slot/stop_kind/stop_status), `runs` + `run_stops` tables (+types), RUN_*/STOP_* constants + transitions, ROUTES.adminRuns/adminRun/driverRun, QUERY_KEYS.runs/run/myRun, runStatusMachine (canRun/Stop, nextRun/Stop, allStopsDone) + tests, runsRepo (+update, per checker fix), runStopsRepo (add/getByRunId/getById/remove/reorder/setStopStatus).
For 09-02: actions consume these. geocodeDestinationAddress returns {lat,lng}|null (not Result) — checker fix #2.
