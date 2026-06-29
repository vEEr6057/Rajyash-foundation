# UI/UX Audit — Rajyash Food Rescue (full E2E)

Date: 2026-06-29 · Auditor: Claude · Live: rajyash-food-rescue.shahveerkeaten.workers.dev

## Skills applied (all 4)
- **ui-ux-pro-max** — 10-priority rule system. Tags `[P1]`..`[P10]` = Accessibility, Touch, Performance, Style, Layout, Typography/Color, Animation, Forms, Navigation, Charts.
- **frontend-design** (kaka) — design thinking + anti-AI-cliché. Tag `[FD]`.
- **web-design-guidelines** (kaka → Vercel Web Interface Guidelines, fetched live). Tag `[WIG]`.
- **tailwind-patterns** (kaka) — Tailwind v4 / token architecture. Tag `[TW]`.

Severity: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low · ✅ good

Method: Playwright on live prod, all 4 roles (admin/donor/volunteer/driver QA accounts), desktop 1440 + mobile 390, light + dark.

---

## A. GLOBAL / CROSS-CUTTING

- 🔴 [P2] **Touch targets <44px.** Icon buttons + table row "…" use `size-9` (36px). Fails Apple 44 / Material 48. Everywhere (admin tables, dropdowns, theme toggle, pagination).
- 🔴 [P8][WIG] **No confirmation/undo on destructive actions.** Deactivate user, delete partner, delete destination all fire on click. WIG: "destructive actions need confirmation or undo."
- 🔴 [P8] **No success/error feedback.** Every server action `router.refresh()` silently. No toast/snackbar. User never told it worked/failed (`success-feedback`, `error-feedback`).
- 🟠 [P1] **Dark-mode contrast risk.** `muted-foreground` on dark cards (stat labels, table secondary text, hints) likely <4.5:1 (`color-accessible-pairs`). Needs measured pass.
- 🟠 [P4][TW] **Mixed control vocabulary.** Native `<select>`/`<input type=date>` (forms, filters, role, partner type) vs shadcn `Select`/`Dialog`. WIG `system-controls`; TW consistency.
- 🟠 [P9] **No bottom nav / persistent nav for mobile roles.** Donor/volunteer/driver navigate via dashboard buttons + back only. Nav guidance: bottom nav ≤5 on mobile.
- 🟡 [P6][WIG] `tabular-nums` only in some places; data columns/quantities jiggle (`number-tabular`).
- 🟡 [WIG] No skip-link to main content; heading anchors lack `scroll-margin-top`.
- 🟡 [P10][WIG] Tables not sortable; no `aria-sort`.
- 🟡 [i18n] GU/HI machine-draft (`_review: pending`) — unreviewed copy ships on language switch.
- 🟡 [P3] `force-dynamic` on all routes → every nav = full server render (~1-2s); skeleton masks but not snappy.
- ✅ [P1][WIG] `prefers-reduced-motion` honored globally; reveal + chart anim disabled under it.
- ✅ [TW] Token architecture solid (semantic CSS vars, `@theme`, light/.dark). No raw hex in components (mostly).
- ✅ [P7] Overlay transitions via tw-animate-css; reduced-motion safe.

---

## B. PUBLIC SURFACES

### B1. Landing `/`
- ✅ Structure complete: hero → impact counter → how-it-works (3 steps) → two-ways-to-help → about+quote+stats → CTA band → footer.
- ✅ [P10] Impact counter counts up (6,952 / 924 / 151), reduced-motion safe.
- 🟠 [FD] **Hero = AI "safe harbor".** Left-copy / right gradient panel + gradient blobs + glass floating chips — frontend-design explicitly flags hero-split, mesh/aurora gradients, glassmorphism as clichés. Functional, not distinctive.
- 🟠 [FD] Hero panel center = faint outline icon = reads placeholder/empty.
- 🟡 [P7] Reveal-on-scroll hides all below-fold content until scrolled; first paint looks empty (you saw this). Uniform fade, no stagger/hierarchy.
- 🟡 [FD] Rounded-everything; no sharp/contrast moments — generic.
- 🟡 [WIG] "Donate surplus food" label risks money-donation confusion.
- ⚪ Floating "200+" card sits `-left-3 -bottom-5` (outside panel) — clip risk at some widths.

### B2. Public header (landing) — MOBILE
- 🔴 [P5] **Overflow at 390px.** "Rajyash Foundation" wraps 2 lines; EN/ગુ/હિ + theme + Sign in + **Join** collide/clip; **horizontal scrollbar present** (`horizontal-scroll` fail). Desktop fine.

