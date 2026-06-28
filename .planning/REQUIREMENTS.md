# Requirements: Rajyash Food Rescue

**Defined:** 2026-06-25
**Core Value:** A donor can post surplus food and a volunteer can reliably claim, pick up, and deliver it to people in need — the rescue loop must work end to end.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign in with email
- [ ] **AUTH-07**: User can sign in with Google (OAuth) — free, India-friendly, replaces phone OTP as the second factor for v1
- [ ] **AUTH-04**: Users have a role (donor / volunteer / admin) that gates access to features
- [ ] **AUTH-05**: Every server action re-verifies session, role, and resource ownership (no IDOR)
- [ ] **AUTH-06**: User session persists across browser refresh

> **Phone OTP moved to v2.** No free SMS OTP exists for India (Clerk blocks Indian numbers; all providers charge + most need DLT). v1 collects phone as an optional, unverified field at onboarding. See v2 AUTH-02/03.

### Donor

- [ ] **DON-01**: Donor can create a pickup request (food type, quantity, location, time window)
- [ ] **DON-02**: Donor can attach a photo to a pickup request
- [ ] **DON-03**: Donor must complete a food-safety attestation before posting
- [ ] **DON-04**: Donor can view their own pickup requests and statuses
- [ ] **DON-05**: Donor can edit or cancel a request before it is claimed
- [ ] **DON-06**: Donor can quick-repost a previous request

### Volunteer

- [ ] **VOL-01**: Volunteer can browse available pickups as a list
- [ ] **VOL-02**: Volunteer can browse available pickups on a map
- [ ] **VOL-03**: Volunteer can claim a pickup atomically (no double-claim race)
- [ ] **VOL-04**: Volunteer can advance a claimed pickup through statuses (accepted → en route → picked up → delivered), validated against an explicit transition map
- [ ] **VOL-05**: Volunteer can upload a proof-of-delivery photo on completion
- [ ] **VOL-06**: Status transition controls work on patchy mobile networks (loading + retry on failure)

### Tracking

- [ ] **TRK-01**: Volunteer's location is pinged during an active pickup (en route / picked up)
- [ ] **TRK-02**: Donor and admin can view the live pickup location on a map
- [ ] **TRK-03**: The map shows a "last updated" stale indicator when pings stop
- [ ] **TRK-04**: Location pings are purged after delivery (ephemeral, privacy)

### Notifications

- [ ] **NOT-01**: System sends an in-app notification on key status events
- [ ] **NOT-02**: System sends a web push notification on key status events
- [ ] **NOT-03**: System sends an email on key status events (Resend)
- [ ] **NOT-04**: Notifications dispatch through one channel-abstracted layer, each channel independently retryable, with SMS/WhatsApp pluggable later without rework
- [ ] **NOT-05**: Failed notification deliveries are retried and de-duplicated (no double sends)

### Payments

- [ ] **PAY-01**: Public visitor can donate money via Razorpay/UPI
- [ ] **PAY-02**: Donation is recorded only after server-side webhook signature verification (never from client callback)
- [ ] **PAY-03**: Webhook events are idempotent (no duplicate donation records)
- [ ] **PAY-04**: Donor receives an 80G receipt email after a successful donation

### Admin

- [ ] **ADM-01**: Admin can view and filter all pickups
- [ ] **ADM-02**: Admin can manually assign a pickup to a volunteer
- [ ] **ADM-03**: Admin can manage users (view, change role, deactivate)
- [ ] **ADM-04**: Admin can manage donor/partner records
- [ ] **ADM-05**: Admin can view impact reporting (meals rescued, kg, by date range)
- [ ] **ADM-06**: Admin can export reports to CSV

### Public

- [ ] **PUB-01**: Public landing page describes the program
- [ ] **PUB-02**: Public page shows a live impact counter (cached aggregate)
- [ ] **PUB-03**: Visitor can sign up as a volunteer from the public site
- [ ] **PUB-04**: App is an installable, mobile-first PWA

### Internationalization

- [ ] **I18N-01**: All UI is available in English, Gujarati, and Hindi
- [ ] **I18N-02**: User can switch language; choice persists
- [ ] **I18N-03**: Gujarati and Hindi scripts render correctly (next-intl locale setup verified)

