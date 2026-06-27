# Project Research Summary

**Project:** Rajyash Food Porter - Food Rescue Logistics Web App
**Domain:** Nonprofit food-rescue logistics (single org, single city, India)
**Researched:** 2026-06-25
**Confidence:** HIGH overall; MEDIUM on India geocoding accuracy and SMS pricing

---

## Executive Summary

Rajyash Food Porter is a logistics coordination platform - not a social app, not a delivery marketplace. It has one hard invariant: a donor posts surplus food, a volunteer claims and delivers it, and every stakeholder gets reliable status updates. Everything else in the feature list is support scaffolding for that rescue loop. Research across four domains (stack, features, architecture, pitfalls) consistently points to the same conclusion: the right build strategy is a Next.js 15 App Router monolith on Vercel with Supabase Postgres, using Supabase Realtime for live tracking, Clerk for auth, and MSG91 for India SMS/WhatsApp. The architecture is a feature-module monolith with server components by default, server actions for all mutations, and a notification dispatcher with per-channel independent delivery tracking.

The single highest-complexity decision - live pickup tracking - has a clear, budget-correct answer at 200 meals/day scale: 10-15 second client polling backed by Supabase Realtime channels is both technically sound and free. The teams that burn time on this feature always start with WebSockets before the claim flow even works. Build the status machine first; add location display on top.

Three India-specific blockers must be started on day one of the project, not at the end of the auth or notification phases: DLT registration for SMS (7-14 business days lead time), Razorpay KYC for the NGO (3-5 days), and WhatsApp Business template submission to Meta (1-5 days). All three are blocking for production readiness and have lead times that exceed a single sprint. The roadmap must treat them as parallel-track work items, not sequential implementation tasks.

---

## Resolved Stack Conflicts

### Conflict 1: Postgres Host + Realtime Transport

**Decision: Supabase (Postgres host) + Supabase Realtime (channels)**

STACK.md argued for Neon + Pusher Channels. ARCHITECTURE.md and PITFALLS.md argued for Supabase + Supabase Realtime. The Vercel constraint settles it.

Vercel serverless functions cannot hold long-lived connections. Postgres LISTEN/NOTIFY via SSE requires a persistent TCP connection and a function duration beyond Vercel Hobby's 10-second limit. Pusher Channels solves the hosting problem but adds a $49/month paid tier the moment the app grows. Supabase Realtime is already included in Supabase's free tier and was designed exactly for this pattern: subscribe to table changes on location_pings and pickups from the browser via the Supabase JS client, without a persistent server-side connection.

The secondary concern that Supabase bundles services not needed is weak for this NGO context. Supabase Realtime is genuinely useful here; Supabase Auth is not used (Clerk is the auth layer). Using Supabase Postgres instead of Neon costs nothing and eliminates the need for either a Vercel Pro upgrade or a paid Pusher tier. At 200 meals/day scale, 10-15 second polling through Supabase Realtime channels is completely adequate - a rescue takes 20-60 minutes, not 10 seconds.

**Resolved stack for data + realtime:**

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Postgres host | Supabase | Free tier includes Realtime; pooled connections via port 6543; no Vercel SSE problem |
| ORM | Drizzle ORM 0.39.x | ~7.4 KB bundle, native Postgres driver, SQL-transparent |
| Realtime transport | Supabase Realtime channels | Free, no persistent server connection, browser-native subscription |
| Polling fallback | 10-15 second client polling | Adequate at NGO scale; simpler than WebSockets; zero infra cost |

**What this eliminates:** Pusher Channels (saves future $49/month), Vercel Pro upgrade for SSE (saves $20+/month), custom LISTEN/NOTIFY plumbing.

---

### Conflict 2: Maps Stack

**Decision: Leaflet + OpenStreetMap (map display) + Mapbox Geocoding API (address search only)**

STACK.md picked Mapbox GL JS. PITFALLS.md picked Leaflet + OpenStreetMap (free, zero billing risk).

