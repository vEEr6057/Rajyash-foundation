# 09-03 SUMMARY — driver "My Run" UI
Status: complete · tsc 0; 238 tests pass (catalog-parity green; +MarkStopDoneButton test, checker fix #4).
Built: StopStatusPill (reuses status-pill tokens), MarkStopDoneButton (useTransition → markStopDone), RunStopCard (kind badge + address + NavigateButton reuse + StopStatusPill + MarkStopDoneButton), /portal/run page (driver-gated, active-or-planned run, ordered stops, empty states). i18n run.* (portal) + stopStatus.* (common) in en/gu/hi (gu/hi _review pending). common.json added to tracking (checker fix #5).
