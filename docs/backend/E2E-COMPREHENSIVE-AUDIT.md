# Comprehensive E2E audit — 2026-07-04

Full-app audit-only run: every page × light+dark × EN/GU/HI × all personas × all functions. 3 parallel
Sonnet agents (public+auth, donor+volunteer, driver+admin), every load-bearing finding then
re-verified by Fable against source/live before inclusion.

## Verdict

**The app is functionally solid end-to-end. Zero blockers, zero real breakage.** Every core flow
completed on live prod: donor post/edit/repost/cancel; volunteer claim → all 4 statuses (proof
optional); driver run → mark done → complete; admin dashboard/pickups(filter/sort/paginate)/run
build+stops+status/destinations/partners/users/reports+CSV/surplus. i18n coverage is genuinely strong
in GU/HI. The findings below are polish, not function.

## Verified-real findings (ranked)

| # | Sev | Area | Finding | Fix owner |
|---|-----|------|---------|-----------|
| 1 | Med | Analytics/infra | CF Web Analytics beacon loads (200) but its RUM POST to `cloudflareinsights.com/cdn-cgi/rum` fails (`net::ERR_FAILED`) — collects nothing + a console error on every page. The JS beacon needs a proxied CF **zone** (custom domain); doesn't work on `*.workers.dev`. | Owner (real domain) — or remove the beacon until then |
| 2 | Med | Auth i18n | Clerk sign-in/staff card header "Welcome back" / "Sign in to continue" stays English under **HI** (the custom `signIn.start` override wins over the hiIN package). Sign-**up** header IS translated. | Code (drop/localize the override) |
| 3 | Low-Med | i18n | Date/time strings keep English month abbreviations ("29 Jun, 6:46 pm") under GU/HI across pickup cards/detail/history. | Code (localize the date formatter per locale) |
| 4 | Low | SEO/monitoring | `/donate` (flag-off) and `/admin/surplus/new` return HTTP **200**, not 404, on their soft-fallthrough (correct UI, wrong status). | Code (return real 404) or accept |
| 5 | Low | Reports | Same-month date-range label renders "1–Jul 4, 2026" (should be "Jul 1 – 4, 2026") — `reports/page.tsx:98` compact branch. | Code |
| 6 | Low | Admin filters | Pickups "Clear" navigates to the unfiltered URL (data resets) but doesn't reset the local `useState`, so the status `<select>` stays visually stuck on the old value. | Code (`AdminPickupFilters.tsx` — reset state on clear) |
| 7 | Low | a11y/mobile | Header locale/theme/avatar buttons are ~24–36px, below the 44px touch-target guideline. | Code |
| 8 | Low | Admin UX | The run driver-picker shows two identically-named "QA Driver" seed accounts with no disambiguation (caused a mis-pick during the audit). Test-data artifact; real drivers have distinct names, but the picker could show more. | Data (test seed) / minor code |

## Dismissed — agent findings that did NOT survive verification

- **"Stale UI / stuck loading after Mark done + Set Active" (rated Med)** → NOT a bug. Every mutation
  button (`MarkStopDoneButton:44`, `RunStatusControls:41`, `StopList`, `AddStopForm`) already calls
  `router.refresh()` in a `useTransition`. The stuck spinner was that RSC re-fetch throttled by 3
  concurrent audit agents hammering the free-tier Worker (the donor+volunteer agent independently
  noted the same throttle lag). Correct code.
- **"No Navigate button on the driver current-stop" (rated Med)** → NOT a bug. `run/page.tsx:117`
  renders `<NavigateButton>` conditionally on `currentStop.lat/lng`; the agent's self-created test run
  had a coordless stop. Renders normally when the stop has coordinates.
- **"Sortable headers never set aria-sort" (rated Low a11y)** → FALSE. `PickupsTable.tsx:93` sets
  `aria-sort` correctly (none/ascending/descending).
- Several "broken" pagination / add-stop / reorder clicks → the agent itself confirmed these as
  test-harness artifacts (worked on real click / reload).
- The `cloudflareinsights` CORS console line is the only recurring console entry — it's finding #1, not
  separate noise. No `MISSING_MESSAGE` / `IntlError` anywhere. The earlier `upgrade-insecure-requests`
  console error is gone (PR #75 fix holding).

## Translation-gap list (GU + HI)

Coverage is strong — status pills, quantity units, categories, "Unassigned", "Unknown partner"
fallback, nav, footer, homepage, privacy all localized; both scripts render cleanly (no tofu). The
only real gaps: **(a)** date/time month abbreviations stay English ("29 Jun") — finding #3;
**(b)** the Clerk sign-in card header under HI — finding #2; **(c)** the Clerk card is fully English
under GU (no guIN package — known/accepted). Everything else that's still English is proper nouns
(place names, "Rajyash Foundation") — correct.

## Recommendation

A single small **audit-fix batch** clears the code items (2–7): localize the Clerk sign-in header +
the date formatter, real 404s for the flag-off routes, the reports label, the clear-filter reset, and
the header tap-targets. Finding #1 (analytics) and the GU Clerk card are owner/infra. None is urgent —
the app works end-to-end today.