## v2.0 Requirements — Dispatch Bridge

> Confirmed from the foundation Q&A (`.planning/DISPATCH-CONTEXT.md`). Adapts v1 to coordinator-dispatched, twice-daily, multi-stop runs. **Supersedes** v1 `VOL-05` (proof now optional → `DEL-01`) and reverses the v1 "single-stop only" exclusion.

### Roles & onboarding
- [ ] **DRV-01**: A `driver` role exists; a user can onboard as a driver (paid rickshaw driver).
- [ ] **DRV-02**: A volunteer (unpaid NGO member) can optionally be attached to a run's distribution — never blocks the run.

### Destinations
- [ ] **DEST-01**: Admin/coordinator can manage a list of saved destinations (zone/shelter: name, area, lat/lng).
- [ ] **DEST-02**: A drop stop can use a saved destination OR an ad-hoc location (free address + map pin).

### Runs & dispatch
- [ ] **RUN-01**: Coordinator (any admin) can create a run (morning/night) and assign one driver.
- [ ] **RUN-02**: Coordinator can add one or more pickup stops (restaurants) to a run.
- [ ] **RUN-03**: Coordinator can add one or more drop stops (saved destination or ad-hoc) to a run.
- [ ] **RUN-04**: Coordinator can reorder/edit a run's stops before and during the run.
- [ ] **RUN-05**: Driver sees their assigned run as an ordered list of stops ("My run").
- [ ] **RUN-06**: Driver gets one-tap Navigate (Google Maps deep-link) per stop.
- [ ] **RUN-07**: Driver or coordinator can mark each stop done; the run completes when all stops are done.
- [ ] **RUN-08**: Coordinator can manually advance/override a run or stop status (no driver-app dependency).

### Intake
- [ ] **INT-01**: A restaurant (partner) can flag available surplus (food type, quantity, window, location).
- [ ] **INT-02**: A coordinator can log surplus on a restaurant's behalf.
- [ ] **INT-03**: Surplus carries a safety attestation (restaurant) + an optional coordinator "verified" flag.

### Tracking (dispatch)
- [ ] **TRK-05**: Coordinator, restaurant, and volunteer can watch a run's driver live location while the app is open.
- [ ] **TRK-06**: The run map shows route + ETA to the next stop (free OSRM/haversine); current location is primary.

### Delivery & reporting
- [ ] **DEL-01**: Proof-of-delivery photo is OPTIONAL on a drop (not a gate). (Supersedes VOL-05.)
- [ ] **DEL-02**: Any involved role (driver / coordinator / volunteer) can confirm a drop delivered.
- [ ] **RPT-01**: Impact reporting aggregates meals / kg / deliveries across runs and by destination/partner (no per-delivery headcount).

## Later / Deferred Requirements

### Donor / Volunteer enhancements

- **REC-01**: Recurring / scheduled pickups for repeat restaurant partners
- **GEO-01**: Volunteer radius / geofencing filter for nearby pickups
- **DON-07**: Periodic donor impact-receipt email summary
- **VOL-07**: Proof-of-delivery photo visible to the donor

### Authentication (when funded)

- **AUTH-02**: User can sign in / verify via phone OTP — deferred; cheapest path = **Fast2SMS (no DLT)** or 2Factor as a Clerk custom SMS provider (~₹0.11–0.35/OTP), not MSG91 (which needs DLT)
- **AUTH-03**: OTP requests rate-limited per phone and per IP (ships with AUTH-02)

### Notifications (when funded)

- **NOT-06**: SMS status notifications via MSG91 (needs DLT registration + funding)
- **NOT-07**: WhatsApp status notifications via Meta/MSG91 (needs template approval + ~₹2,000-2,500/mo funding)
- **I18N-04**: SMS/WhatsApp templates registered/approved in each supported language (ships with NOT-06/07)

### Public / engagement