### B3. Footer
- ✅ Explore/Contact columns, foundation info, locale switch. Clean.
- ⚪ [WIG] Verify link contrast in light mode.

### B4. Sign-in `/sign-in`
- ✅ Now themed (white card, heading, labels, divider, green Continue) after fix.
- 🟠 [FD] Bare white card on near-black; **no brand presence** (no logo/mark, no split-screen/illustration). Generic Clerk.
- 🟡 Google button **icon-only "G"** (no "Continue with Google" label) — ambiguous.
- ⚪ "Development mode" Clerk badge visible.

### B5. Sign-up `/sign-up`
- ✅ Themed consistently; empty inputs render clean white (confirms earlier gray = autofill).
- 🟠/🟡 Same as sign-in (no brand, icon-only Google, dev badge).

### B6. 404 `/not-found`
- ✅ Branded ("404 — This page wandered off" + Back to home). Good.

### B7. Onboarding `/onboarding` — VERIFIED (seeded non-onboarded acct)
- ✅ [FD] **Best form on the site.** Role chosen via 3 icon+description cards (Donate food / Volunteer / Driver) — not a native select. Name / Phone(optional) / City + full-width Continue (single CTA). Clean.
- 🟡 [P8] Name is required but no asterisk/required marker (`required-indicators`).
- 🟡 [P8] No inline validation shown; City prefilled "Ahmedabad".

---

## C. ADMIN

### C0. Admin shell (sidebar + topbar)
- ✅ [P9] Desktop sidebar rail, active-link highlight, mobile drawer (hamburger). Good adaptive nav (`adaptive-navigation`).
- ✅ Topbar: locale + theme + UserButton.
- 🟡 [P9] No breadcrumbs on deep pages (run detail). 
- 🟡 Sidebar has no section grouping/labels (flat list of 7).

### C1. Overview `/admin/dashboard`
- ✅ [P10] Real analytics: KPI row + deliveries area-trend (tooltip "06/06 deliveries: 2") + status donut (legend+counts) + top partners/destinations bars. Legend/tooltip/empty-state all present. Light+dark both render.
- 🟠 [P4] **Two competing green CTAs** (Log surplus solid + New run "leaf") — violates one-primary-CTA (`primary-action`).
- 🟠 KPI cards static — **no trend/delta/WoW/sparkline** (dashboard best practice: every KPI needs comparison context).
- 🟡 Directory cards (partners/destinations/volunteers/drivers) not clickable to their sections — missed affordance.
- 🟡 [P5] 6 KPIs/row cramped <~1300px.
- 🟡 [P10] Trend Y-axis tiny; no axis unit label.

### C2. Pickups `/admin/pickups`
- ✅ Real table, status pills, filters, Export CSV, pagination, row "…" (View/Assign), assign-in-dialog. Mobile: drawer + responsive column hiding + horizontal scroll.
- 🟠 [P4] Filter controls native (`All statuses` select, dd-mm-yyyy dates) — inconsistent.
- 🟡 [P10][WIG] No column sorting/`aria-sort`.
- 🟡 Count "173" bare (no "pickups" label).
- 🟡 [P2] Row "…" 36px target.
- ⚪ No bulk actions.

### C3. Users `/admin/users`
- ✅ Table: name/email/role(select)/status(badge)/actions.
- 🔴 [P8] **Deactivate fires instantly, no confirm.** Plus a big red Deactivate on EVERY row (always visible) = heavy red wall, no `destructive-emphasis` restraint (should be in a menu/confirmed).
- 🟠 [P4] Role = native `<select>` per row (inconsistent; also instant role change, no confirm).
- 🟡 Status "Active" is text-ish, not a clear pill in all rows.

### C4. Partners `/admin/partners` + Add dialog
- ✅ Table (name/type-badge/contact/city/…), Add Partner → Dialog. Edit via dialog. Clean + consistent.
- 🟠 [P4] Dialog "Type" = native select. Dialog is tall → scrolls (acceptable).
- 🔴 [P8] Delete (in "…") instant, no confirm.

### C5. Destinations `/admin/destinations`
- ✅ Same table+dialog pattern (captured). 
- 🔴 [P8] Delete instant, no confirm. 🟠 [P4] native controls in form.

### C6. Dispatch Runs `/admin/runs`
- ✅ Table (date/slot/driver/stops/status pill), New run → Sheet, empty state clean ("No runs yet").
- 🟡 0 runs in data → can't assess populated table.

