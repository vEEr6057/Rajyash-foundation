# Dispatch Bridge — Confirmed Context (from the foundation Q&A, 2026-06-28)

Source: founder answered the [MEETING-QUESTIONNAIRE](MEETING-QUESTIONNAIRE.md) from prior interaction with the
foundation (not a formal meeting — treat as **strong but provisional**; a few items still to firm up).
Supersedes the assumptions in [BRIDGE-PLAN.md](BRIDGE-PLAN.md) where they conflict.

## The real operating model (confirmed)
NGO-coordinated, **twice-daily** ("morning drive + night drive"), **multi-stop runs**:
> A coordinator (whoever's available) assigns a **driver** (paid rickshaw) to a **run**. The driver
> collects surplus from **one or several restaurants**, then distributes to **several destinations** —
> fixed zones, shelters, or ad-hoc roadside spots, "wherever volunteers are." Volunteers (unpaid NGO
> members) help distribute when available; otherwise NGO people do. Operates **365 days**.

## Decisions (Q → decision)
| Area | Answer | Build decision |
|---|---|---|
| **Surplus intake** (Q1) | Both | Restaurant can self-flag **and** coordinator can log on their behalf. |
| **Safety check** (Q2) | Restaurant attests + NGO spot-checks | Keep the safety attestation; add an optional coordinator "verified" note. **No** hard blocking check-status. |
| **Drivers** (Q3) | Paid/hired rickshaw drivers | Add a **driver** role. |
| **Recipients** (Q4, Q7) | Fixed zones + shelters + **mostly ad-hoc** | `destinations` table for the few saved (zone/shelter), **plus ad-hoc free-entry** per stop. |
| **Volunteers** (Q5) | Optional distribution helpers; else NGO members (unpaid) | Volunteer = NGO member who may help distribute; never blocks the run. |
| **Delivery confirm** (Q6) | Anyone present (driver/coord/volunteer); **photo optional** (social only); no per-delivery headcount | **Proof photo NOT required** to mark delivered (change from v1). Confirm by any involved role. |
| **Drive shape** (Q-drive) | **Multi-stop run**: 1 driver ← 1+ restaurants → several drops; coordinator assigns per availability | **NEW: Run model** — a run = driver + ordered **stops** (pickup @ restaurant / drop @ destination). |
| **Tracking** (Q8, Q-eta, Q-phones) | Coordinator + restaurant + volunteer watch; location primary, ETA bonus; drivers *may* close the app | Keep live GPS (foreground) **+** let the coordinator **manually advance** stop status (no hard GPS dependency). |
| **Headcount** (Q-headcount) | Approximate totals only | **No** per-delivery headcount field. Keep aggregate meals/kg/deliveries impact. |
| **Coordinator** (Q-coord) | Whoever's available | Any admin/coordinator can dispatch (no single-dispatcher constraint). |
| **Alerts** (Q-alerts) | Phone calls + in-app/email | In-app + email only (free). Phone is the real coordination. **No** paid SMS/WhatsApp. |
| **Donations** (Q-donations) | Parked | Defer; maybe a static **UPI/GPay link/QR** later (not Razorpay/80G for now). |
| **Budget** (Q-budget) | Strictly free | Free tiers only: OSM/Leaflet, free notifs, `*.pages.dev`. No Google Maps API, no SMS, no native app. |
| **Language** (Q-lang) | English primary | EN-first; GU/HI stay as secondary (already wired). |
| **Scale** (Q-scale) | ~2 runs/day | Low volume — no clustering/scale engineering needed. |
| **Content** (Q-content) | Logo done; numbers later | Keep seed/placeholder impact numbers; real photos/numbers drop in later. |

## The data-model shift (v1 → dispatch)
- **v1:** 1 `pickup` = 1 donor → "people in need"; volunteer self-claims; proof photo gates delivery.
- **dispatch:** coordinator builds a **run** (driver + stops). Reuse the pickup row as a **pickup stop**;
  add **drop stops** (destination). Live-track the driver across the run. Proof photo optional.

## Still to firm up (assumptions flagged — won't block; editable later)
- Exact stop **ordering/optimization** (assume coordinator sets order; no auto-routing).
- Whether a run is pre-planned or built live as the driver goes (assume **pre-planned, editable mid-run**).
- Restaurant **vetting/onboarding** depth (assume coordinator approves partners; minimal self-serve).
- Whether restaurants need their own login now (assume **optional** — coordinator-logged is the default path).