For an NGO, billing risk is not hypothetical - it is decisive. Google Maps 2025 repricing removed the $200 flat credit; an NGO that accidentally puts a geocoding call in a render cycle can generate a four-figure bill overnight. Mapbox is safer but still requires API key management and has paid tiers.

Leaflet + OpenStreetMap tiles is free permanently, requires no API key, and is entirely adequate for displaying a map of Ahmedabad with pickup markers and a moving driver dot. Leaflet via react-leaflet integrates cleanly with Next.js App Router as a client component.

The one place where OSM data quality is a legitimate concern is geocoding - turning a typed address into coordinates. For that specific task only, use Mapbox Geocoding API (100,000 free requests/month) or LocationIQ (5,000/day free, no credit card required). Geocode once at pickup creation time and store the lat/lng in the database. Never call a geocoding API at render time.

**Resolved maps stack:**

| Use case | Choice | Rationale |
|----------|--------|-----------|
| Map display (pickup board, tracking view) | Leaflet + OpenStreetMap | Free, no API key, no billing risk |
| React integration | react-leaflet | Clean SSR-safe client component pattern |
| Address geocoding (pickup creation only) | Mapbox Geocoding API | Called once at creation; result stored in DB |
| Turn-by-turn navigation | Deep link to Google Maps / Apple Maps | One URL, zero cost, device-native |

**Geocoding accuracy caveat:** If Ahmedabad address geocoding proves inaccurate in user testing, fall back to Google Geocoding API ($0.005/request, 40K/month free) as a server-side call at creation time only - never on render.

---

### Conflict 3: Auth - Clerk (confirmed)

No conflict between researchers; all sources converge on Clerk. Phone OTP is first-class in Clerk (no custom SMS provider wiring needed for auth), the free tier covers 10K MAU (well above NGO scale), and @clerk/nextjs v6 is native to Next.js 15 App Router. Clerk routes auth SMS through its own infrastructure, avoiding the DLT registration requirement specifically for OTP delivery. In-app notification SMS (status updates) still requires DLT registration via MSG91.

---

### Conflict 4: SMS/WhatsApp - MSG91 (confirmed)

No real conflict; STACK.md chose MSG91 and PITFALLS.md confirmed it. MSG91 costs Rs 0.15-0.20/SMS vs Twilio at Rs 0.63/SMS (3x more expensive), provides DLT registration assistance, and offers WhatsApp Business API through its Hello product. For an NGO running ~200 rescues/day with 3-4 status SMS notifications per rescue, MSG91 costs roughly Rs 3,600-4,800/month. Twilio would cost Rs 12,000+/month for the same volume.

---

### Conflict 5: Background Jobs - Inngest over Vercel Cron (for durable fan-out)

ARCHITECTURE.md suggested Vercel Cron for simplicity; STACK.md recommended Inngest. Inngest wins for notification fan-out: when a pickup status changes, the system fires email + SMS + WhatsApp + push to multiple recipients. If one channel fails and the function has already returned, there is no retry path with Vercel Cron. Inngest runs as a Next.js route handler (no separate server), provides durable function execution with each notification channel as a separate step, and its 50,000 free runs/month covers all Rajyash notification volume. Vercel Cron remains appropriate for simple scheduled tasks: expire-pickups (every 30 minutes) and purge-location-pings (daily).

---

## Final Resolved Stack