### C7. Run detail `/admin/runs/[id]` — VERIFIED (seeded run)
- ✅ Rich: title+status pill, driver-location Leaflet map, stops list (Pickup/Drop + Done/Pending badges + reorder ↑↓ + delete), Add-stop (Pickup/Drop toggle + partner/dest select + add).
- 🟠 [P8] **"Set to Cancelled" red button prominent at top, no confirm.** Destructive, instant.
- 🟠 [P4] Add-stop partner/destination = native `<select>`.
- 🟡 [P2] Reorder arrows + delete trash <44px.
- 🟡 [P3] "Waiting for driver location…" persists on static load despite a ping present (realtime needs the live socket; SSR shows waiting state).

### C8. Log surplus `/admin/surplus/new`
- ✅ Reuses PickupForm in a card; partner select + form + Find geocode.
- 🟠 [P4] All native controls (restaurant select, food type, unit, dates).
- 🟡 [P8][WIG] Placeholders don't end "…"; no inline validation shown; no autocomplete.

### C9. Reports `/admin/reports`
- ✅ 3 stat cards + date range + 2 CSV buttons + 3 breakdown tables + approximation note + empty states.
- 🟠 [P10] **No charts** — overview is chart-rich, reports is all tables. Inconsistent; same data wants visuals.
- 🟠 [P4] Native date inputs.

### C10. Loading skeleton `/admin/loading`
- ✅ Skeleton cards+bars, sidebar persists. Good perceived perf (`progressive-loading`).

---

## D. PORTAL (donor / volunteer)

### D0. Portal shell
- 🟠 [P9] Only AuthedHeader (logo + locale + theme + bell/UserButton). **No portal nav / no bottom nav** — mobile-first roles navigate via buttons + back only.
- 🟡 "Enable notifications" bar repeats on every portal page.

### D1. Donor dashboard `/portal/dashboard`
- ✅ Greeting + 4 stat cards (total/open/active/delivered) + Post/My-pickups CTAs + recent (empty-state CTA). Meaningful. Mobile clean.
- 🟡 All zeros (QA acct no data) — empty by test only.
- 🟡 [P6] muted contrast on labels.

### D2. Volunteer dashboard `/portal/dashboard`
- ✅ 3 stat cards (Open now **12** real / my-active / delivered-by-me) + Browse/Map CTAs + active list. Mobile clean (3-up stat cards slightly tight).

### D3. Volunteer board `/portal/board`
- ✅ [P9] List/Map **tabs** (one page), works desktop + mobile. Pickup cards (category/qty/window/location/pill). Map tab = multi-pin Leaflet.
- 🟡 [P5] `max-w-2xl` → board feels narrow on wide desktop (lots of side void).
- 🟡 [P2] Whole card is the tap target (good) but no hover elevation cue on desktop.

### D4. Pickup detail `/portal/pickups/[id]`
- ✅ [P4] Category + status pill, qty, desc, window, location, Leaflet map w/ pin, single "Claim this pickup" primary CTA (correct one-CTA). Clean.
- 🟡 [P5] `max-w-2xl` narrow on desktop.
- 🟡 [WIG] Map has no `width/height`/aspect reserved → potential CLS (`image-dimension` analog).
- ✅ **Live-tracking variant VERIFIED** (seeded en_route + ping): live map with position pin, "updated 1m ago", stale indicator ("Location may be outdated"). Works.
- 🟡 [P1] Stale/"updated" text low-contrast gray.

### D5. Donor my-pickups `/portal/pickups`
- ✅ List of PickupCards + Post CTA + empty state. (QA empty.)

### D5b. Edit pickup `/portal/pickups/[id]/edit` — VERIFIED (seeded)
- ✅ Loads prefilled (food type, qty, dates, address, draggable pin map). Works.
- 🟠 [P4] Same native selects/dates as post form.

### D6. Post surplus `/portal/pickups/new`
- ✅ "Post surplus food" + full form + Google-link/geocode + draggable pin + photo + attestation.
- 🟠 [P4] Native food-type/unit selects + native dates.
- 🟡 [P8][WIG] No inline-validate-on-blur, no focus-first-error, placeholders no "…", no `autocomplete`/`inputmode`.

---

## E. DRIVER

### E1. My Run `/portal/run`
- ✅ Title + clean empty state ("No run assigned").
- 🟠 [FD][P9] **Threadbare**, esp. mobile — title + 1 card in a sea of black. No past runs, no help, no bottom nav. Feels unfinished.
- 🟡 First login briefly lands `/portal/dashboard` (Clerk claim lag) before redirect.

