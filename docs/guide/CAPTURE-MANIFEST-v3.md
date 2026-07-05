# Capture manifest v3 — what each screenshot in docs/guide/assets/ shows

The handbook writer cannot see images. This is the source of truth for what each asset depicts.
All captured 2026-07-05 against the live merged app (all PRs #104–#111 + migration 0015).
Embed with `{{IMG:<name>}}` (basename, no extension).

## Public / auth
- **01-home-full** — public homepage, signed out. Programme cards WITH images; live-impact panel (7,025 meals · 944 kg · 154 deliveries) with provenance.
- **02-signin** — /sign-in, Clerk widget (email + password + Google OAuth).
- **03-signup** — /sign-up, create-account (email + OAuth).
- **04-staff-signin** — /staff, staff-branded Clerk sign-in.

## Cross (all signed-in)
- **05-onboarding** — onboarding: three role cards (Donate food / Volunteer / Driver) + name/phone/city. (Self-signup path only; invited users skip this.)
- **41-notification-feed** — the in-app notification bell dropdown/feed (pickup-status + delivery entries).

## Donor
- **10-donor-dashboard** — donor /portal/dashboard: stats, "Post a pickup" + "My pickups", recent pickups.
- **11-donor-pickups** — donor /portal/pickups list with status pills.
- **13-donor-postpickup-sheet** — the "Post surplus food" FormSheet open, all fields, with the **"Repeat last pickup"** button at the top (UX-6).
- **14-donor-pickup-detail** — a donor pickup detail showing the **status timeline** (posted→claimed→en route→delivered, UX-7) + map. (A delivered pickup would also show the proof-back block, UX-8 — NOT separately captured; describe from inventory.)

## Volunteer
- **20-volunteer-dashboard** — volunteer dashboard, **distributions-first** with a "What's cooking" section demoting the board (UX-10).
- **26-volunteer-distributions** — /portal/distributions: Today's distributions list + a **Leaflet map with drop-stop pins** (UX-9).
- **27-volunteer-board-readonly** — volunteer board, read-only (no claim buttons; note drivers collect / volunteers distribute).

## Driver
- **23-driver-board** — driver "Available pickups" board with **distance chips + nearest-first sort** + Claim buttons on cards (UX-1/2).
- **24-driver-pickup-claim** — driver pickup detail pre-claim, "Claim this pickup" button (UX-3 context).
- **24b-driver-navigate-call** — same pickup post-claim, **Navigate + Call** buttons (UX-3/4).
- **25-driver-run** — /portal/run, current-stop hero + **PushOptIn** card (gap-7 fix) + mark-stop + sticky advance.

## Admin
- **30-admin-dashboard** — /admin/dashboard overview: stat tiles, 30-day chart, pickup-status donut, top partners/destinations, directory. (NOTE: meals = servings from delivered food; kg = weight donations, counted separately, never converted — a "?" hint explains it. Also flag: this page currently renders slowly.)
- **31-admin-pickups** — admin pickups table with **row checkboxes** (bulk-select) + filters + "Log surplus" button.
- **31b-admin-bulk-assign** — the **bulk-assign dialog** "Assign 5 pickups to a driver" with a driver-select dropdown (UX-12), reached by selecting rows → "N selected → Assign to driver" bar.
- **32-admin-pickup-detail** — /admin/pickups/[id]: shows the **"Mark verified"** toggle (gap-1 restored) AND a **"History (1)"** collapsible status-event section (UX-14).
- **33-admin-runs** — dispatch runs list (date, slot, driver, stops, status).
- **34-admin-destinations** — destinations table (name, area, address/Maps, per-row Edit) + "Add a destination". (The Edit form has an **Active toggle** — UX-15 — NOT separately captured; describe from inventory: edit a destination → Active switch → inactive ones get an "Inactive" badge + are hidden from pickers.)
- **35-admin-partners** — partners table (name, type, contact, city) + Add partner + link-donor.
- **36-admin-users** — users table with a **search box** + **role-filter** dropdown (UX-13); per-row role dropdown + Deactivate; "Add user" (invite) button.
- **36b-admin-invite** — the "Invite a user" modal: **email, Name (Full name), role dropdown (all 4), phone, city** (#107). Invited users skip onboarding.
- **36c-admin-users-search** — users list filtered by the search query "priya" → shows "Priya Patel" (donor).
- **37-admin-reports** — reports: impact stat tiles, run summary, breakdowns, rescue-time metrics, CSV export.
- **38-admin-log-surplus** — "Log restaurant surplus" sheet: restaurant select + food type/qty/description/dates/address.
- **39-admin-run-detail** — /admin/runs/[id]: stops (pickup/drop) with status badges + override, driver reassign + edit-run, and a **"History (2)"** stop status-event section (#109 stop audit trail).
- **40-admin-edit-run** — the Edit-run sheet (slot + date). (Retained from v2; still accurate.)
- **33b-admin-add-destination** — the Add-destination sheet (name, area, address + Find, pin, city). (Retained from v2.)

## Not captured (document from the inventory in text, no image)
- **15-donor-proofback** — delivery proof-back block (UX-8): no seed pickup has a proof photo set. Describe: on a *delivered* pickup, the donor sees "Your food reached <destination>" + the driver's proof photo.
- **34b destination Active toggle** (UX-15): the Edit control is a dropdown menu → Edit → the form has an Active switch. Describe in the destinations section; use 34-admin-destinations for the visual.
