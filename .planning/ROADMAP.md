# Roadmap: Rajyash Food Rescue

## Overview

Seven phases build from nothing to a live food-rescue platform. Phase 1 lays the foundation (schema, auth, Cloudflare wiring). Phase 2 delivers the rescue loop — the product's core value. Phase 3 adds live tracking on top of that loop. Phase 4 connects the notification pipeline (email + web push + in-app). Phase 5 opens monetary donations with Razorpay. Phase 6 gives foundation staff the admin portal and reporting tools. Phase 7 ships the public site, i18n, and PWA polish. At every phase the app is runnable and the previous phase's features remain intact.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold, Drizzle schema, Clerk auth + RBAC, Cloudflare/Supabase wiring, env validation
- [ ] **Phase 2: Rescue Loop Core** - Donor post, volunteer claim, status machine, proof of delivery — the product
- [ ] **Phase 3: Live Tracking** - Volunteer location pings, Supabase Realtime, Leaflet map, stale indicator, privacy purge
- [ ] **Phase 4: Notifications** - In-app, web push, and email dispatcher; channel-abstracted, Inngest fan-out, retry/dedup
- [ ] **Phase 5: Payments** - Razorpay webhook-first donation flow, idempotency, 80G receipt email
- [ ] **Phase 6: Admin Portal + Reporting** - Pickup management, user/partner management, impact reporting, CSV export
- [ ] **Phase 7: Public Site + i18n + PWA** - Landing page, public impact counter, volunteer signup, EN/Gujarati/Hindi, PWA

## Phase Details

### Phase 1: Foundation
**Goal**: Developers can run the app locally with auth, role-based access, and a validated database schema; Cloudflare deployment pipeline is green; Razorpay KYC is submitted (external parallel track)
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. A new user can sign up with email and receive a session that persists across browser refresh
  2. A new user can sign up / log in using phone OTP (Clerk-issued, rate-limited per phone and per IP)
  3. Accessing a donor route as a volunteer (or vice versa) returns a 403; admin routes are inaccessible to non-admins
  4. Every server action stub re-checks session and role before proceeding — no action trusts middleware alone
  5. The app boots and refuses to start if any required env var is missing or malformed
**Plans**: TBD
**UI hint**: yes

### Phase 2: Rescue Loop Core
**Goal**: A donor can post a surplus-food pickup request and a volunteer can claim it, progress it through all statuses, and mark it delivered with a proof photo — the end-to-end rescue loop works
**Depends on**: Phase 1
**Requirements**: DON-01, DON-02, DON-03, DON-04, DON-05, DON-06, VOL-01, VOL-02, VOL-03, VOL-04, VOL-05, VOL-06
**Success Criteria** (what must be TRUE):
  1. Donor can create a pickup request (food type, quantity, location, time window, photo, safety attestation) and see it in their dashboard
  2. Donor can edit or cancel a request that has not yet been claimed; can quick-repost a previous request
  3. Volunteer can browse available pickups as both a list and a map, then claim one — a second simultaneous claim attempt on the same pickup is rejected
  4. Volunteer can advance a claimed pickup through all four statuses (accepted → en route → picked up → delivered); invalid transitions are blocked server-side
  5. Volunteer can upload a proof-of-delivery photo on completion; status transition buttons show loading state and retry on patchy mobile networks
**Plans**: TBD
**UI hint**: yes

### Phase 3: Live Tracking
**Goal**: While a pickup is active (en route / picked up), the donor and admin can watch the volunteer's location move on a live map; the map shows a stale indicator when pings stop; location data is purged after delivery
**Depends on**: Phase 2
**Requirements**: TRK-01, TRK-02, TRK-03, TRK-04
**Success Criteria** (what must be TRUE):
  1. Volunteer's browser pings location every 30 seconds while a pickup is in en route or picked-up status
  2. Donor and admin see the volunteer's location update on a Leaflet map in near-real-time via Supabase Realtime; a 10-second polling fallback activates on disconnect
  3. When pings stop arriving (screen lock, background tab), the map shows a "last updated X minutes ago" stale indicator
  4. After a pickup is marked delivered, all associated location pings are purged from the database (ephemeral, privacy)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Notifications