| Layer | Choice | Version | Monthly Cost |
|-------|--------|---------|-------------|
| Framework | Next.js App Router | 15.x | Free (Vercel) |
| Database host | Supabase (PostgreSQL) | Postgres 16 | Free (500 MB) |
| ORM | Drizzle ORM | 0.39.x | Free |
| Migrations | drizzle-kit | 0.31.x | Free |
| Auth | Clerk | 6.x | Free (10K MAU) |
| Realtime / tracking | Supabase Realtime channels | JS client 2.x | Free |
| Map display | Leaflet + react-leaflet | 1.9.x / 4.x | Free |
| Geocoding | Mapbox Geocoding API | REST | Free (100K/mo) |
| Payments | Razorpay | 2.9.x | 2% per transaction |
| Email | Resend + React Email | 4.x | Free (3K/mo) |
| SMS + WhatsApp | MSG91 | HTTP API | ~Rs 3,600-4,800/mo |
| Web Push | web-push (VAPID) | 3.x | Free |
| Background jobs (durable) | Inngest | 3.x | Free (50K runs/mo) |
| Scheduled jobs (simple) | Vercel Cron | -- | Free (2 jobs) |
| File storage | Cloudflare R2 | S3-compat | Free (10 GB) |
| i18n | next-intl | 3.x | Free |
| Forms | React Hook Form + Zod | 7.x / 3.x | Free |
| Server state | TanStack Query | 5.x | Free |
| UI state | Zustand | 5.x | Free |
| UI components | shadcn/ui + Radix + Tailwind | latest | Free |

**Estimated monthly infrastructure cost at v1 scale: ~Rs 3,600-4,800 (MSG91 SMS/WhatsApp only). All other services within free tiers.**

---

## Key Findings

### Expected Features

**Must have for launch (P1):**
- Auth: email sign-in + phone OTP, RBAC (donor / volunteer / admin roles)
- Donor: post pickup request (food type, quantity, location, time window, photo, safety attestation)
- Donor: view / edit / cancel own requests; repeat/quick-repost
- Volunteer: browse available pickups (list + map) + claim (atomic, server-side)
- Volunteer: status progression through 4 states (accepted / en route / picked up / delivered)
- Volunteer: proof-of-delivery photo
- Live GPS tracking during active pickup (volunteer to donor + admin map view)
- Notifications: in-app + push + SMS + WhatsApp on key status events
- Admin: view + filter all pickups, manual assignment, user management, partner management
- Admin reporting: meals rescued, kg by date range, CSV export
- Public landing page with public impact counter
- Money donation via Razorpay/UPI with server-side webhook verification + 80G receipt email
- Volunteer signup from public page
- Responsive mobile-first PWA (volunteers are phone-first, Ahmedabad field use)

**Should have - add post-launch when validated (P2):**
- Recurring/scheduled pickups (when restaurant partners actively request it)
- Volunteer radius/geofencing filter (when volunteer pool grows)
- Gujarati/Hindi i18n (when onboarding non-English-comfortable users at scale)
- Donor impact receipt email (periodic summary)
- Proof-of-delivery photo visible to donor
- Public stories/impact blog

**Defer to v2+ (P3):**
- Volunteer gamification (badges, leaderboards)
- Recurring monetary donations (Razorpay subscriptions)
- Multi-stop route optimization
- Native iOS/Android
- AI volunteer matching
- Multi-city expansion

**Explicitly out of scope for v1 (anti-features):**
- In-app chat between donor and volunteer (WhatsApp link on request detail is sufficient)
- Recipient self-service portal
- Food temperature IoT logging
- Social sharing/Instagram virality features

### Architecture Approach

The architecture is a Next.js App Router monolith with three route groups ((public), (portal), (admin)), feature-module layout under src/features/, server components by default, and server actions as the exclusive mutation path. The data layer is Drizzle ORM over Supabase Postgres, with thin repository wrappers per entity and a service layer for business logic. Notifications are dispatched through a channel-abstracted dispatcher (NotificationChannel interface) so email, SMS, WhatsApp, and push are independently retryable. A status_events audit log is append-only. Location pings are ephemeral (purged 24h post-delivery).

**Five architectural patterns to enforce from day one:**
1. Repository to Service to Server Action layering; no direct DB calls from pages or components
2. Status machine validated in the service layer with an explicit VALID_TRANSITIONS map before any DB write
3. Every server action re-verifies auth and resource ownership inside the action (never rely solely on middleware)
4. Notification rows inserted as pending before sending; updated to sent/failed per channel; cron retries failures
5. Supabase Realtime channel subscription for live tracking (browser subscribes to location_pings table changes on pickup_id); falls back to 10-second polling on disconnect

