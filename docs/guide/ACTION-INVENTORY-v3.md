# Action Inventory v3 — Rajyash Food Porter

Exhaustive, code-verified inventory of every action each persona can perform, read off
`main` at commit `4885552` (`feat(runs): stop status audit trail (stop_status_events) +
full admin history (#109)`), which already includes invite-provisioning (#107), UX wave-1
(#106), and UX wave-2 (#108). Read-only audit — nothing in the app was changed to produce
this.

**Source-of-truth note:** the task that produced this doc pointed at
`docs/specs/handbook-refresh-v3.md` for the "Phase A" item list. That file does not exist
in this repo (checked working tree + `git log --all`). The closest equivalent —
`docs/specs/ux-improvements-v1.md` — carries the full UX-1..19 spec text and was used
instead; every item in it is cross-checked against code below. If a `handbook-refresh-v3.md`
spec is added later, re-diff this doc against it.

**Conventions** (same as v1 — [`ACTION-INVENTORY.md`](./ACTION-INVENTORY.md)):
- **FormSheet** = the shared slide-over sheet (`src/components/forms` `FormSheet`) hosting a
  form in place. Legacy standalone `/…/new` routes (`portal/pickups/new`, `admin/runs/new`,
  `admin/surplus/new`) are now permanent redirects to the list page where the sheet lives.
- **ConfirmDialog** = the shared confirm/cancel modal (`src/components/ui/confirm-dialog`).
- **Guard** column cites the server-side check by file:line — every action re-verifies its
  own auth (middleware, `src/middleware.ts`, is defense-in-depth only, AUTH-05).
- **Since** column tags the wave that introduced/changed the action: `baseline` (pre-existing,
  dispatch-model-v2 / v1 handbook era), `UX-1`…`UX-19`, `#107` (invite provisioning), `#109`
  (stop-status audit trail).

Operating model verified in code: **drivers collect** (`claimPickup`/`advancePickup` both
gate `requireRole(["driver"])`, `pickupActions.ts:47-49`); **volunteers distribute** (they
never claim a pickup — `PickupCard.tsx:30` only shows the claim control for
`role === "driver"`; volunteers instead confirm drops on active runs via `markStopDone`,
which explicitly allows `isVolunteer && run.status === "active"`, `runActions.ts:318-321`).

---

## Action counts per persona

| Persona | Actions |
|---|---|
| Public visitor | 11 |
| Onboarding (first sign-in) | 2 |
| Cross-persona (any signed-in user) | 5 |
| Donor | 12 |
| Volunteer | 7 |
| Driver | 11 |
| Admin / staff | 34 |
| **Total distinct actions** | **82** |

(Counts are of distinct user-facing actions, not server-action functions — some server
actions power more than one UI entry point. Up from 66 in v1: +12 admin — invite fields,
bulk assign, users search/filter, assign/edit-run-on-existing-run, admin pickup/run
history, destination active toggle; +3 donor — repeat-last, status timeline, delivery
proof-back; +2 driver — call, navigate (sticky-advance and distance-chip are UX to an
existing action, not new actions); +1 volunteer — distributions map is UX to an existing
list, landing rebalance is UX to the dashboard; +1 cross — notification bell now has an
entry point.)

---

## Public visitor

| Action | Where (route + control) | Server action / guard | Ownership/authz rule | Outcome | Since |
|---|---|---|---|---|---|
| Browse "What we do" / programs | `/` → header nav "What we do" or scroll | — (static) | none — public route (`middleware.ts:5`) | anchor-scroll to `#programs` | baseline |
| Browse impact ledger | `/` → header nav "Impact" or scroll | `getCachedImpactReport()` (read) | none | `LedgerImpact` renders all-time totals | baseline |
| Open mobile menu | `/` → hamburger icon (header, <md) | — | none | `PublicMobileMenu.tsx` sheet: nav + language + theme + auth links | baseline |
| Switch language | any public page → EN/ગુ/હિ pills | `setLocaleCookieAction` (`src/features/public/actions/setLocale.ts:12`) | allowlist gate only (`SUPPORTED_LOCALES.includes`, line 14) — no auth required | cookie set, layout revalidated | baseline |
| Switch theme | any public page → sun/moon icon | — (client `next-themes`) | none | flips `<html class="dark">` | baseline |
| Become a volunteer/donor/driver | `/` → "Become a volunteer" CTA (hero/nav/finale) | — | none | → `/sign-up?role=X` → `/onboarding?role=X` | baseline |
| Sign up | `/` or nav → "Sign up" | Clerk `<SignUp>` (external) | Clerk-managed | → onboarding | baseline |
| Sign in | `/` or nav → "Sign in" | Clerk `<SignIn>` (external) | Clerk-managed | → `/portal/dashboard` | baseline |
| Staff sign in | Footer → "Staff sign-in" | Clerk `<SignIn>`, staff-branded copy, route `/staff` (public per `middleware.ts:11`) | role still enforced server-side on `/admin/*` (`middleware.ts:90-93`) | → `/admin/dashboard` | baseline |
| Donate (money) | `/` or footer → "Donate" — **only rendered when `PAYMENTS_ENABLED`** | `createDonationOrder` (`donationActions.ts:30-73`) | unauthenticated; gated by `env.PAYMENTS_ENABLED` (line 34-36) + Turnstile bot-check (`verifyTurnstile`, line 46-50) before any DB write; webhook (HMAC, not this action) is the sole writer of `status:'paid'` | mints Razorpay order, opens Checkout modal | baseline |
| View legal pages | Footer → Privacy/Terms/Refund | — (static) | public routes (`middleware.ts:6-8`, Razorpay website-compliance requirement) | 8-section prose pages | baseline (#87) |

## Onboarding (first sign-in, non-admin-invited)

| Action | Where | Server action / guard | Ownership/authz rule | Outcome | Since |
|---|---|---|---|---|---|
| Pick a role | `/onboarding` → 3-card picker (Donor/Volunteer/Driver) | — (client state) | role re-validated server-side in `completeOnboarding` regardless of what the client sends (never admin-selectable here) | pre-selected from `?role=` or hidden entirely for admin-invited users | baseline |
| Complete profile | `/onboarding` → name/phone(optional)/city → Submit | `completeOnboarding` (`onboardingActions.ts:25-94`) | `requireUser()` (line 30); admin role is preserved, never demoted by this form even if reached (`isExistingAdmin` check, lines 60-61) | Clerk metadata + DB profile row written; → dashboard | baseline |

**Note (dead-path, not a bug):** an admin-invited user (via `inviteUser`, #107) now never
reaches this page at all — the middleware onboarding gate redirects them straight to
`/portal/dashboard`/`/admin/dashboard` because `inviteUser` stamps
`onboardingComplete: true` at invite time (`adminActions.ts:255`), and their profile row is
lazily provisioned by `ensureInvitedProfile` on first authed request
(`src/server/auth/session.ts:35-71`, called from `getSession` at lines 88-94). The
`isAdminInvite`/`defaultRole`-from-session branches in `src/app/onboarding/page.tsx:26-37`
are explicitly commented as "effectively unreachable dead paths ... left in place as a
harmless fallback" — see Open gaps.

## Cross-persona (any signed-in user)

| Action | Where | Server action / guard | Ownership/authz rule | Outcome | Since |
|---|---|---|---|---|---|
| Switch language | `AuthedHeader`, every portal/admin page → pills | `setLocaleCookieAction` | best-effort mirror to `profilesRepo.setLocale` if signed in (`setLocale.ts:28-33`) | cookie + profile locale (for notification copy) | baseline |
| Switch theme | Header → sun/moon | — | none | client toggle | baseline |
| Open account menu / sign out | Header → Clerk `UserButton` | Clerk (external) | Clerk-managed | avatar modal, manage account, sign out | baseline |
| Enable push notifications | `/portal/dashboard` → opt-in card | `savePushSubscription`/`deletePushSubscription` (`notificationActions.ts:56-91`) | owner-scoped: `WHERE user_id = session.userId` on both save and delete (lines 68-70, 89) | browser push subscription persisted | baseline |
| **View notification bell** | Header (`AuthedHeader.tsx:27`, `admin/layout.tsx`) — every authed page | `listNotifications`, `getUnreadCount`, `markNotificationRead`, `markAllNotificationsRead` (`notificationActions.ts:20-53`) | `markNotificationRead` scoped `WHERE id = ? AND user_id = ?` (line 43) — no IDOR | dropdown feed + unread badge; **now wired in** (v1 gap #1 resolved — see Newly-surfaced) | **UX-∅ (gap fix, pre-wave)** |

---

## Donor

| Action | Where (route + control) | Server action / guard | Ownership/authz rule | Outcome | Since |
|---|---|---|---|---|---|
| Post a pickup | `/portal/dashboard` or `/portal/pickups` → "+"/"Post a pickup" | `createPickup` (`pickupActions.ts:134-201`) | `donor()` = `requireRole(["donor"])` (lines 42-44); kill switch `env.INTAKE_ENABLED` (line 145-147) | FormSheet (`PostPickupSheet`→`PickupForm`); auto-attributes to donor's linked partner if any | baseline |
| **Repeat last pickup** | Inside the create sheet → "Repeat last pickup" button (only when a prior pickup exists) | `getMyLastPickup` (`pickupActions.ts:310-321`) | `donor()` guard; ownership enforced in the query itself — `getLastByDonor(userId)` filters on the session's own id, never a client-supplied id (line 319) | prefills category/qty/unit/address/pin/maps-link; window + photo **never** prefilled (`PickupForm.tsx:106-136`) | **UX-6** |
| Find address on map | Inside post/edit form → "Find" | `resolvePickupLocation` (`pickupActions.ts:78-115`) | `requireRole(["donor","volunteer","admin"])` (line 84) | pasted Google Maps link OR typed address → pin | baseline |
| Upload food photo | Inside post form → "Add photo" | `requestPhotoUpload("food")` then direct PUT (`pickupActions.ts:118-131`) | `requireRole(["donor","volunteer","admin"])` (line 122) | signed upload URL, client-compressed image | baseline |
| Edit a pickup | Detail page → "Edit" (only while `requested`) | `updatePickup` (`pickupActions.ts:204-235`) | `donor()` + `updateIfRequested(id, userId, …)` — row-level ownership in the WHERE clause (line 219); returns `CONFLICT` if not owner/not requested | FormSheet (`EditPickupSheet`) in place | baseline |
| Cancel a pickup | Detail page → "Cancel" (only while `requested`) | `cancelPickup` (`pickupActions.ts:238-263`) | `donor()` + `cancelIfRequested(id, userId)` ownership (line 245) | purges GPS trail; ConfirmDialog | baseline |
| Repost a pickup | Detail page → "Repost" (any status) | `repostPickup` (`pickupActions.ts:266-303`) | `donor()` + explicit `src.donorId !== userId` check (line 274) | fires immediately, new pickup created, navigates to it | baseline |
| View My Pickups list | Bottom nav → "My pickups" | `pickupsRepo.listByDonor` (read) | scoped by session `userId` | grid of cards | baseline |
| Track a pickup (live map) | Detail page — auto while `en_route` | `getLatestPing` (poll, `pickupActions.ts:482-517`) + Realtime | `isDonorOwner = donorId===session.userId && status==='en_route'` (line 500) — donor view **ends** once collected | inline live map replaces static map | baseline |
| **Status timeline (history)** | Detail page → "History" section | `statusEventsRepo.listForPickup` (read) + `buildStatusTimeline` (`features/pickups/lib/timeline.ts`) | ownership already established by page-level `canView` (`portal/pickups/[id]/page.tsx:61-79`); donor branch always shows (posted→claimed→en route→delivered), even with zero events since "posted" derives from the row itself | vertical stage timeline, current stage highlighted (`rj-live`); timestamps only, no actor names to donors (privacy) | **UX-7** |
| **Delivery proof-back** | Detail page — auto on `delivered` + a proof photo | reuses the same `safeSignedUrl(pickup.proofPhotoPath)` the generic photo grid resolves (`portal/pickups/[id]/page.tsx:85-91,160`) | gated on `isDonorOwner` (already established) | "Your food reached families in need" block + photo (`DeliveryProofBack.tsx`) — copy is generic, not destination-named (see note below) | **UX-8** |
| View status history (non-timeline fallback) | n/a — superseded for donors by the timeline above | `statusEventsRepo.listForPickup` | any other viewer (admin/driver browsing) still gets the flat event list (`portal/pickups/[id]/page.tsx:209-233`) | plain `→ status · time` list | baseline |

**Note on UX-8 wording:** the spec text said `"Your food reached <destination>"`; the shipped
copy is the generic `"Your food reached families in need"` (`i18n/messages/en/portal.json:83`)
— a pickup has no direct FK to the destination it ends up dropped at (that link lives at the
run/stop level, one hop away), so naming the actual destination would need a join the
implementation didn't add. Not a bug, just a scope-narrower-than-worded deviation.

## Volunteer

| Action | Where (route + control) | Server action / guard | Ownership/authz rule | Outcome | Since |
|---|---|---|---|---|---|
| Browse the pickup board | Bottom nav → "Board" | `pickupsRepo.listOpen` (read) | read-only for volunteers — `VolunteerClaimNote` replaces the claim control (intentional, `PickupCard.tsx:30` only shows claim for `role==="driver"`) | List/Map tabs of open pickups | baseline |
| View a pickup's detail (awareness) | Board → tap card | `pickupsRepo.getById` (read) | `canView` allows `(isDriver||isVolunteer) && status==='requested'` or `isVolunteer && isActive` (`portal/pickups/[id]/page.tsx:73-78`) | full detail, no claim controls | baseline |
| **View Today's Distributions (+ map)** | Bottom nav → "Runs" | `runsRepo.listRuns` + `getRunWithStops` (read) | `session.role !== "volunteer"` redirects away (`distributions/page.tsx:25`) | list of active runs' drop stops **plus a map of drop-stop pins** (only rendered when ≥1 stop has coords, `distributions/page.tsx:74`) | baseline list; **map = UX-9** |
| Confirm a drop | Distributions list → "Mark done" per stop | `markStopDone` (`runActions.ts:297-355`) | any volunteer on an **active** run: `isVolunteer && run.status !== "active"` → FORBIDDEN otherwise (line 318-321) — not restricted to a specific assigned volunteer | inline button, success toast, auto-completes run if all stops done | baseline |
| **View dashboard (rebalanced)** | Bottom nav → "Home" | `pickupsRepo.listOpen` + `runsRepo.listRuns`/`getRunWithStops` (read) | — | leads with active-runs/drop-stop stats + a prominent "Today's distributions" CTA; read-only board demoted to a "what's cooking" link further down — judgment call, documented as such (`portal/dashboard/page.tsx:128-138`), no route/scope removed | **UX-10** |
| Enable push notifications | Dashboard → opt-in card | `savePushSubscription`/`deletePushSubscription` | owner-scoped | shared cross-persona control (donor+volunteer only, see gap below) | baseline |
| Switch language/theme, notification bell, sign out | Header | (cross-persona, see above table) | — | — | baseline |

## Driver

| Action | Where (route + control) | Server action / guard | Ownership/authz rule | Outcome | Since |
|---|---|---|---|---|---|
| Browse the pickup board | Bottom nav → "Board" | `pickupsRepo.listOpen` (read) | same board as volunteer; only drivers get the claim control | List/Map tabs | baseline |
| **Claim a pickup — from the board card** | Board card → "Claim" button (2-tap confirm) | `claimPickup` (`pickupActions.ts:324-353`) | `driver()` = `requireRole(["driver"])` (lines 47-49); atomic `pickupsRepo.claimIfAvailable(id, userId)` (line 331) — zero rows = already taken | `BoardClaimButton.tsx` — `ConfirmDialog`, toast, card clears/refreshes; `TAKEN` conflict on a race | **UX-1** |
| Claim a pickup — from detail page | Detail page → "Claim this pickup" (only `requested`) | same `claimPickup` | same guard | unchanged from v1 — still the deeper entry point | baseline |
| **See distance to each open pickup** | Board (driver only) → distance chip next to status pill | client-only, no server call — `DistanceAwareBoardList.tsx` requests one-shot `navigator.geolocation` after mount, `DistanceChip.tsx` reads it via `DriverPositionContext` | n/a (read-only, client-side sort; silently keeps chronological order on denial/timeout, `DistanceAwareBoardList.tsx:24-33`) | board re-sorts nearest-first; falls back to server chronological order with no nag on denial | **UX-2** |
| **Call the donor / partner contact** | Pickup detail (`tel:` button) + each run stop (compact icon variant) | — (no server call, `tel:` deep link) | phone only shown to the **assigned** driver (`isAssignedDriver ? profilesRepo.getById(donorId) : null`, `portal/pickups/[id]/page.tsx:90`); renders nothing when phone is null, no layout jump (`CallButton.tsx:23`) | dials on mobile | **UX-3** |
| **Navigate (Google Maps deep link)** | Pickup detail + each run stop's current-stop card and quiet list | — (no server call) | none — coords/address only | opens `https://www.google.com/maps/dir/?api=1&destination=…` in a new tab | **UX-4** |
| **Advance pickup status (sticky mobile bar)** | Pickup detail → advance button | `advancePickup` (`pickupActions.ts:356-402`) | `driver()` + `pickup.volunteerId !== userId` → FORBIDDEN (line 365) | on mobile becomes a fixed bottom bar (`StatusAdvanceSection.tsx:84-97`, above the bottom nav, safe-area padded); desktop unchanged | **UX-5** (control fixed for mobile); underlying action = baseline |
| Upload proof-of-delivery photo | Pickup detail → "Add photo" (delivering step only) | `requestPhotoUpload("proof")` then `setProofPhoto` (`pickupActions.ts:405-417`) | `driver()` + row-ownership check inside `setProofPhoto` (returns null/FORBIDDEN if not the assigned driver) | optional, never a gate on distribution | baseline |
| Share live location (pickup or run) | Automatic while `en_route`/`picked_up` (pickup) or run `active` — no button | `recordPing` (`pickupActions.ts:428-472`) / `recordRunPing` (`runPingActions.ts:21-64`) | `driver()` + assigned-driver check + active-status check + coordinate range validation (both files) | "Sharing location…" banner; ~30s cadence, self-stops when inactive | baseline |
| View My Run | Bottom nav → "My run" | `runsRepo.listRunsForDriver` + `getRunWithStops` (read) | driver sees only their own active/next-planned run (`portal/run/page.tsx:40-44`) | current-stop hero card + quiet remaining-stops list | baseline |
| Mark a run stop done | My Run → "Mark done" on current-stop card | `markStopDone` | driver: `run.driverId !== session.userId` → FORBIDDEN (`runActions.ts:315-317`) | auto-completes run when all stops done (via legal transition check), purges GPS trail | baseline |
| View run live map | My Run — auto while active | `getRunRoute` + `getLatestRunPing` (`runActions.ts:441-483`, `runPingActions.ts:71-105`) | admin, the run's own driver, or any volunteer (`runActions.ts:455-458`) | OSRM road route or straight-line+ETA fallback | baseline |

## Admin / staff

| Action | Where (route + control) | Server action / guard | Ownership/authz rule | Outcome | Since |
|---|---|---|---|---|---|
| View overview dashboard | Sidebar → "Overview" | `getAdminOverview`, `getDeliveriesTrend`, `reportsRepo.*` (read) | `requireRole(["admin"])` (`admin/dashboard/page.tsx:74-79`) | ledger stats, 30-day trend, status donut, leaderboards, directory links | baseline |
| **Dashboard load-time fix** | (no visible control — perf fix) | `getAdminOverview` (`server/db/repositories/stats.ts:26-49`) | n/a | every independent aggregate fired in ONE `Promise.all` (4 round trips, was 6); impact tile folded into the same GROUP BY as pickup-status buckets; partners+destinations counts merged via `UNION ALL`. **Deliberately NOT wrapped in `unstable_cache`** — see Open gaps (deviation from spec part (b)) | **UX-11** |
| Log surplus on a partner's behalf | Overview/Pickups → "Log surplus" | `logSurplus` (`intakeActions.ts:29-72`) | `admin()` (line 20-22) | FormSheet, partner picker first | baseline |
| Create a new run | Overview/Runs → "New run" | `createRun` (`runActions.ts:101-129`) | `admin()` | FormSheet, slot+date+optional driver | baseline |
| View pickups (filter/sort/paginate) | Sidebar → "Pickups" | `pickupsRepo.listForAdminPaged` (read) | `admin()` | filter bar + sortable table + pagination | baseline |
| Assign a pickup to a driver | Pickups row → "⋯" → "Assign" (only `requested`) | `assignPickup` (`adminActions.ts:78-102`) | `admin()` (line 82-87); picker sourced from `listAssignableDrivers` (`profiles.ts:143-155`), validated server-side against the submitted id (line 89-92) | atomic conditional update + statusEvent + notification (`assignOne`, lines 42-67) — **v1 gap #4 (volunteer-only picker) now fixed** | baseline picker, **fixed post-v1** |
| **Bulk-assign pickups to a driver** | Pickups list → row checkboxes → "Assign" bar | `assignPickupsBulk` (`adminActions.ts:117-162`) | `admin()`; ONE driver validation up front, then each pickup runs the SAME per-row atomic path (`assignOne`) — never a blanket UPDATE; capped at `BULK_ASSIGN_MAX = 100` (line 105) | per-pickup independent success/failure; failed rows (raced elsewhere) stay selected, succeeded ones clear (`PickupsTable.tsx:260-285`) | **UX-12** |
| **View a pickup's detail (admin-only, with history)** | Pickups row → "⋯" → "View" | `pickupsRepo.getById`, `statusEventsRepo.listForPickup` (read) | `requireRole(["admin"])` (`admin/pickups/[id]/page.tsx:35`) | **New dedicated route `/admin/pickups/[id]`**, deliberately separate from the shared donor/driver/volunteer `/portal/pickups/[id]` — shows donor/partner/driver names + the collapsible actor-resolved status history (`PickupHistorySection.tsx`) | **UX-14** |
| Verify / unverify a pickup | *(only reachable via `/portal/pickups/[id]` as admin — see Open gaps)* | `verifyPickup`/`unverifyPickup` (`intakeActions.ts:77-115`) | `admin()` | toggle + badge, optional bookkeeping, never blocks dispatch | baseline (now orphaned from the primary table "View" flow — see Open gaps) |
| Export pickups CSV | Pickups page → "Export" | route handler (not a server action), `/admin/pickups/export` | `admin()`-gated route | file download, carries filters | baseline |
| View runs list | Sidebar → "Runs" | `runsRepo.listRuns` (read) + `runStopsRepo.countByRunIds` (one grouped query, not N+1) | `admin()` | table with stop counts + status pill | baseline |
| Open a run's detail | Runs row → chevron | `runsRepo.getRunWithStops` (read) | `admin()` | full run detail page | baseline |
| **Assign/reassign a driver on an existing run** | Run detail → "Assign driver" section (inline picker + Save) | `assignDriver` (`runActions.ts:132-145`) | `admin()` (line 133-137) | `AssignRunDriverForm.tsx` — **v1 gap #2 (`assignDriver` had no UI caller) now fixed** | fixed post-v1 (surfaced alongside UX-14 wave) |
| **Edit an existing run (slot/date/driver)** | Run detail → "Edit" button | `editRun` (`runActions.ts:148-172`) | `admin()` | `EditRunSheet.tsx`→`EditRunForm` — **v1 gap #3 (`editRun` had no UI caller) now fixed** | fixed post-v1 |
| Add a pickup stop to a run | Run detail → "Add stop" → Pickup toggle → partner picker | `addPickupStop` (`runActions.ts:175-205`) | `admin()` + `guardRunMutable` (only planned/active, line 60-72) | inline form | baseline |
| Add a drop stop to a run | Run detail → "Add stop" → Drop toggle → destination or ad-hoc | `addDropStop` (`runActions.ts:208-258`) | `admin()` + `guardRunMutable`; **destination picker filters to active-only** (`admin/runs/[id]/page.tsx:43`) | ad-hoc address geocoded server-side before insert | baseline; active-only filter = **UX-15** |
| Reorder run stops | Run detail → up/down arrows | `reorderStops` (`runActions.ts:261-279`) | `admin()` + `guardRunMutable` | swaps `seq` with neighbour | baseline |
| Remove a run stop | Run detail → trash icon | `removeStop` (`runActions.ts:282-294`) | `admin()` + `guardRunMutable` | ConfirmDialog | baseline |
| **Override a stop's status** | Run detail → per-stop status `Select` (`StopList.tsx:97-115`) | `overrideStopStatus` (`runActions.ts:358-392`) | `admin()` (line 359-363); rejects on a closed run — `status==='completed'||'cancelled'` → CONFLICT (lines 371-373) | bypasses the normal driver/volunteer transition path; auto-completes the run if this closes out all stops — **v1 gap ("no UI caller") now fixed**, records a `stop_status_events` row (#109) | fixed post-v1; audit-recorded by **#109** |
| Advance / cancel a run | Run detail → status buttons | `setRunStatus` (`runActions.ts:395-414`) | `admin()` + `canRunTransition` legality check | cancel/delete confirm; forward transitions don't | baseline |
| Delete a run | Run detail → "Delete" (planned/cancelled only) | `deleteRun` (`runActions.ts:417-434`) | `admin()` + status checks (active→must cancel first; completed→permanent) | ConfirmDialog | baseline |
| **View run stop history (full audit trail)** | Run detail → "History" collapsible section (below Stops) | `stopStatusEventsRepo.listForStopIds` (read) + `buildStopHistory` (`features/runs/lib/stopHistory.ts:67-108`) | `admin()` (page-level) | chronological `<from> → <to> · <actor> · <time IST>` per stop; **legacy fallback**: a stop with zero `stop_status_events` rows (created/completed pre-migration) shows a completion-time-only line (`isLegacy: true`) instead of going blank | **UX-14 / #109** |
| View reports | Sidebar → "Reports" | `pickupsRepo.impactReport`, `reportsRepo.*` incl. `rescueTime` (read) | `admin()` | date-range control, CSV exports, ledger, run/destination/partner breakdowns + bar charts, **SLA metric** (avg + p90 posted→delivered minutes, only shown when `rescue.count > 0`) | baseline (SLA metric = #87, pre-dates this wave) |
| Change reports date range | Reports → date inputs | (read, via URL params) | `admin()` | applies via URL params, defaults month-to-date | baseline |
| Export reports (run summary) CSV | Reports → "Export runs" | route handler | `admin()`-gated | file download | baseline |
| Export pickups CSV (from Reports) | Reports → "Export pickups" | route handler | `admin()`-gated | same export as Pickups page | baseline |
| View destinations list | Sidebar → "Destinations" | `destinationsRepo.list` (read) | `admin()` | table with maps links | baseline |
| Add a destination | Destinations → "Add destination" | `createDestination` (`destinationActions.ts:23-53`) | `admin()` | FormSheet, active defaults `true` | baseline |
| Edit a destination | Destinations row → "⋯" → "Edit" | `updateDestination` (`destinationActions.ts:56-88`) | `admin()` | pre-filled FormSheet | baseline |
| **Toggle a destination active/inactive** | Edit-destination FormSheet → switch (edit mode only) | `updateDestination` (same action, `d.active` field) | `admin()` | `FormSwitch` in `DestinationForm.tsx:184-194`; list shows an Inactive badge; add-stop picker on run detail filters to active-only | **UX-15** |
| Delete a destination | Destinations row → "⋯" → "Delete" | `deleteDestination` (`destinationActions.ts:91-118`) | `admin()` | ConfirmDialog; CONFLICT-blocked (FK) if used by a past run — message now correctly points at the (now-existing) active toggle | baseline; guidance now actionable via **UX-15** |
| View partners list | Sidebar → "Partners" | `partnersRepo.list` (read) | `admin()` | table + "Link donor to partner" card | baseline |
| Add / edit / delete a partner | Partners → "Add partner" / row "⋯" | `createPartner`/`updatePartner`/`deletePartner` (`adminActions.ts:369-442`) | `admin()` | FormSheet / ConfirmDialog; delete CONFLICT-blocked if linked | baseline |
| Link a donor to a partner | Partners → "Link donor to partner" card | `setUserPartner` (`adminActions.ts:336-354`) | `admin()` | two **native** `<select>` elements (still not the shadcn `Select` — unchanged leftover, see Open gaps) | baseline |
| View users list | Sidebar → "Users" | `profilesRepo.listAll(filters)` (read) | `admin()` | table: name/email/role/status/actions | baseline |
| **Search / filter users** | Users page → search box + role filter (`UsersFilters.tsx`) | `parseUserFilters` (URL-param parsing) + `profilesRepo.listAll(filters)` | `admin()` | filtered table; distinct "no match" vs "no users yet" empty states (`admin/users/page.tsx:52-56`) | **UX-13** |
| **Invite a user (any role, with name/phone/city)** | Users page → "Invite" button | `inviteUser(email, role, name, phone?, city?)` (`adminActions.ts:220-267`) | `admin()` (line 227-231); email/role/name/phone format-validated server-side (lines 232-244); phone regex `^(\+91)?[6-9]\d{9}$` (line 208) | `AddUserDialog.tsx` — email + name + role + optional phone/city; Clerk invitation carries `onboardingComplete: true` + seeded name/phone/city in `publicMetadata`; invited user **skips onboarding entirely** — profile lazily provisioned by `ensureInvitedProfile` on first authed request (`session.ts:35-71`) | **#107** |
| Change a user's role | Users row → role `<select>` | `setUserRole` (`adminActions.ts:164-206`) | `admin()`; blocks self-change (line 175-176) and demoting the last active admin (`countActiveAdmins() <= 1`, lines 179-190); DB write happens **before** the Clerk metadata call — no silent role drift on partial failure (line 192-193) | fires immediately, no confirm; own row shows a static badge | baseline |
| Deactivate a user | Users row → "Deactivate" | `deactivateUser` (`adminActions.ts:270-307`) | `admin()`; blocks self (line 277-278) and last-active-admin (lines 280-290) | soft flag (`getSession` treats as signed-out immediately) + best-effort Clerk ban; ConfirmDialog | baseline |
| Reactivate a user | Users row → "Reactivate" (deactivated rows only) | `reactivateUser` (`adminActions.ts:310-333`) | `admin()` | clears soft flag + best-effort unban; **fires immediately, no confirm** (asymmetric with deactivate) | baseline |

---

## Powers summary (plain language)

**Public visitor** — browse the mission/impact story, switch language/theme, start sign-up
(pre-selecting donor/volunteer/driver), sign in (including a separate staff door), donate
money when the flag is on (bot-checked, webhook-confirmed), and read the legal pages. Nothing
mutates app data.

**Onboarding (first-time, non-invited)** — pick a role and complete a one-time profile;
cannot self-assign admin.

**Any signed-in user** — control language/theme, manage their own Clerk account/sign-out,
opt into push notifications, and now (fixed) actually see their notification bell —
in-app feed + unread badge, owner-scoped mark-read.

**Donor** — post surplus (with a map pin + optional photo), reuse their own last pickup as a
one-tap prefill, edit/cancel while still open, repost anytime, and once claimed watch it
through a proper stage timeline; once delivered, see a delivery-proof-back "your food
reached families in need" panel with the driver's photo. Every mutation on their pickups is
re-scoped to their own `donorId` server-side — no id from the client is ever trusted.

**Volunteer** — browse the board and any pickup for awareness (never claims), sees a map +
list of today's active runs' drop stops, confirms drops on any active run (not restricted to
one assigned volunteer), and now lands on a distribution-first home screen instead of a
read-only board.

**Driver** — claims open pickups (from the board card in two taps, or from detail), gets the
donor's phone and a one-tap Google Maps deep link once assigned, advances status through a
thumb-reach sticky button on mobile, optionally attaches a proof photo, silently broadcasts
location while active (own trail only, self-terminating), works their assigned run stop by
stop with the same call/navigate/mark-done affordances, and (new) sees roughly how far each
open pickup is before claiming.

**Admin/staff** — the superset: runs the whole dispatch loop (log surplus, build/edit/assign
runs, add/reorder/remove stops, override any stop's status with a recorded audit trail),
manages the pickups/runs/destinations/partners/users catalogs end to end (single or bulk
assign, search/filter users, invite any role with a name/phone/city that skips onboarding,
role changes and deactivation guarded against locking out the last admin), and reads the
whole operation back — dashboard, reports (with an SLA percentile), and now a dedicated
per-pickup and per-run history view with the actor resolved, not just the transition.

---

## UX-1..17 + invite (#107) + stop-audit (#109) — coverage checklist

| Item | Inventory row(s) | Status |
|---|---|---|
| UX-1 Claim from the board card | Driver → "Claim a pickup — from the board card" | Shipped |
| UX-2 Distance-aware board ordering | Driver → "See distance to each open pickup" | Shipped |
| UX-3 Call-donor button | Driver → "Call the donor / partner contact" | Shipped |
| UX-4 Open-in-Google-Maps deep links | Driver → "Navigate (Google Maps deep link)" | Shipped |
| UX-5 Sticky full-width status-advance button | Driver → "Advance pickup status (sticky mobile bar)" | Shipped |
| UX-6 Repeat-last-pickup + sticky submit | Donor → "Repeat last pickup" (+ `PickupForm.tsx:336` sticky) | Shipped |
| UX-7 Status timeline on donor pickup detail | Donor → "Status timeline (history)" | Shipped |
| UX-8 Delivery proof-back to the donor | Donor → "Delivery proof-back" | Shipped (generic copy, see note) |
| UX-9 Distributions map view | Volunteer → "View Today's Distributions (+ map)" | Shipped |
| UX-10 Volunteer landing rebalance | Volunteer → "View dashboard (rebalanced)" | Shipped (moderate/judgment-call version, documented in code) |
| UX-11 Dashboard load time (SSR hang) | Admin → "Dashboard load-time fix" | Shipped, **minus the `unstable_cache` part** (deliberate — see Open gaps) |
| UX-12 Bulk assign on the pickups list | Admin → "Bulk-assign pickups to a driver" | Shipped |
| UX-13 Users table search + role filter | Admin → "Search / filter users" | Shipped |
| UX-14 Status-event timeline (pickup + run) | Admin → "View a pickup's detail (admin-only, with history)" + "View run stop history" | Shipped |
| UX-15 Destination active/inactive toggle | Admin → "Toggle a destination active/inactive" | Shipped |
| UX-16 Instructive empty states | `EmptyState` adopted in 13 pages/components (grep-verified) | Shipped |
| UX-17 PWA install nudge | `src/features/pwa/*`, wired into `portal/layout.tsx:24`, `admin/layout.tsx` | Shipped |
| UX-18 GU/HI native-speaker review | n/a — `HUMAN`, not agent/code work per the spec itself | Not applicable to this inventory |
| UX-19 Post-deploy asset-integrity guard | `.github/workflows/deploy.yml:76-90` | Shipped (CI, not an in-app action) |
| Invite #107 | Admin → "Invite a user (any role, with name/phone/city)" | Shipped |
| Stop-audit #109 | Admin → "Override a stop's status" + "View run stop history" | Shipped |

---

## Newly-surfaced (vs `docs/guide/ACTION-INVENTORY.md`, the v1/pre-wave inventory)

Beyond the UX-1..19/#107/#109 items above (which are new by definition), the following
**v1-documented gaps are now resolved** in code:

1. **NotificationBell is now wired in.** v1 gap #1 said the bell existed but was never
   imported anywhere. It's now rendered in `AuthedHeader.tsx:27` (portal/donor/volunteer/
   driver chrome) and `admin/layout.tsx` — every signed-in user has a working in-app feed.
2. **`assignDriver` now has a UI caller.** v1 gap #2. `AssignRunDriverForm.tsx` on the admin
   run detail page lets an admin (re)assign a driver on an *existing* run — previously only
   possible at creation time.
3. **`editRun` now has a UI caller.** v1 gap #3. `EditRunSheet.tsx`→`EditRunForm` on the run
   detail page.
4. **The manual "Assign" dialog now targets drivers, not volunteers.** v1 gap #4 (a
   stale-post-dispatch-model-v2 bug where an admin could assign a `requested` pickup to a
   *volunteer*, who could then never advance it). `assignPickup`/`assignPickupsBulk` both
   source `profilesRepo.listAssignableDrivers()` (`profiles.ts:143-155`), not
   `listAssignableVolunteers` — see Open gaps for the now-dead old function.
5. **`overrideStopStatus` now has a UI caller.** v1 noted this as an implicit second gap
   alongside #2/#3. `StopList.tsx:97-115` exposes a per-stop status `Select` that calls it,
   and every override is now recorded in `stop_status_events` (#109).

New surfaces not present in v1 at all:
6. A **dedicated admin-only pickup detail route** (`/admin/pickups/[id]`), separate from the
   shared `/portal/pickups/[id]` — built specifically to show the actor-resolved status
   history without changing what other roles see on the shared route.
7. **`DistanceAwareBoardList`/`DistanceChip`/`driverPositionContext`** — a small client-only
   geolocation layer that reorders the driver board without touching SSR/data-fetch.
8. **`stop_status_events` table + `stopStatusEventsRepo` + `buildStopHistory`** — the full
   audit trail for run stops, previously only pickups had (`statusEvents`).
9. **PWA install-nudge feature module** (`src/features/pwa/*`) — did not exist in v1.
10. **A post-deploy asset-integrity CI guard** — not an app action, but closes the D1 incident
    v1's `IMPROVEMENT-PLAN.md` flagged as deferred.

---

## Open gaps / limitations

1. **Verify/Unverify is now orphaned from the primary admin "View" flow.**
   `PickupsTable.tsx:234` routes "View" to the new `/admin/pickups/[id]` (UX-14), which does
   **not** render `VerifyToggle` — that control only exists on the shared
   `/portal/pickups/[id]` (`app/portal/pickups/[id]/page.tsx:166-171`), and nothing in the
   admin table or the new admin detail page links there anymore. An admin can still reach it
   by navigating the URL directly (e.g. via a notification link), but there's no discoverable
   path from the Pickups list. Worth either adding `VerifyToggle` to the new admin detail
   page, or linking back to the portal route from it.

2. **`listAssignableVolunteers` is dead code.** `server/db/repositories/profiles.ts:120-133`
   — no functional caller remains (only referenced in comments at lines 137-140 and
   `adminActions.ts:72`) since `assignPickup`/`assignPickupsBulk` moved to
   `listAssignableDrivers`. Harmless, but a maintenance trap if someone reintroduces a
   volunteer-assign path by copy-pasting the wrong helper.

3. **UX-11's `unstable_cache` half was deliberately dropped.** The spec asked for (a)
   `Promise.all` fan-out AND (b) wrapping aggregate reads in `unstable_cache` (`revalidate:
   60`). Only (a) shipped. `server/db/repositories/stats.ts:37-49` documents why: `getDb()`
   is a React `cache()`-scoped **per-request** Postgres connection (Cloudflare Workers can't
   reuse a socket across requests), and `unstable_cache`'s detached cache scope reproduced
   the exact "blocked render on Workers" bug from PR #27. The latency fix that shipped is
   fewer round trips against the bounded connection pool, not a time-based cache — a
   reasonable, well-documented deviation, but worth knowing the spec's (b) was never done and
   dashboard reads are still live per-request queries, just fewer of them.

4. **Run-stop legacy fallback.** `buildStopHistory` (`features/runs/lib/stopHistory.ts:67-108`)
   falls back to a completion-time-only line (`isLegacy: true`, no actor, no `from` status)
   for any stop with zero `stop_status_events` rows — i.e. any stop created/completed before
   the #109 migration shipped. `StopHistorySection.tsx:52-53` renders these distinctly. This
   is correct-by-design (not a bug) but means historical runs from before #109 will show
   thinner history than new ones — worth knowing before using old runs as a demo/screenshot
   source for a handbook.

5. **Destination active/inactive toggle is edit-only.** `DestinationForm.tsx:184-194` only
   renders the `FormSwitch` in `mode === "edit"` — a brand-new destination is always created
   `active: true` (schema default) with no way to create one pre-inactive in one step. Minor,
   matches the spec's stated scope ("edit-only — a new destination is always active by
   default... the toggle only matters once it's in use").

6. **`LinkDonorControl` still uses two native `<select>` elements**, not the shadcn `Select`
   used everywhere else on the Partners page (`features/admin/components/LinkDonorControl.tsx:31,45`)
   — a v1-noted visual inconsistency that this wave didn't touch.

7. **PushOptIn has no driver entry point.** `PushOptIn` only renders on
   `/portal/dashboard` (`portal/dashboard/page.tsx:18,57`), but drivers are redirected away
   from that page straight to `/portal/run` (`portal/dashboard/page.tsx:30`) and
   `/portal/run/page.tsx` never imports `PushOptIn`. A driver currently has no discoverable
   way to opt into push notifications — a v1-noted gap that persists unchanged.

8. **Onboarding page carries dead branches for admin-invited users.** `app/onboarding/page.tsx:26-37`
   explicitly comments that the `isAdminInvite`/session-derived-`defaultRole` logic is
   "effectively unreachable" now that #107's `inviteUser` stamps `onboardingComplete: true`
   and the middleware gate redirects invited users away from `/onboarding` entirely. Left in
   as a "harmless fallback" per the source comment — flagging in case a future refactor wants
   to prune it.

9. **UX-8's donor delivery-proof-back copy is generic, not destination-named** (see the note
   under the Donor table) — a deliberate scope-narrower-than-worded shortcut, not a defect.

10. **UX-10 (volunteer landing rebalance) shipped the "moderate" version by the orchestrator's
    own judgment call**, per the comment at `portal/dashboard/page.tsx:128-138` — the original
    spec flagged this item as wanting "co-founder eyes" on the exact emphasis/wording/
    threshold. Worth a product review pass, not a code issue.