- **PUB-05**: Public stories / impact blog
- **PAY-05**: Recurring monetary donations (Razorpay subscriptions)
- **GAM-01**: Volunteer gamification (badges, leaderboards)

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app donor↔volunteer chat | WhatsApp link on request detail is sufficient; chat is high-maintenance |
| Recipient self-service portal | Recipients served via volunteers/admin; not self-registering users |
| Multi-stop route optimization | Coordinator sets order manually; Ahmedabad scale doesn't need OR-Tools |
| Native iOS/Android apps | Web-first responsive PWA; old native app left behind |
| AI volunteer matching | Small volunteer pool; manual claim works |
| Multi-city / multi-org tenancy | Single org, single city; no RLS/multi-tenant complexity |
| Food temperature IoT logging | Disproportionate to scale; attestation + auto-expiry is the v1 safety layer |
| Animal/plantation/education/Anand Mela programs | This app is Food Porter only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| DON-01 | Phase 2 | Pending |
| DON-02 | Phase 2 | Pending |
| DON-03 | Phase 2 | Pending |
| DON-04 | Phase 2 | Pending |
| DON-05 | Phase 2 | Pending |
| DON-06 | Phase 2 | Pending |
| VOL-01 | Phase 2 | Pending |
| VOL-02 | Phase 2 | Pending |
| VOL-03 | Phase 2 | Pending |
| VOL-04 | Phase 2 | Pending |
| VOL-05 | Phase 2 | Pending |
| VOL-06 | Phase 2 | Pending |
| TRK-01 | Phase 3 | Pending |
| TRK-02 | Phase 3 | Pending |
| TRK-03 | Phase 3 | Pending |
| TRK-04 | Phase 3 | Pending |
| NOT-01 | Phase 4 | Pending |
| NOT-02 | Phase 4 | Pending |
| NOT-03 | Phase 4 | Pending |
| NOT-04 | Phase 4 | Pending |
| NOT-05 | Phase 4 | Pending |
| PAY-01 | Phase 5 | Pending |
| PAY-02 | Phase 5 | Pending |
| PAY-03 | Phase 5 | Pending |
| PAY-04 | Phase 5 | Pending |
| ADM-01 | Phase 6 | Pending |
| ADM-02 | Phase 6 | Pending |
| ADM-03 | Phase 6 | Pending |
| ADM-04 | Phase 6 | Pending |
| ADM-05 | Phase 6 | Pending |
| ADM-06 | Phase 6 | Pending |
| PUB-01 | Phase 7 | Pending |
| PUB-02 | Phase 7 | Pending |
| PUB-03 | Phase 7 | Pending |
| PUB-04 | Phase 7 | Pending |
| I18N-01 | Phase 7 | Pending |
| I18N-02 | Phase 7 | Pending |
| I18N-03 | Phase 7 | Pending |
| DRV-01 | Phase 8 | Pending |
| DRV-02 | Phase 8 | Pending |
| DEST-01 | Phase 8 | Pending |
| DEST-02 | Phase 8 | Pending |
| DEL-01 | Phase 8 | Pending |
| RUN-01 | Phase 9 | Pending |
| RUN-02 | Phase 9 | Pending |
| RUN-03 | Phase 9 | Pending |
| RUN-04 | Phase 9 | Pending |
| RUN-05 | Phase 9 | Pending |
| RUN-06 | Phase 9 | Pending |
| RUN-07 | Phase 9 | Pending |
| RUN-08 | Phase 9 | Pending |
| TRK-05 | Phase 10 | Pending |
| TRK-06 | Phase 10 | Pending |
| DEL-02 | Phase 10 | Pending |
| INT-01 | Phase 11 | Pending |
| INT-02 | Phase 11 | Pending |
| INT-03 | Phase 11 | Pending |
| RPT-01 | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 44 total (AUTH 6, DON 6, VOL 6, TRK 4, NOT 5, PAY 4, ADM 6, PUB 4, I18N 3)
- v2.0 requirements: 20 total (DRV 2, DEST 2, RUN 8, INT 3, TRK 2, DEL 2, RPT 1)
- Mapped to phases: 64/64
- Unmapped: 0

---
*Requirements defined: 2026-06-25*
*Last updated: 2026-06-29 — v2.0 traceability populated during Dispatch Bridge roadmap creation*
