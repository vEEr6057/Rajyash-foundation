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

## v2 Requirements

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
| Multi-stop route optimization | Single-stop model; Ahmedabad scale doesn't need OR-Tools |
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

**Coverage:**
- v1 requirements: 44 total (AUTH 6, DON 6, VOL 6, TRK 4, NOT 5, PAY 4, ADM 6, PUB 4, I18N 3)
- Mapped to phases: 44/44
- Unmapped: 0

---
*Requirements defined: 2026-06-25*
*Last updated: 2026-06-25 — traceability populated during roadmap creation*