### Critical Pitfalls

**The five that will break production if ignored:**

1. **DLT non-registration blocks all SMS** - Every SMS template must be registered on TRAI DLT platform before going live. Silent delivery failure in production, no error from the provider. Lead time 7-14 business days. Start on day one of the project, not during the auth sprint.

2. **Razorpay client callback trust - real Rs 7.3 Cr incident** - Never record a donation as captured from the browser onSuccess callback. The Razorpay webhook (payment.captured) is the only authoritative signal. Verify X-Razorpay-Signature HMAC-SHA256 on every webhook delivery. Add a webhook_events table with a unique index on event ID to prevent duplicate donation records.

3. **Browser geolocation stops when phone locks** - navigator.geolocation.watchPosition() stops immediately when the driver screen locks or the tab backgrounds. This is not fixable in a web app. Design the status machine as the primary truth; location is supplementary. Show last updated timestamp when the dot stops moving.

4. **Server Actions are public POST endpoints - IDOR** - Next.js use server is not a security boundary. Every server action must re-verify session, role, and resource ownership before any DB operation. Middleware alone is insufficient.

5. **WhatsApp templates require Meta pre-approval** - Every outbound WhatsApp notification template must be approved by Meta before the notification sprint ends. Approval takes 1-5 business days. Draft all templates at the start of the notification phase and submit immediately.

**Four more that cause operational pain:**

6. **Postgres connection exhaustion** - Use Supabase port 6543 (PgBouncer transaction mode) for all API routes and server actions. Port 5432 only for migrations.

7. **Next.js App Router caching serving stale pickup data** - Mark all pickup/status routes as dynamic = force-dynamic; use no-store cache option on all pickup fetches. Use revalidatePath inside claim/status server actions.

8. **SMS pumping / OTP abuse** - Rate limit the OTP endpoint: 3 OTPs per phone per 10 minutes, 5 per IP per minute. This is part of the auth implementation, not a hardening step.

9. **Low-connectivity field use** - Volunteers in Ahmedabad use mid-range Androids on patchy 3G/4G. Every status transition button needs a loading state and explicit retry on failure. Test the full driver flow on throttled 3G in Chrome DevTools before any phase is marked done.

---

## India-Specific Early Blockers

These three items have external lead times that exceed a sprint. They must be initiated as parallel-track work items from project start, not sequential steps within a phase.

| Blocker | Lead Time | Who Initiates | Dependency |
|---------|-----------|---------------|------------|
| DLT registration (SMS templates) | 7-14 business days | NGO team + MSG91 onboarding | Required before any production SMS; blocks OTP at scale |
| Razorpay KYC (NGO trust registration) | 3-5 business days | NGO admin with 12A/80G certs | Required before money donation feature goes live |
| WhatsApp Business API / Meta verification | 1-5 business days per template | NGO admin + MSG91 Hello BSP | Required before WhatsApp notifications go to production |

All three should be started in Phase 1 (foundation) regardless of whether the features they gate are built in Phase 1.

---

## Implications for Roadmap

### Phase 1: Foundation + Blockers
**Rationale:** Nothing else can be built until the database schema, auth, RBAC, and project structure are in place. India compliance blockers have external lead times; initiate them in parallel here.
**Delivers:** Working project scaffold, Drizzle schema and migrations, Clerk auth with phone OTP and role assignment, middleware RBAC skeleton, shared UI shell, env validation at boot, Supabase connection with pooler, Vercel cron setup.
**Parallel track (non-code):** DLT registration via MSG91, Razorpay KYC submission, WhatsApp template draft and submission.
**Pitfalls to design around:** Supabase connection pooler (port 6543 from day one), Postgres connection limit, SMS DLT registration.
**Research flag:** Standard patterns - no additional research needed.

