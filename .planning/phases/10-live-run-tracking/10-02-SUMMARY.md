# 10-02 SUMMARY — client tracking hooks + driver tracker
Status: complete · tsc 0; useRunRoute 4 tests green. getRunRoute added to runActions (moved earlier — checker fix #3, no broken import).
Built: useLiveRunLocation (realtime run-pings + 10s poll fallback, reuses staleness, re-exports LivePosition), RunTracker (driver GPS → recordRunPing, stop-latch), useRunRoute (movement-throttled → getRunRoute) + test, getRunRoute action (next pending stop, OSRM/haversine, admin/driver/volunteer gate).
