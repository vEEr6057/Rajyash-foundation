# E2E Workflow Audit — Rajyash Food Rescue

**Method:** Live Playwright sweep of prod (`https://rajyash-food-rescue.shahveerkeaten.workers.dev`),
all 4 roles, real sign-in + real mutations. Date: 2026-06-30.
Accounts: `qa.{role}+clerk_test@rajyashtest.dev` (device-trust code `424242`).

Legend: 🔴 blocker · 🟠 functional bug · 🟡 minor/UX · ⚪ observation (not a code bug)

---

## Coverage (what was exercised end-to-end)

| Area | Flows tested | Result |
|------|--------------|--------|
| Public | landing, impact count-up, EN/GU switch, footer (incl. staff link), auth-aware header | ✅ pass |
| Auth | sign in (4 roles), sign out, staff `/staff` → /admin, device-trust | ✅ pass (see 🟠-AUTH) |
| Donor | post surplus (geocode + pin), detail, edit prefill, cancel + confirm | ✅ pass (see 🟠-TZ) |
| Volunteer | board list + map (13 markers), claim, Accepted→En route→Picked up→Delivered, proof optional | ✅ pass |
| Driver | My Run (2 stops), Navigate deep-links, Mark done, run completion | ✅ pass |
| Admin | dashboard + 4 charts, pickups filter/sort/paginate/assign, users, partners (create), destinations, reports + 2 CSV exports, log surplus | ✅ pass except Create Run |
| Admin · Runs | **Create Run** | 🔴 FAILS |

---

## Findings

### 🔴 1. Create Run fails — "Invalid input" (blocks dispatch)
**Where:** `/admin/runs/new` → "Create run".
**Repro:** default form (Morning drive, today's date, any/no driver) → red alert "Invalid input"; no run created.
**Root cause:** `src/features/runs/validations/run.ts` `createRunSchema.runDate = z.string().transform(s => new Date(s))`.
`BuildRunForm` uses `zodResolver(createRunSchema)`, so RHF hands `onSubmit` the **transformed** value (a `Date`).
`createRun()` then re-runs `createRunSchema.safeParse(input)`, where `runDate` is now a `Date` but the schema
still expects `z.string()` → fails → generic "Invalid input". The transform is applied twice.
**Same defect in** `editRunSchema` (edit run would fail identically).
**Fix:** make `runDate` accept string-or-Date idempotently — `z.coerce.date({ error: "Run date is required" })`
(coerce is a no-op on an existing Date, parses a string). Keep tests green (string input still valid).
**Impact:** the entire Runs/dispatch milestone (RUN-01) is unusable from the UI.

### 🟠 2. Pickup times render 5.5h early (UTC, not IST)
**Where:** pickup detail window, dashboard/board cards, status history, **edit-form prefill**.
**Repro:** post a pickup with window 2:00–4:00 pm → detail shows **8:30–10:30 am**; edit form prefills `08:30`.
**Root cause:** `src/features/pickups/lib/format.ts` `formatWindow()` uses `Intl.DateTimeFormat("en-IN", …)`
with **no `timeZone`** → renders in the Cloudflare Worker's UTC. Same for the `createdAt` formatters
(detail history, admin table). The edit prefill slices the stored UTC instant into a `datetime-local` value
without converting to IST.
**Impact:** single-city IST app; every donor/volunteer sees pickup windows 5h30 off. Editing compounds the shift.
**Fix:** pin `timeZone: "Asia/Kolkata"` in all pickup date/time formatters; convert UTC→IST for the edit
`datetime-local` prefill (and IST→UTC on submit is already correct via the browser).

### 🟠 3. (AUTH) Real-domain QA logins blocked by Clerk device-trust
**Where:** sign-in with `qa.{role}@rajyashtest.dev` (no `+clerk_test`).
**Repro:** password accepted → "Check your email" device-verification → code emailed to an unreachable inbox → stuck.
**Assessment:** **not an app bug** — Clerk dev-instance "new device" verification. `+clerk_test` accounts bypass it
with code `424242`. Real staff with real inboxes are unaffected in production. Noted so the earlier-issued
`qa.X@rajyashtest.dev` credentials are known to need an email round-trip; use the `+clerk_test` variants for automated QA.

### 🟡 4. Staff sign-in page has two `<h1>`
**Where:** `/staff`. Our "Staff sign in" heading is `<h1>` and Clerk's card also renders `<h1>` ("Sign in to Rajyash-foundation").
**Fix:** demote our heading to `<h2>` (or visually-hidden) to keep one `<h1>` per page (a11y heading order).

### 🟡 5. Driver run completion is abrupt
**Where:** driver marks the last stop done → view flips to "No run yet" with no "run complete" confirmation/toast.
**Fix:** show a success toast / brief "Run complete" state before the empty state.

### 🟡 6. Admin pickups quantity sort mixes units
**Where:** `/admin/pickups?sort=quantity` orders by the raw number across `kg` and `servings`
(e.g. "5 kg" sorts before "25 servings"). Semantically apples-to-oranges.
**Fix (optional):** sort within unit, or label the column, or sort by a normalized measure. Low priority.

### ⚪ 7. Dashboard "Top partners" = "Unknown partner: 153"
All delivered seed pickups lack a `partnerId`, so partner attribution shows everything as "Unknown partner".
Not a code bug — `partnerId` is only back-filled (INT-01) when a posting donor's profile is linked to a partner,
which the seed data doesn't set. Real linked-donor pickups attribute correctly. Cosmetic for seeded data only.

---

## No console errors observed on any page (only the known `no-page-custom-font` build warning).

## Fix priority
1. 🔴 Create Run (run.ts `z.coerce.date`) — ship now.
2. 🟠 Timezone formatters (Asia/Kolkata) — ship now.
3. 🟡 Staff double-h1, driver completion toast, quantity-sort — batch / optional.