### Phase 2: Rescue Loop Core
**Rationale:** The rescue loop (post, claim, status progression) is the product. Live tracking, notifications, and payments are all built on top of this. Must be complete before any other feature is started.
**Delivers:** Pickup create/list/claim/status-advance, status machine with VALID_TRANSITIONS, pickup detail page, donor dashboard, volunteer browse + claim UI (mobile-first), proof-of-delivery photo, status_events audit log, all server actions with RBAC + ownership checks.
**Pitfalls to design around:** Server Action IDOR, atomic claim (DB row lock to prevent race conditions), Next.js caching stale pickup data (force-dynamic on pickup routes), low-connectivity field UX.
**Research flag:** Standard patterns.

### Phase 3: Live Tracking
**Rationale:** Depends on active pickups existing. Vercel serverless constraint is resolved by Supabase Realtime.
**Delivers:** location_pings table + repository, volunteer location ping endpoint (POST every 30s while en route or picked up), Supabase Realtime channel subscription in browser, Leaflet map with live marker, last-updated stale indicator, 10-second polling fallback, daily purge cron for location_pings.
**Stack:** Supabase Realtime JS client, react-leaflet, Mapbox Geocoding API (address search at pickup creation only).
**Pitfalls to design around:** Browser geolocation stops on screen lock, over-engineering real-time, geocoding at render time.
**Research flag:** Needs brief research - Supabase Realtime channel subscription API for INSERT events on location_pings filtered by pickup_id.

### Phase 4: Notifications
**Rationale:** Notifications amplify the rescue loop but are not part of it. Build after Phase 2 so all status events exist to trigger on.
**Delivers:** Notification dispatcher with NotificationChannel interface, per-channel adapters (in-app, email via Resend, SMS via MSG91, WhatsApp via MSG91 Hello, push via web-push VAPID), notifications table with per-channel delivery tracking, Inngest durable fan-out, cron retry for failed notifications, in-app notification feed.
**Pitfalls to design around:** Notification fan-out duplicates, WhatsApp template approval (must be complete before this phase ends), DLT registration for status SMS.
**Research flag:** Needs brief research - MSG91 WhatsApp Hello BSP API integration format; Inngest step function pattern for multi-channel fan-out.

### Phase 5: Payments
**Rationale:** Independent of the rescue loop. Scheduled here to allow Razorpay KYC (started in Phase 1) to complete.
**Delivers:** Razorpay order creation server action, donate page (public route group), Razorpay checkout widget, webhook handler with HMAC-SHA256 signature verification, idempotent webhook event dedup table, donations repository, 80G receipt email via Resend, donation history in admin dashboard.
**Pitfalls to design around:** Never trust client callback (webhook is authoritative), Razorpay webhook idempotency, never accept amount from client.
**Research flag:** Standard patterns.

### Phase 6: Admin Portal + Reporting
**Rationale:** Admin features depend on real data from Phases 2-5. Build after core loops are in place.
**Delivers:** Admin route group (pickups list with filters, user management, partner management, reports), impact metrics queries, manual volunteer assignment, CSV export, admin impact dashboard.
**Research flag:** Standard patterns.

### Phase 7: Public Site + Polish
**Rationale:** Can partly parallelize with Phase 6. Largely static and low-risk.
**Delivers:** Public landing page, about/impact pages, public impact counter (cached aggregate), volunteer signup flow, PWA manifest + service worker, push notification subscription UI, i18n scaffold (EN + Gujarati), background cron jobs (expire-pickups, purge-location-pings, retry-notifications), final mobile QA on mid-range Android devices.
**Research flag:** Verify next-intl Gujarati locale setup handles Gujarati script correctly.

### Phase Ordering Rationale

- Foundation first: auth and DB schema are blocking dependencies for every other phase.
- Rescue loop second: it is the product; all other phases add value only if the loop works.
- Tracking third: depends on active pickups; is the highest-risk feature (Vercel constraint, geolocation limitation, scope creep risk).
- Notifications fourth: status events must exist before notification triggers are meaningful; India compliance lead times are already in motion from Phase 1.
- Payments fifth: independent of rescue loop but has its own compliance lead time (Razorpay KYC).
- Admin sixth: requires real data from Phases 2-5 to be useful.
- Public site last: static, low-risk; PWA polish is a final step.

