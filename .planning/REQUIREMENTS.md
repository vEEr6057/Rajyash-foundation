# Requirements: Rajyash Food Rescue

**Defined:** 2026-06-25
**Core Value:** A donor can post surplus food and a volunteer can reliably claim, pick up, and deliver it to people in need — the rescue loop must work end to end.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign in with email
- [ ] **AUTH-02**: User can sign in / verify via phone OTP
- [ ] **AUTH-03**: OTP requests are rate-limited (per phone and per IP) to prevent SMS abuse
- [ ] **AUTH-04**: Users have a role (donor / volunteer / admin) that gates access to features
- [ ] **AUTH-05**: Every server action re-verifies session, role, and resource ownership (no IDOR)
- [ ] **AUTH-06**: User session persists across browser refresh

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
- [ ] **NOT-03**: System sends an SMS on key status events (DLT-registered templates)
- [ ] **NOT-04**: System sends a WhatsApp message on key status events (Meta-approved templates)
- [ ] **NOT-05**: Notifications dispatch through one channel-abstracted layer, each channel independently retryable
- [ ] **NOT-06**: Failed notification deliveries are retried and de-duplicated (no double sends)

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
- [ ] **I18N-03**: SMS and WhatsApp templates are registered/approved in each supported language
- [ ] **I18N-04**: Gujarati and Hindi scripts render correctly (next-intl locale setup verified)

## v2 Requirements

### Donor / Volunteer enhancements

- **REC-01**: Recurring / scheduled pickups for repeat restaurant partners
- **GEO-01**: Volunteer radius / geofencing filter for nearby pickups
- **DON-07**: Periodic donor impact-receipt email summary
- **VOL-07**: Proof-of-delivery photo visible to the donor

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

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (to be filled by roadmapper) | | |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: (pending roadmap)
- Unmapped: (pending roadmap)

---
*Requirements defined: 2026-06-25*
*Last updated: 2026-06-25 after initial definition*