---

## F. COMPONENT-LEVEL

- **Button** ✅ CVA variants/sizes, `asChild`, `rj-press`. 🟡 `icon` size = 36px (<44). 🟡 no explicit `hover:` on all `ghost` uses (WIG `hover:` required).
- **Badge** ✅ semantic soft variants. 
- **Table** ✅ tokenized, overflow-x, empty-state. 🟡 no sort/`aria-sort`.
- **Dialog/Sheet** ✅ Radix, tokenized, animated, close affordance, scrim. ✅ focus trap (Radix). 🟡 verify `aria-describedby` where no description.
- **Select (native used)** 🟠 inconsistent w/ shadcn Select (which exists but unused in forms).
- **Pagination** ✅ URL-driven, prev/next + window. 🟡 link targets 36px.
- **PickupStatusPill / RunStatusPill** ✅ token-driven per-state, `rj-dot-live` pulse. 
- **Charts (recharts)** ✅ legend/tooltip/empty/donut≤5; client-only; anim off. 🟡 no `aria`/text summary for SR (`screen-reader-summary`), no keyboard access (`focusable-elements`).
- **MapView (Leaflet)** ✅ renders, OSM attribution. 🟡 reserve height to avoid CLS; pins no labels/tooltips.
- **PickupCard** ✅ clean, whole-card link. 🟡 no hover state.
- **Forms (RHF+Zod core)** 🟠 native selects/dates; manual error `<p>` in places vs FormField; no inline-on-blur/focus-first-error.
- **AppShell/AdminNav** ✅ sidebar+drawer, active state. 🟡 no breadcrumb, no grouping.
- **PushOptIn / NotificationBell** ❌ panel content not visually verified.

---

## G. PER-SKILL SCORECARD

| Skill | Grade | Worst offenders |
|------|------|------|
| ui-ux-pro-max P1 Accessibility | C+ | contrast, 44px, skip-link, chart SR |
| P2 Touch | C | 36px targets app-wide |
| P3 Performance | B | force-dynamic; CLS on maps |
| P4 Style | B− | native/shadcn mix, 2 primary CTAs |
| P5 Layout | B | mobile public header overflow; narrow portal max-w |
| P6 Type/Color | B | contrast, tabular-nums gaps |
| P7 Animation | B+ | uniform reveals; otherwise good |
| P8 Forms/Feedback | C− | no toasts, no confirm, native inputs |
| P9 Navigation | B− | no mobile bottom nav; driver bare |
| P10 Charts | A− | overview great; reports none; SR/keyboard gap |
| frontend-design [FD] | C+ | templated hero/auth, generic rounding |
| web-design-guidelines [WIG] | B− | confirm, autocomplete, sorting, hover, skip-link |
| tailwind-patterns [TW] | A− | tokens excellent; minor consistency |

**Overall: B / "solid desktop product, not yet polished or mobile-safe."**

## H. Top fixes by ROI
1. Mobile public header overflow (🔴 P5)
2. Confirm + toast on every destructive/mutation action (🔴 P8)
3. 44px touch targets (🔴 P2)
4. Replace native selects/dates with shadcn Select/date (🟠 P4)
5. Dark contrast pass (🟠 P1)
6. Mobile bottom nav for portal + driver (🟠 P9)
7. Distinctive hero + branded auth (🟠 FD)
8. Charts on reports + KPI deltas (🟡 P10)
9. Forms UX: inline validate, focus-first-error, autocomplete, "…" placeholders (🟡 P8)
10. Driver screen build-out (🟠 FD)

## Coverage — now COMPLETE (seeded QA data)
All previously-unreachable surfaces verified: onboarding ✅, run detail ✅, live-tracking-in-motion ✅, edit-pickup ✅.
- ⚠️ Notifications bell: opens (click registered) but the popover wasn't captured in-frame; bell + unread logic exist. Re-shoot pending if needed.
- Bonus: seeding confirmed dashboards populate correctly (volunteer: 13 open / 1 active / 1 delivered + en-route card).

### QA seed to remove later (all `qa_`-prefixed)
pickups qa_pk_req1 / qa_pk_enroute / qa_pk_deliv · location_pings qa_ping_1 · runs qa_run_1 · run_stops qa_stop_1/2 · notifications qa_no_1/2 · Clerk+profile QA accounts (admin/donor/volunteer/driver/newbie +clerk_test).