**Goal**: Key pickup status events automatically trigger in-app, web-push, and email notifications to the relevant parties; failed deliveries retry without producing duplicate sends; the architecture allows SMS/WhatsApp to be added later without rework
**Depends on**: Phase 2
**Requirements**: NOT-01, NOT-02, NOT-03, NOT-04, NOT-05
**Success Criteria** (what must be TRUE):
  1. When a pickup status changes, the affected donor and/or volunteer receive an in-app notification visible in their notification feed
  2. When a pickup status changes, a web push notification appears on the recipient's device (if push permission is granted)
  3. When a pickup status changes, an email is sent via Resend to the relevant party with the status details
  4. All three channels dispatch through a single channel-abstracted layer; disabling or replacing one channel has no effect on the others
  5. A notification that fails to deliver is retried automatically; the system never sends the same notification twice to the same recipient for the same event
**Plans**: TBD
**UI hint**: yes

### Phase 5: Payments
**Goal**: A public visitor can donate money via Razorpay/UPI; the donation is recorded only after server-side webhook signature verification; the donor receives an 80G receipt by email
**Depends on**: Phase 1
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. A visitor on the public donate page can complete a Razorpay/UPI payment and reach a confirmation screen
  2. The donation record is created only when the server receives and verifies the Razorpay webhook with valid HMAC-SHA256 signature — the client callback alone never creates a record
  3. Submitting the same Razorpay webhook event twice (retry/replay) produces exactly one donation record
  4. After a successful donation, the donor receives an email with an 80G receipt
**Plans**: TBD
**UI hint**: yes

### Phase 6: Admin Portal + Reporting
**Goal**: Foundation staff can view and manage all pickups, users, and partners from an admin portal; they can pull impact reports and export data to CSV
**Depends on**: Phase 2, Phase 5
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06
**Success Criteria** (what must be TRUE):
  1. Admin can view all pickups with filters (status, date, donor, volunteer) and manually assign an unassigned pickup to a specific volunteer
  2. Admin can manage users: view list, change a user's role, and deactivate an account
  3. Admin can manage donor/partner records (create, view, edit)
  4. Admin can view an impact report (total meals rescued, kg rescued) filtered by date range, and export the results as a CSV file
**Plans**: TBD
**UI hint**: yes

### Phase 7: Public Site + i18n + PWA
**Goal**: The public landing page is live with a real impact counter and volunteer signup; all UI is available in English, Gujarati, and Hindi with persistent language switching; the app is installable as a PWA
**Depends on**: Phase 1, Phase 6
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):
  1. A visitor to the root URL sees a public landing page describing the food-rescue program, with a live impact counter (meals served, food rescued) sourced from a cached database aggregate
  2. A visitor can click "Become a Volunteer," fill in the signup form, and receive a volunteer account
  3. All user-visible text in the portal, admin panel, and public site is available in English, Gujarati, and Hindi; Gujarati and Hindi scripts render correctly
  4. A user can switch language from any page and the choice persists across sessions
  5. The app passes PWA install criteria: users on mobile can add it to their home screen and launch it as a standalone app
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

Note: Phase 3 (Tracking) and Phase 4 (Notifications) both depend on Phase 2 and can be planned in parallel if needed, but are executed sequentially here for focus.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | - |
| 2. Rescue Loop Core | 0/? | Not started | - |
| 3. Live Tracking | 0/? | Not started | - |
| 4. Notifications | 0/? | Not started | - |
| 5. Payments | 0/? | Not started | - |
| 6. Admin Portal + Reporting | 0/? | Not started | - |
| 7. Public Site + i18n + PWA | 0/? | Not started | - |
