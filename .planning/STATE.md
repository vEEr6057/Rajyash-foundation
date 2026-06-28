---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Dispatch Bridge
status: roadmapped
last_updated: "2026-06-29T00:00:00.000Z"
last_activity: 2026-06-29
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-25)

**Core value:** A donor can post surplus food and a volunteer can reliably claim, pick up, and deliver it to people in need — the rescue loop must work end to end.
**Current focus:** v2.0 Dispatch Bridge — evolve live v1 app to coordinator-dispatched, twice-daily, multi-stop runs without a rewrite.

## Current Position

Phase: Phase 8 (not started — roadmap complete, ready to plan)
Plan: —
Status: Roadmapped — next step is /gsd-plan-phase 8
Last activity: 2026-06-29 — v2.0 roadmap created (Phases 8–12)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v2.0 confirmed: operating model = coordinator-dispatched, twice-daily, multi-stop runs (DISPATCH-CONTEXT.md).
- Drivers are paid rickshaw drivers; volunteers are unpaid NGO members who help distribute and never block a run.
- Destinations table supports saved zones/shelters + ad-hoc free-entry per stop; no route optimization needed.
- Proof-of-delivery photo is now OPTIONAL (DEL-01 supersedes v1 VOL-05).
- Any involved role (driver / coordinator / volunteer) can confirm a drop delivered (DEL-02).
- Live tracking reuses existing Supabase Realtime + Leaflet/OSM infrastructure — no Google Maps API.
- ETA computation = haversine (free) — no OSRM required but can swap in later.
- No per-delivery headcount; aggregate meals/kg/deliveries only (RPT-01).
- Intake: restaurant self-flag AND coordinator-log-on-behalf; attestation stays; verify flag is optional, never a blocker.
- Phase 11 (Intake) can be worked in parallel with Phase 9 (Runs) — both depend only on Phase 8.
- Notifications remain in-app + email only (free channels); no SMS/WhatsApp for v2.0.
- Payments (Phase 5) remains PARKED; v2.0 adds a possible static UPI/QR link later, not Razorpay.
- Production build target: Linux (Cloudflare CI); avoid platform-specific deps.

### Pending Todos

- [ ] Start /gsd-plan-phase 8 (Dispatch Foundations).
- [ ] Phase 11 can be planned in parallel with Phase 9 once Phase 8 is done.
- [ ] Phase 12 requires both Phase 9 and Phase 11 complete before planning.

### Blockers/Concerns

- **Restaurant login depth TBD**: DISPATCH-CONTEXT flags "whether restaurants need their own login now" as still-to-firm-up. Assumption: coordinator-logged is the default; optional self-serve. Revisit at Phase 11 planning.
- **Stop ordering/optimization TBD**: coordinator manually sets order; no auto-routing. Assumption holds for v2.0.
- **Run pre-planned vs. live-built TBD**: assumed pre-planned, editable mid-run (Phase 9 design must accommodate).
- **Existing blocker (Phase 5 gate)**: Razorpay NGO KYC — still outstanding from v1; not on the v2.0 critical path.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Notifications | SMS via MSG91 (NOT-06) | When funded — needs DLT reg | Roadmap v1 creation |
| Notifications | WhatsApp via MSG91 (NOT-07) | When funded — needs Meta approval | Roadmap v1 creation |
| Payments | Razorpay donation flow (Phase 5) | PARKED — NGO KYC not cleared | Roadmap v1 creation |
| Public | UPI/GPay QR donation link | Maybe post-v2.0 static addition | DISPATCH-CONTEXT |
| Routing | OSRM turn-by-turn for run stops | Free but complex; haversine ETA is enough for v2.0 | v2.0 roadmap |

## Session Continuity

Last session: 2026-06-29
Stopped at: v2.0 roadmap created; REQUIREMENTS.md traceability updated; STATE.md updated
Resume file: .planning/ROADMAP.md
Next action: /gsd-plan-phase 8
