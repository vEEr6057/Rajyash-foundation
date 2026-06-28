# Bridge Plan — v1 → real dispatch model (+ premium redesign)

**Status:** PROPOSAL — pending the foundation's external requirements meeting. Do NOT build the domain changes until confirmed; the questionnaire answers may reshape this. The **premium UI redesign** + **maps/nav** + **tracking precision** tracks are largely model-agnostic and can start now.

**Created:** 2026-06-28 · supersedes nothing (v1 is live).

---

## 1. The gap

**v1 (built):** a *marketplace* — donors self-post surplus → volunteers browse a board → claim → deliver to "people in need." Roles: donor, volunteer, admin.

**Real model (from the foundation):** *NGO-coordinated dispatch* —
restaurant partners have **event leftovers** → flagged (by restaurant or NGO) → **safety check** → **dispatcher assigns a driver (rickshaw)** → driver navigates to the restaurant, picks up → drives to a **slum/roadside zone** → **volunteers distribute** to families. Recipients = **zones**, not individuals.

The bones match (partners, pickups, a status machine, admin-assign, realtime tracking, notifications all exist). The **emphasis** shifts: partner/dispatcher-initiated, dispatcher-driven assignment, zone delivery, a safety checkpoint, driver navigation.

## 2. Changes by area (reuse / change / new)

| Area | v1 today | Bridge change | Effort |
|---|---|---|---|
| **Roles** | donor, volunteer, admin | Add/clarify **driver** (does pickups + drives); volunteers = **distribution** at the zone; admin = **dispatcher**. Restaurant = partner-linked account (optional portal). | change (enum + onboarding) |
| **Surplus intake** | donor self-posts a pickup | **Restaurant flags surplus** (or dispatcher logs it on their behalf). Reframe the "post pickup" form as restaurant-surplus + a dispatcher "log surplus" path. | change (reuse pickup form) |
| **Safety check** | one attestation checkbox | A **quality-check step** before dispatch (who/where TBD from meeting). Possibly a status: `pending_check` → `ready`. | small/new |
| **Dispatch** | volunteer self-claims from board | **Dispatcher assigns a driver** (admin-assign exists → make it the primary flow; board becomes driver's "my runs"). | reuse + reframe |
| **Recipients** | free-text "deliver to people in need" | **Drop zones** — a list of recurring roadside/slum spots; pickup gets a target zone. | new (zones table) |
| **Delivery confirm** | proof photo gates "delivered" | Keep proof photo + add **headcount / served count** (for reporting). | small |
| **Maps / location** | Nominatim + draggable pin | **Google-Maps link OR address → resolve → confirm pin** (restaurant) + **"Navigate" deep-link** (driver → Google Maps app). | new (link parse) + reuse pin |
| **Live tracking** | watchPosition → realtime marker + stale | **Zomato-grade**: high-accuracy GPS, smooth marker interpolation, **route line + ETA**, foreground-only (web). | enhance |
| **Reporting** | servings + kg + deliveries | Add **people served** (from headcount), by zone/partner. | small |

## 3. What stays as-is (leverage)

Auth (Clerk + RBAC + onboarding), Supabase Postgres + Drizzle, server-actions backend on Cloudflare Workers, the status machine + `status_events` audit, notifications (in-app + push + email via Inngest, now live), i18n (EN/GU/HI), admin portal + reporting + CSV, PWA, the stacked-PR + CI deploy pipeline.

## 4. Maps / navigation (decided — free, optimal)

- Restaurant pastes a **Google Maps link** or types an **address** → server resolves to lat/lng (follow `maps.app.goo.gl` redirect → parse `@lat,lng`; or Nominatim geocode) → drop pin on our Leaflet map → **drag to confirm** → store lat/lng + original link.
- Driver **"Navigate"** button → opens the **Google Maps app** with directions (deep link) → real turn-by-turn, **$0 API cost, no billing account**.
- In-app maps (display, confirm, live tracking) stay **free OSM/Leaflet**.

## 5. Live tracking (decided — with a constraint to confirm)

- Web/PWA high-accuracy `watchPosition` → Supabase Realtime (now verified) → smooth interpolated marker + route polyline + ETA card. Dispatcher (and optionally a shareable read-only link) watches.
- **Constraint:** web geolocation stops when the app is backgrounded/phone locked → **foreground-only** tracking (driver keeps the app open during a run). True background tracking needs a **native app** (future). Confirm acceptable at the meeting (Q15).

## 6. Premium UI (parallel track — model-agnostic)

Redesign in **claude.ai/design** per `docs/design/PREMIUM-REDESIGN-BRIEF.md` (whole app: landing, restaurant flag, dispatcher, **driver tracking screen**, volunteer view, splash/loading, states). Engineer reconciles the export to the locked tokens + wires data/i18n/maps/tracking. Can start before the meeting.

## 7. Open questions (gate the build — see the meeting questionnaire)

- Exact flow + who does the safety check (Q1–4).
- Do restaurants use a portal or does the NGO log everything (Q9–10)?
- Drivers: staff vs volunteer, smartphones, app-open-during-trip (Q6, Q15).
- Recipient **zones**: fixed list? who confirms distribution + headcount (Q11–13)?
- Who watches tracking + ETA need (Q14–16).
- Scale, devices, dominant language (Q17–19).
- SMS/WhatsApp? donations/80G? branding/photos/real impact numbers? top-3 must-haves + budget (Q20–24).

## 8. Sequencing

1. **Now (pre-meeting):** premium redesign in claude.ai/design (brief ready); optionally start the **maps link-parse + Navigate deep-link** + **tracking precision** enhancements (model-agnostic). 
2. **Meeting:** user runs the questionnaire → brings answers.
3. **Post-meeting:** GSD **discuss → spec → plan → execute** for the dispatch bridge (roles, intake, zones, dispatch, distribution confirm), informed by the answers. Decide **adapt-v1 vs v2 milestone**.
4. Replace seed data with real numbers; finish launch touchpoints (branch rule, Resend domain, first admin).

## 9. Adapt-v1 vs v2 (recommendation)

**Adapt v1.** The model differences are reframes + additions (zones, driver role, intake path, nav, headcount), not a rewrite — the data model + auth + tracking + notifications + admin all carry over. A clean "v2" milestone label in GSD is fine for organizing the work, but it's an **evolution of this codebase**, not a from-scratch rebuild.
