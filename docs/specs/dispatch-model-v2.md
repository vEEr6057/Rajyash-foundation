# Dispatch model v2 — driver-led pickups, volunteers as distribution helpers

Spec for Phase 1 of the handbook-review improvements (docs/guide/IMPROVEMENT-PLAN.md).
Corrects the core model: **drivers collect food; volunteers only help distribute.** Preserves
the load-bearing invariants in production-discipline §2 (atomic claim, status-event audit,
ownership≠role) and §6 (RLS lives in migrations).

## The corrected model

- **Donor** posts a pickup. (unchanged)
- **Driver** collects it — either **claims** an open pickup from a driver board, or is
  **assigned** it by an admin (into a run). The driver drives to the donor (pickup leg), then to
  a distribution point (drop leg).
- **Volunteer** never claims/collects. A volunteer **joins a run/distribution as a helper** —
  sees active runs, marks themselves helping, confirms drops — and can **track** a pickup's
  status + the driver's location for situational awareness.
- **Admin** assigns, oversees, and sees everything live.

## What changes vs today

| Area | Today (wrong) | v2 |
|------|---------------|-----|
| `claimPickup` role | `volunteer` | **`driver`** |
| Pickup board (`/portal/board`) | volunteer claims | **driver** board (claim); volunteers get a **read-only** view for awareness |
| Volunteer portal | claim + deliver | **join active run** as distribution helper; confirm drops; track status |
| Live-tracking writer | assigned **volunteer** (`location_pings.volunteer_id`) | assigned **driver** |
| Ping viewers | donor + admin | see tracking matrix below |

## Live-tracking visibility (drives the RLS)

The driver's GPS (`location_pings`) is the tracked position. Visibility depends on the **leg**
(the pickup's status) and the viewer's role:

| Leg | Pickup status | Admin | Donor (owner) | Volunteer (active) |
|-----|---------------|:-----:|:-------------:|:------------------:|
| Pickup (→ collect) | `en_route` | ✅ | ✅ | ✅ |
| Distribution (→ drop) | `picked_up` | ✅ | ❌ (view ends once collected) | ✅ |

- Writer (INSERT): the pickup's **assigned driver**, only while `en_route`/`picked_up`.
- Donor sees the driver **only during the pickup leg** (their food coming to be collected); once
  `picked_up`, the donor's live view ends (status still shows "picked up / delivered").
- **Any active volunteer** may view (they're trusted distribution helpers in a single-org app);
  scoping to "volunteer on this run" is a later refinement, not v1.

### RLS changes (new migration)

`location_pings`:
- **INSERT policy** → `volunteer_id`… rename intent to the assigned **driver**: the row's actor
  must equal `pickups.volunteer_id` where that column now holds the **driver's** id (keep the
  column name to avoid a destructive rename in v1; document that `volunteer_id` = "assigned
  collector = driver"). Guard: status ∈ (`en_route`,`picked_up`).
- **SELECT policy** → replace `can_view_pickup_pings(pickup_id, uid)` with a leg-aware version:
  ```
  admin(uid)
  OR (pickups.donor_id = uid AND pickups.status = 'en_route')
  OR is_active_volunteer(uid)
  ```
  (admin + role=volunteer always; donor only while en_route.)

`run_pings` (run-level tracking, driver-led): SELECT already allows admin/volunteer/driver — keep;
it matches the distribution model (admin + volunteer see the run; the run's driver sees own).

## Code changes

- `pickupActions.claimPickup`: role gate `volunteer` → `driver`; keep `claimIfAvailable` atomic
  pattern + status-event record (actor = driver).
- `recordPing`: gate on `driver` role + assigned-driver + status; unchanged logic otherwise.
- `getLatestPing` / `getPickupRoute`: apply the leg-aware visibility (donor only while en_route).
- Board: `/portal/board` becomes the **driver** board (claim); volunteers get read-only board +
  a "join a run" surface. Role→nav map updated.
- Volunteer flow: list active runs, "I'm helping" toggle, confirm-drop (reuse `markStopDone`
  volunteer path that already exists).
- i18n EN/GU/HI for all new/changed strings.

## Invariants to preserve (production-discipline §2)

- Atomic claim (`claimIfAvailable`) — first driver wins; no read-then-write.
- Every status change goes through the audited transition (`statusEvents`).
- Ownership re-checked server-side (driver owns the pickup they advance; donor owns the pickup
  they view).

## Test plan

- claim: a driver claims; a volunteer cannot; two drivers race → one wins.
- tracking RLS: donor sees en_route pings, NOT picked_up; volunteer sees both; admin sees both;
  an unrelated donor sees none.
- volunteer join/confirm-drop path.
- i18n parity.

## Rollout

Own PR(s), CI green, then re-capture screens (Phase 3). Behind the existing `NOTIFICATIONS`/
tracking flags where relevant. RLS change ships as a committed migration; verified on a fresh
project (anon reads nothing; role-scoped reads correct).

## Open assumptions (flag for review, not blocking)

1. "Any active volunteer can view any active pickup's driver location" — acceptable in a
   single-org app; tighten to per-run later if needed.
2. `location_pings.volunteer_id` column kept (now means "assigned driver") to avoid a destructive
   rename in v1; a later migration can rename to `collector_id` cleanly.