### Research Flags

**Phases that need targeted research before planning:**
- **Phase 3 (Live Tracking):** Supabase Realtime JS client channel subscription API - specifically how to subscribe to INSERT events on location_pings filtered by pickup_id. 1-2 hours of targeted research before the phase spec.
- **Phase 4 (Notifications):** MSG91 WhatsApp Hello BSP API integration format; Inngest step function pattern for multi-channel fan-out.

**Phases with standard, well-documented patterns (skip research-phase):**
- **Phase 1 (Foundation):** Clerk + Next.js 15, Drizzle + Supabase, env validation.
- **Phase 2 (Rescue Loop):** Server actions + RBAC, TanStack Query, Zod validation, status machines.
- **Phase 5 (Payments):** Razorpay Node.js SDK + webhook handler.
- **Phase 6 (Admin):** Standard data table + filter patterns with TanStack Query.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All major choices verified against official docs; Supabase Realtime vs Pusher resolution based on verified Vercel serverless constraint |
| Features | HIGH (core), MEDIUM (India-specific) | Core rescue loop features universal across food rescue platforms; WhatsApp/SMS field behavior from community reports |
| Architecture | HIGH (Next.js patterns), MEDIUM (Supabase Realtime detail) | App Router patterns verified; Supabase Realtime subscription pattern needs brief implementation-level check |
| Pitfalls | HIGH | Most pitfalls verified against official docs or documented real incidents (Razorpay Rs 7.3 Cr, Chrome geolocation, DLT mandate) |

**Overall confidence: HIGH**

### Gaps to Address

- **Supabase Realtime for location_pings:** The recommendation to subscribe to table-level INSERT events filtered by pickup_id is architecturally sound, but the exact JS client API should be confirmed before Phase 3 spec.
- **India geocoding accuracy for Ahmedabad:** Mapbox/OSM geocoding quality for Gujarati street names assessed from community reports, not direct testing. Validate in a Phase 3 spike; LocationIQ is the fallback.
- **Razorpay KYC for NGO Trust:** The exact onboarding flow for NGO Trust accounts should be confirmed with Razorpay support during Phase 1.
- **FSSAI compliance status:** India has no Good Samaritan equivalent for donated food. The NGO legal advisor should review FSSAI obligations before v1 launch. This is an NGO task, not a development task.

---

## Sources

### Primary (HIGH confidence)
- Supabase official docs - free tiers, connection pooling, Realtime channels
- Clerk docs (clerk.com/docs) - App Router integration, phone OTP, India support
- Razorpay docs - webhook validation, HMAC-SHA256 signature, Node.js SDK
- Razorpay Rs 7.3 Cr incident (inc42.com) - client callback trust anti-pattern
- Vercel KB - WebSocket / serverless function limitation (vercel.com/kb)
- Chrome Geolocation background behavior - Chromium issue tracker
- Next.js security blog - Server Actions as public endpoints, IDOR
- TRAI DLT mandate - India SMS regulation (messagecentral.com/sms-guideline/india)
- DLT October 2024 URL whitelisting update (talk-q.com)
- Cloudflare R2 pricing - zero egress, 10 GB free
- Inngest pricing - 50K free runs/month
- Resend pricing - 3K free emails/month

### Secondary (MEDIUM confidence)
- MSG91 vs Twilio India pricing comparison (messagecentral.com/blog)
- WhatsApp Business API template approval rules India (whatsboost.in)
- Food rescue platform feature analysis - Food Rescue US, Food Rescue Hero, Careit, Olio, Copia
- Mapbox India geocoding quality - community reports (not direct testing)
- FSSAI surplus food regulations - nutritionconnect.org

### Tertiary (LOW confidence - needs validation during implementation)
- Supabase Realtime location_pings subscription pattern - architecturally inferred, needs API-level confirmation
- Ahmedabad 3G/4G field connectivity impact - general India mobile data quality reports

---
*Research completed: 2026-06-25*
*Ready for roadmap: yes*
