# Handbook + app-model improvement plan

Raised 2026-07-05 after reviewing the v1 handbook. The feedback splits into **app
model/UI changes** (must decide + build first — documenting a wrong flow is pointless),
**handbook documentation gaps** (execute once the app is settled + screens re-captured),
and **verified facts**. A separate production incident is flagged at the end.

---

## A. App model / product decisions (BLOCKING — these change the app, then the handbook)

### A1. Who claims a pickup? (the core model bug)
**Reality:** the foundation's **driver** collects the food. A **volunteer** does NOT pick up —
they ride along with the driver, or meet the driver at the distribution point to help hand out
food. If a volunteer "claims" a pickup, the driver can't collect it — the flows collide.

**Current app (wrong):**
- Volunteers see the pickup board and **"Claim this pickup"** → assigns the pickup to the
  volunteer. This is the wrong actor.
- Drivers have **no claim ability** at all — they only run admin-assigned runs.

**Decision needed — the intended model:**
- Pickups are collected by **drivers**. A driver either (a) is **assigned** a run by an admin,
  and/or (b) **claims** an open pickup themselves from a board.
- **Volunteers** never claim/collect. Their flow = see today's runs/distributions and **join a
  driver** as a distribution helper (and confirm drops), not claim pickups.

**Implied code changes** (once confirmed): move the claim action from the volunteer surface to
the driver; give drivers a pickup board (claim) in addition to assigned runs; redefine the
volunteer portal around joining runs / distribution, remove volunteer claim.

### A2. UI consistency across personas
The admin screens (dashboard, log-surplus modal) are the polished pattern. Donor/volunteer/
driver screens should match that treatment. Specifically raised: **"Post a pickup" should be a
form like admin's "Log surplus"** (a modal that opens from a button on the dashboard), not a
separate full page. Decision: how far to standardise — just post-pickup, or a consistent
form/modal pattern for every persona's create/edit screens.

---

## B. Handbook documentation gaps (execute after A is settled + re-capture)

| # | Gap | Fix |
|---|-----|-----|
| B1 | Homepage screenshot is missing its in-page images (programme/gallery pics didn't load in the capture) | Re-capture with all images loaded (wait for network idle) |
| B2 | The **onboarding** page (role selection after first sign-in) is not in the handbook at all | Capture it; add to section 2 (public/entry) or a dedicated "getting started" block |
| B3 | **Log surplus** screenshot is wrong — it's actually a **form that opens as a modal on the dashboard** when you press the button, not a separate page | Capture the real modal; replace |
| B4 | Forms are shown empty | Show each persona's form **being filled** (with example data entered), for donor, volunteer, driver, admin |
| B5 | Every sub-screen must be covered — this handbook is for someone learning the site from scratch | Exhaustive capture: every screen + every form state (empty, filled, submitted, error where relevant) |
| B6 | Dashboard shows "meals rescued / kg rescued" but never explains **how they're calculated** | Add a plain explanation: meals = servings from delivered food; kg = weight-based donations, counted separately (not converted to meals). Ideally also surface this in the UI as a tooltip/footnote |

## C. Verified facts

- **C1. Impact numbers are CORRECT, not a bug.** Dashboard 154 deliveries / 7,025 meals / 944 kg
  match the database exactly (`count(delivered)`, `sum(servings)`, `sum(kg)`). They look large
  because the data is **seed/test data** (to be purged at launch). The only real issue is B6
  (they're unexplained) + the meals-vs-kg separation.

## D. Flagged / deferred (separate incident)

- **D1. Live site client JS is 404ing** (broken deploy — HTML references chunk hashes the
  deployed assets don't contain; sign-in blank, no scroll animations). **Fix deferred at user's
  request.** When resumed: (1) re-deploy from `main` to realign HTML+assets; (2) add an
  automated post-deploy asset-integrity check to `deploy.yml` (fetch homepage → pull a referenced
  `/_next/static/chunks/*.js` → fail if not 200); (3) do the manual smoke check in a **browser**,
  not curl (curl only sees server HTML and misses dead client JS).

---

## Decisions (locked 2026-07-05)

- **Pickup → driver:** admin-assign **AND** driver-claim. Build a driver pickup board; drivers
  claim open pickups; admins still assign into runs.
- **Volunteer role:** join a run as **distribution helper** (see active runs, mark helping /
  confirm drops). Volunteers no longer claim pickups.
- **UI consistency:** **standardise ALL create/edit forms** to the admin modal-form pattern.
- **Sequencing:** fix the app first, re-capture, then rewrite the handbook once.

## Phased build

### Phase 1 — Dispatch model fix (HEAVY; load-bearing, touches production-discipline §2)
- Move `claimPickup` from the volunteer role gate to the **driver** role.
- New **driver pickup board** (open pickups + claim) alongside the existing "My Run".
- **Volunteer portal** re-centred on runs: see active runs, mark as helping, confirm drops;
  remove the volunteer claim/board-claim.
- Live-tracking owner shifts volunteer→driver: update `location_pings` RLS insert policy
  (`volunteer_id = assigned` → the assigned **driver**) + the `recordPing` guard + schema field
  naming. **New migration** for the policy change (per §6, RLS lives in migrations).
- Role→nav map, routes, i18n (EN/GU/HI), and tests updated. Preserve atomic-claim + status-event
  audit invariants.

### Phase 2 — UI standardisation
- `Post a pickup` → dashboard modal-form (like admin `Log surplus`).
- Every create/edit surface (pickup, run, destination, partner, driver-claim) adopts the shared
  modal-form component + tokens.
- Add the meals/kg calculation explanation in the UI (tooltip/footnote) — resolves B6 in-app.

### Phase 3 — Re-capture + handbook rewrite
- Re-capture every screen against the corrected app: homepage w/ images (B1), onboarding (B2),
  real log-surplus modal (B3), **forms shown filled** (B4), all sub-screens + states (B5),
  driver board + volunteer-helper flow.
- Rewrite the handbook exhaustively; add the calc explanation (B6). Rebuild HTML + republish.

### Phase 4 — Production incident (separate track, D1)
- Redeploy to fix the live client-JS 404s; add the automated post-deploy asset-integrity check;
  browser-based smoke checks.

**Scope note:** Phase 1 alone is a multi-file, cross-cutting change to the dispatch core (roles,
board, runs, RLS, tracking) — the exact area production-discipline §2 calls load-bearing. It
warrants its own spec + careful testing, not a quick edit.
