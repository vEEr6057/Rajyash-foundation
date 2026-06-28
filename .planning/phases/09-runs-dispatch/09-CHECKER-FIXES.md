# Phase 9 — plan-checker fixes to apply during execution

The gsd-plan-checker passed coverage/deps/scope but flagged 3 blockers + 2 warnings. Apply these
while executing (the plans are otherwise sound):

## Blockers
1. **RUN-04 reorder needs a UI caller.** `reorderStops` action + `runStopsRepo.reorder` exist but no
   component calls them. In `StopList.tsx` (09-04) add up/down (↑/↓) seq buttons per stop that call
   `reorderStops(runId, orderedStopIds)`. Otherwise RUN-04 is not delivered.
2. **`geocodeDestinationAddress` signature.** It returns `Promise<{lat:number;lng:number}|null>`, NOT a
   `Result`. In `addDropStop` (09-02) use: `const geo = await geocodeDestinationAddress(d.address); if (!geo) return fail("GEOCODE_FAILED","Address could not be geocoded."); lat = geo.lat; lng = geo.lng;`
   (no `.ok`).
3. **`editRun` dynamic-import hack.** Add `runsRepo.update(id, fields: Partial<NewRun>)` to `runs.ts`
   (09-01, mirror destinationsRepo.update) and call it from `editRun` — drop the inline `await import(...)`.

## Warnings
4. Add a `MarkStopDoneButton` component test (status!=='pending' → null; loading; error) per testing-practices.
5. Add the 3 `common.json` files (en/gu/hi) to 09-03's `files_modified` (stopStatus/runStatus keys land there).
