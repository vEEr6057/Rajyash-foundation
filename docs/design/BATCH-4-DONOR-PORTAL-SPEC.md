# Batch 4 delta-spec — donor portal

**Status:** LOCKED build contract. Read [APP-UI-CHARTER.md](APP-UI-CHARTER.md) (§3.1, §3.2, §3.5, §3.6).
Batches 1–3 merged; primitives exist. Portal = mobile-first **field-screen** archetype: cards ARE allowed
here (tap targets), one shadow level max.
**Screens:** `/portal/dashboard` (donor variant) · `/portal/pickups` · `/portal/pickups/new` ·
`/portal/pickups/[id]` (+ `/edit`) · `/admin/surplus/new` inherits shared form pieces automatically.
**Branch:** `feature/ui-batch-4-donor-portal` off `main` → PR. Done = typecheck + eslint + vitest green.

---

## 1. Shared portal frame

1. Portal content column: `mx-auto w-full max-w-2xl px-4` on list/detail/form pages (kills the
   left-hugging dead space on desktop); dashboard may use `max-w-4xl`.
2. **PageHeader** on every screen: donor list → eyebrow `My kitchen` (i18n), title `My pickups`,
   meta = `N active · N delivered` (from data already loaded), action = `New` (primary sm).
   Form → eyebrow `Donate`, title `Post surplus food`, meta = the existing helper sentence.
   Detail → eyebrow `Pickup`, title = category label, action = status pill (as node).
3. Bottom nav: unchanged behaviour; active item = primary green + icon fill, inactive
   `text-muted-foreground`; ensure 44px min tap height (verify, adjust padding only).

## 2. /portal/pickups (list)

- Keep cards (field screen) but align to charter: `rounded-xl border border-border` + ONE soft shadow
  (`shadow-sm`), hover/active `bg-surface-2`; internal rows unchanged (icon+label pairs are good).
- Status pill stays top-right. Quantity: `font-display font-medium tabular-nums` (small ledger voice).
- Desktop ≥`md`: 2-column card grid (`grid md:grid-cols-2 gap-3`).
- Zero pickups → `EmptyState`: title `Nothing posted yet`, body `When your kitchen has surplus, post it
  here — a volunteer picks it up the same evening.`, action = `Post surplus food` (primary).

## 3. /portal/pickups/new (+ edit — same form component)

Form-sheet (charter §3.5), donor dialect:
1. Remove the big card wrapper → transparent, the page IS the sheet (`max-w-2xl`).
2. Group into 3 sections separated by hairlines (`border-t border-border pt-5 mt-6`), each headed
   `font-display font-semibold text-[15px]`: `What you're sharing` (type, quantity+unit, description) ·
   `When to pick up` (from/until) · `Where` (address+Find, map pin, photo, confirm checkbox).
   Section heads = new i18n keys EN/GU/HI.
3. Native datetime-local inputs stay (mobile UX is right) — style them to the field recipe
   (`h-11 rounded-md border-border bg-transparent px-3 text-sm w-full`); do NOT touch the IST
   prefill/format logic (`toDatetimeLocal` — lesson-guarded).
4. Submit row: keep full-width primary on mobile; ≥`sm` natural width right-aligned. Cancel = ghost.
5. Zero validation/schema/action changes. Shared `Form*` components only — if a field is hand-wired,
   migrate it to the matching `Form*` component (frontend-practices §2) with identical behaviour.

## 4. /portal/pickups/[id] (detail)

1. PageHeader per §1 (keeps the category icon inline before the title — pass into `title` slot as node
   if PageHeader accepts ReactNode; else extend `title?: ReactNode` backward-compatibly).
2. Info block: card → hairline panel (`border border-border rounded-lg`), keep icon+text rows.
3. **Map:** keep embedded Leaflet exactly as-is (live tracking works — don't touch hooks). Panel gets a
   hairline frame consistent with the info panel. The provenance line under the map
   ("Location may be outdated · updated Xh ago") is EXACTLY the charter voice — keep, restyle
   `text-xs text-muted-foreground tabular-nums`, dot indicator `rj-live` pulse ONLY when the pickup is
   `enroute` (live), static dot otherwise.
4. `Repost this` → outline `sm` with rotate-ccw lucide icon; sits under the panel left-aligned. Any
   destructive action (Cancel pickup) separated by a hairline from other actions (charter §3.5).
5. Status history (if rendered on some statuses): timeline rows get `tabular-nums` timestamps, no other
   change.

## 5. /portal/dashboard (donor)

1. PageHeader: eyebrow `My kitchen`, title existing greeting/title, meta = date (IST).
2. Stat tiles (if any) → `LedgerRow`; quick actions keep card treatment (§2 card recipe).
3. Recent pickups list reuses the §2 card component — no duplicate markup (DRY: extract
   `PickupCard` usage if the list screen and dashboard currently fork it).

## 6. Out of scope

Volunteer board / driver run (batch 5) · admin screens · schema/queries/actions/validation ·
map/tracking logic · bottom-nav items · photo upload flow.

## 7. Self-QA before PR

1. 390px mobile: form sections breathe, inputs h-11, submit reachable, bottom nav 44px targets.
2. Desktop: content centered max-w-2xl, list 2-col grid, no dead right field.
3. Detail: hairline panels, live dot pulses only on enroute (check reduced-motion: static).
4. EmptyState renders for a fresh donor. Both themes. EN/GU/HI keys. Suite green.
