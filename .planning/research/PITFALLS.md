# Pitfalls Research

**Domain:** Food-rescue logistics web app (Next.js + Postgres, India/NGO)
**Researched:** 2026-06-25
**Confidence:** HIGH (most pitfalls verified against official docs or known incidents)

---

## Critical Pitfalls

### Pitfall 1: Web Geolocation API Dies the Moment the Driver Locks Their Phone

**What goes wrong:**
The browser's `navigator.geolocation.watchPosition()` immediately stops delivering updates as soon as the tab goes to the background, the screen locks, or the user switches apps. This is not a bug — it is documented, intentional behavior across Chrome, Safari, and Firefox on mobile. The Geolocation API is also unavailable in Service Workers, so there is no background fallback. A driver who pockets their phone while en route will appear frozen on the map within seconds.

**Why it happens:**
Teams prototype desktop-first, where the tab stays visible. The limitation is invisible until field testing with an actual phone.

**How to avoid:**
- **Accept the constraint explicitly in v1**: real-time driver location only works while the driver has the browser open and the screen on. Document this to stakeholders before promising "live tracking."
- Instruct drivers to keep the screen active (enable "stay awake" mode) or use a phone holder in the vehicle.
- As a UX mitigation, show a "last known location" timestamp and a stale indicator so recipients are not confused when the dot stops moving.
- Design the data model around status transitions (requested → accepted → picked up → delivered) as the primary truth. Location is supplementary — a driver can complete a delivery without a single GPS update and the rescue loop still works.
- PWA with persistent background location requires a native bridge (React Native / Capacitor). This is a post-v1 decision, but leave room for it in the data model now.

**Warning signs:**
- Demo works perfectly on desktop, falls apart in field testing.
- Stakeholders assume "live tracking" means continuous GPS like Zomato/Swiggy (those are native apps).

**Phase to address:** Tracking/real-time phase. Before building, lock in the explicit scope: "location updates while screen is active."

---

### Pitfall 2: Trusting Razorpay's Client-Side Callback for Payment Confirmation

**What goes wrong:**
A known 2022 incident (₹7.3 Cr stolen) involved attackers tampering with authorization data in the browser on merchant sites using an older/incorrect Razorpay integration. The attack pattern: intercept the client-side `onSuccess` callback and forge a success response. The server records a donation as paid without verifying the signature or fetching the actual payment status from Razorpay's API.

**Why it happens:**
Razorpay's JavaScript SDK fires an `onSuccess` handler in the browser. Developers trust this handler and record the payment. This is the example in many tutorials and is incorrect for production.

**How to avoid:**
- **Never trust the client callback.** The `onSuccess` handler in the browser should do nothing but redirect to a "processing" page.
- On the server (a Next.js Route Handler), verify the Razorpay signature: `razorpay_order_id + "|" + razorpay_payment_id` signed with the webhook secret using HMAC-SHA256, compared against `razorpay_signature`.
- **Separately**, use webhooks as the authoritative source. Razorpay fires `payment.captured` webhook events server-to-server, independent of the browser session.
- Fetch the actual payment amount from Razorpay's API (`/v1/payments/:id`) before crediting — do not trust the amount the client sends.
- Record the Razorpay `order_id` and `payment_id` together on the server before the order is created, so you can reconcile later.

**Warning signs:**
- Payment recording happens in a client-side callback or an API route that takes `amount` from the request body.
- No webhook endpoint exists or it is commented out ("will add later").

**Phase to address:** Payment integration phase. Signature verification is a day-one requirement, not a hardening step.

---

### Pitfall 3: Razorpay Webhooks Without Idempotency = Duplicate Donation Records

**What goes wrong:**
Razorpay uses at-least-once delivery for webhooks with exponential backoff retries for 24 hours. If your webhook handler takes more than 5 seconds to respond, Razorpay marks it as timed out and retries. If processing a payment takes 6 seconds (slow DB write, external notification send), you will get duplicate `payment.captured` events and create duplicate donation records.

**Why it happens:**
Developers build the happy path: receive webhook → write to DB → return 200. No deduplication. Works in testing (single delivery), breaks in production under load or transient slowness.

**How to avoid:**
- Create a `webhook_events` table with a unique index on Razorpay's event ID (`event.id` in the payload).
- Handler pattern: verify signature → insert event ID with `ON CONFLICT DO NOTHING` → return 200 immediately → process asynchronously (or in a background task after the response).
- The return-200-fast rule is critical: respond within 2 seconds, do the heavy work after.
- If duplicate-event processing does occur, it must be a no-op (update where status != 'captured').

**Warning signs:**
- Webhook handler performs DB writes or sends notifications before returning a response.
- No `webhook_events` dedup table in the schema.
- Donation count doesn't match Razorpay dashboard totals.

**Phase to address:** Payment integration phase, specifically when wiring the webhook endpoint.

---

### Pitfall 4: Google Maps Billing with No Spending Cap = NGO Budget Shock

**What goes wrong:**
Google Maps Platform requires a credit card and has no default spending cap. The $200/month free credit covers roughly 28,500 map loads or 40,000 geocoding requests. A field use scenario with 20 volunteers each refreshing a map 10 times per delivery, across 50 deliveries/day = significant map load counts. A runaway polling loop (location updates firing map reloads) can exhaust the free tier within days and generate unexpected bills. One improperly cached geocoding call in a rendering hot path can cost hundreds of dollars overnight.

**Why it happens:**
The $200 credit feels generous during development (low traffic). Teams do not set budget alerts or spending limits.

**How to avoid:**
- **Prefer a zero-billing-risk alternative.** Use LocationIQ (5,000 geocoding requests/day free, no credit card required for free tier) or Mapbox (100,000 map loads/month free) for the map display. Reserve Google Maps only if absolutely required for a specific API.
- If using Google Maps: set a monthly budget alert at ₹100 (near zero), enable billing alerts via email, and set a hard budget cap in Google Cloud Console.
- Cache every geocode result in Postgres. Never geocode the same address twice. Ahmedabad pickup locations repeat — donors and recipients often use the same neighborhood landmarks.
- Never trigger a geocoding API call inside a React render cycle or a polling loop. Geocode once, store the result.
- For the map display: consider Leaflet.js + OpenStreetMap tiles (fully free, no API key, no billing). Adequate for Ahmedabad city-scale food rescue.

**Warning signs:**
- No billing alert configured in Google Cloud Console.
- Geocoding called on every page render rather than at pickup creation time.
- No `geocoded_at` + coordinates columns in the pickups table.

**Phase to address:** Maps/tracking phase. Choose the map stack before writing a single line of map code.

---

### Pitfall 5: SMS OTP Blocked by TRAI DLT Non-Registration

**What goes wrong:**
India's TRAI mandates that all entities sending OTP SMS must register their organization, sender header (e.g., `RJYSHF`), and every SMS template on the DLT (Distributed Ledger Technology) platform before sending. Since October 2024, any SMS containing a non-whitelisted URL is silently blocked — the sender gets no error, the message simply never arrives. An OTP that never arrives breaks sign-in for every field user. This is not an SMS provider issue; it is a regulatory compliance gate.

**Why it happens:**
Teams pick an SMS provider, get test OTPs working (provider may bypass DLT in sandbox), and go to production only to find messages silently dropped by Indian telecom operators.

**How to avoid:**
- DLT registration is step one, before choosing an SMS provider. Register the entity on any DLT platform (Vodafone, Airtel, JIO, TATA, BSNL — any one suffices).
- Register the sender header (6-character) and the OTP template (e.g., `Your Food Porter OTP is {#var#}. Valid for 10 minutes.`). Variables must be typed (OTP category).
- Use an India-native provider (MSG91, 2Factor, SMSCountry) that handles DLT submission on your behalf. Pricing is ₹0.15–₹0.28/OTP vs ₹0.45+ for Twilio after forex conversion.
- DLT approval takes 1–3 business days. Budget this in the auth phase timeline.
- Add OTP delivery monitoring (track send vs. received rates) from day one so you detect silent drops quickly.

**Warning signs:**
- OTPs work in development but fail for specific users in production.
- Delivery rate significantly below 95% without an error response.
- SMS provider sandbox bypasses DLT requirements (common with Twilio sandbox).

**Phase to address:** Auth phase, week one — DLT registration must start before SMS code is written.

---

### Pitfall 6: WhatsApp Business API Templates Require Pre-Approval — Plan 2+ Weeks Ahead

**What goes wrong:**
Every business-initiated WhatsApp message sent outside a 24-hour customer service window requires a pre-approved template. You cannot send "Your pickup was delivered!" unless Meta has approved that exact template. Approval typically takes 24 hours for simple templates but can take longer for complex or rejection-prone ones. If your notification strategy depends on WhatsApp for driver/donor updates and templates aren't approved at launch, you have no notifications at all.

Additionally, WhatsApp accounts can be flagged or suspended if message quality drops (high block/report rates). Sending unsolicited messages or exceeding rate limits causes number suspension.

**Why it happens:**
Teams design the notification flow assuming WhatsApp works like SMS — send anything, anytime. The approval constraint is discovered at integration time.

**How to avoid:**
- Design all WhatsApp notification templates early (what the messages say, variable positions) and submit for approval during the development phase, not after.
- Build notifications in this priority order: in-app → email → SMS → WhatsApp. WhatsApp is an enhancement, not the foundation. The rescue loop must work without it.
- Use a BSP (Business Solution Provider) like Interakt, AiSensy, or Wati that simplifies template management for India. Avoid direct Meta Cloud API unless you have engineering bandwidth for it.
- In v1, use the 24-hour conversation window (user-initiated messages get free-form replies) where possible; outbound templates only where necessary.
- Never send WhatsApp messages unless the user has explicitly opted in.

**Warning signs:**
- WhatsApp notifications are the primary notification channel in design documents.
- No WhatsApp templates submitted to Meta before the notification sprint starts.

**Phase to address:** Notifications phase. Template drafting must happen in parallel with coding, not after.

---

### Pitfall 7: Next.js on Vercel Cannot Hold WebSocket Connections

**What goes wrong:**
Vercel's serverless model means every request gets a fresh function invocation that terminates after responding. A persistent WebSocket connection requires a long-lived process. This is not a configuration gap — it is fundamental to the serverless execution model. Any attempt to use Socket.io or raw WebSockets in a Next.js API Route on Vercel will fail in production (works locally because local dev is a real Node process).

**Why it happens:**
Local development uses a persistent Node.js process, so WebSockets "just work." The gap is invisible until deployment.

**How to avoid:**
- **Do not build a custom WebSocket server on Vercel.** Use a managed real-time service.
- Recommended for NGO budget: **Supabase Realtime** (already included if using Supabase Postgres — free tier includes Realtime channels). Alternatively, **Ably** or **Pusher** (both have free tiers sufficient for single-city food rescue volume).
- For the pickup tracking use case specifically: Server-Sent Events (SSE) via a long-polling Route Handler is a viable alternative for one-way server→client updates (status changes, location pings). SSE works on Vercel with careful timeout handling (Vercel function timeout is 10s on Hobby, 60s on Pro).
- Polling at 10–15 second intervals is perfectly adequate for food rescue tracking. A driver's location does not need sub-second precision. Polling is simpler, cheaper, and avoids the WebSocket problem entirely.

**Warning signs:**
- `socket.io` appears in package.json for a Vercel-hosted app.
- WebSocket implementation works locally but gives connection errors after deployment.

**Phase to address:** Tracking phase, architecture decision before any real-time code is written.

---

### Pitfall 8: Next.js App Router Caching Serving Stale Pickup Data

**What goes wrong:**
Next.js App Router has four caching layers: Request Memoization, Data Cache, Full Route Cache, and Router Cache. The Data Cache persists `fetch()` responses between deployments and requests by default. The Router Cache (client-side) holds old React Server Component payloads so navigating back to a pickups list shows data from minutes ago. For a food rescue app where pickup status changes in real time, serving stale data means a volunteer sees a pickup as "available" that was just claimed by someone else.

**Why it happens:**
Next.js 14 defaulted to aggressive caching. Next.js 15 changed some defaults (dynamic pages no longer cached client-side by default), but the Data Cache behavior still surprises teams. The interaction between all four caches is non-obvious.

**How to avoid:**
- For all pickup/user data fetches: opt out of the Data Cache explicitly with `{ cache: 'no-store' }` or `revalidate: 0` at the fetch level. Do this from the start; adding it later requires auditing every data fetch.
- For pages that show time-sensitive state (pickup board, tracking view): mark the route as dynamic with `export const dynamic = 'force-dynamic'`.
- Use TanStack Query (already in project conventions) for client-side data that needs automatic refetching. Let TanStack Query own freshness, not Next.js caching.
- When a volunteer claims a pickup: use `revalidatePath('/pickups')` in the Server Action so other users' clients see the update on next navigation.
- Test caching behavior explicitly: two browser tabs, one claims a pickup, verify the second tab shows it as claimed within one polling cycle.

**Warning signs:**
- Pickup list shows stale claimed/available status.
- Changes made in one browser session take minutes to appear in another.
- Cache behavior is tested only in development mode (Next.js disables much caching in dev).

**Phase to address:** Pickup management phase (first phase that has mutable, shared state).

---

### Pitfall 9: Server Actions Are Public POST Endpoints — IDOR Without Authorization

**What goes wrong:**
Next.js Server Actions are compiled to unique HTTP POST endpoints reachable by anyone who can find the endpoint URL (or enumerate them). A Server Action like `claimPickup(pickupId)` that does not verify the requesting user's role and ownership before acting is an IDOR vulnerability — any authenticated user (or unauthenticated user if the action doesn't check auth) can claim, cancel, or modify any pickup by POSTing to the action endpoint. Middleware alone does not protect Server Actions (Middleware runs at the edge for routing, not as a security boundary).

**Why it happens:**
Developers assume that because a Server Action is defined in a file with `'use server'`, it is somehow protected. It is not. It is a POST endpoint.

**How to avoid:**
- Every Server Action that modifies data must begin with: (1) verify the session exists, (2) verify the user has the required role, (3) verify the user owns or is permitted to act on the specific resource.
- Extract this into a Data Access Layer (DAL) — a set of functions that always re-check auth before touching the DB. Call DAL functions from Server Actions, never raw Prisma/DB calls.
- Treat Server Actions identically to API Route Handlers from a security standpoint.
- For pickup claiming: verify `pickup.status === 'available'` AND no one else has claimed it in a single atomic DB transaction (using `FOR UPDATE` lock or optimistic concurrency), not two separate queries.
- Write an explicit test: log in as a volunteer, get a pickup ID, log out, attempt to POST to the Server Action endpoint — it must fail.

**Warning signs:**
- Server Actions that take resource IDs without fetching and verifying ownership.
- Authorization checked only in Middleware or client-side route guards.

**Phase to address:** Auth/roles phase and every subsequent phase that introduces a Server Action.

---

### Pitfall 10: Postgres Connection Exhaustion on Neon/Supabase Free Tier

**What goes wrong:**
Vercel serverless functions do not maintain persistent database connections. Each function invocation opens a new connection. At low traffic this is invisible; under moderate load (10+ concurrent requests), the free-tier Postgres connection limit (Neon free: 10 concurrent connections; Supabase free: 60 direct connections) is exhausted and new requests fail with "too many connections" errors. This typically surfaces as a sudden production outage at the worst possible moment.

**Why it happens:**
Development runs one connection (local dev server). Staging with 2-3 testers never hits the limit. Production does.

**How to avoid:**
- **Neon**: Use the pooled connection string (hostname contains `-pooler`) for all serverless functions. Use `@neondatabase/serverless` driver with HTTP mode for edge functions; use the pooler string with Prisma/pg for Node.js functions. Do not mix pooled and direct connections.
- **Supabase**: Use port 6543 (transaction mode PgBouncer) for all Next.js API routes and Server Actions. Port 5432 (direct) only for migrations and admin scripts.
- Set `connection_limit: 1` in Prisma's datasource or use a singleton pattern for the Prisma client (Next.js hot-reloads modules in dev; each reload creates a new client with its own connection pool).
- The Prisma singleton pattern for Next.js: store the PrismaClient on `globalThis` in development, create a single instance in production.
- Monitor connection count from day one via Neon/Supabase dashboards before going live.

**Warning signs:**
- "Connection limit exceeded" or "too many clients" errors under moderate load.
- `new PrismaClient()` called at module level in multiple files (creates multiple pools).
- No `-pooler` suffix in the Neon connection string used by API routes.

**Phase to address:** Infrastructure/auth phase when the DB connection pattern is first established. Fix this once, correctly.

---

### Pitfall 11: SMS Pumping / OTP Abuse Without Rate Limiting

**What goes wrong:**
A phone OTP login endpoint without rate limiting is an invitation to SMS pumping attacks: a bot requests OTPs for thousands of phone numbers, generating SMS costs at ₹0.15–₹0.28 per message. 10,000 requests = ₹1,500–₹2,800 in one attack. For an NGO, this can exhaust the monthly SMS budget in minutes. The attack is particularly common on forms with phone input because phone numbers are easy to enumerate.

**Why it happens:**
Rate limiting is treated as a "hardening step" added after launch.

**How to avoid:**
- Rate limit the OTP send endpoint at multiple levels: per-phone-number (max 3 OTPs per 10 minutes), per-IP (max 5 requests per minute), and globally (circuit breaker if total sends spike).
- Add a CAPTCHA or proof-of-work challenge on the OTP request form.
- Monitor SMS spend via provider dashboard alerts (MSG91/2Factor both support spend alerts).
- Implement exponential backoff on the OTP form: after 2 failed OTPs, add a cooldown before allowing another request.
- Log every OTP request with phone number, IP, and timestamp in Postgres for abuse detection.

**Warning signs:**
- OTP endpoint has no rate limiting middleware.
- SMS spend significantly higher than expected user count would explain.
- OTP requests from unfamiliar Indian area codes or international numbers.

**Phase to address:** Auth phase — rate limiting is part of the OTP implementation, not an afterthought.

---

### Pitfall 12: Food Safety Liability — No Legal Shield in India for Donated Food

**What goes wrong:**
India has FSSAI's "Save Food, Share Food, Share Joy" guidelines and the 2019/2021 surplus food regulations, but there is currently no federal liability protection for food donors or food recovery organizations equivalent to the US Good Samaritan Food Donation Act. If a recipient becomes ill from donated food redistributed via the platform, the NGO and potentially the platform could face legal exposure. The app's audit trail (who donated what, who delivered it, timestamps) becomes evidence in either direction.

**Why it happens:**
Technology teams focus on the logistics problem and assume legal/liability questions are for the NGO's trustees.

**How to avoid:**
- The platform must record: donor identity, food type/description, pickup time, and delivery time for every rescue.
- Add a donor acknowledgment at pickup creation: "I confirm this food is safe for consumption and within acceptable freshness window." This is a checkbox in the form backed by a DB boolean with timestamp — not a legal shield, but creates a record of donor representation.
- Never allow anonymous food donations (donor must be identified).
- Consult the NGO's legal advisor before launch specifically on FSSAI compliance requirements and whether Rajyash Foundation needs its own FSSAI registration as a food recovery organization.
- Do not store sensitive recipient health data on the platform. Recipients are served by volunteers/admin — the app does not need to know recipient details beyond delivery location.

**Warning signs:**
- Donor submissions have no confirmation step or acknowledgment.
- No timestamp audit trail on pickup and delivery events.

**Phase to address:** Pickup management phase (donor submission flow). Legal consultation should happen before v1 launch.

---

### Pitfall 13: Over-Engineering Real-Time When Status Polling Is Sufficient

**What goes wrong:**
Teams invest weeks building WebSocket infrastructure, location streaming, and real-time dashboards for an app that has 5–20 concurrent active deliveries at peak. The complexity cost (WebSocket service, connection management, state synchronization) is not justified by the scale. Meanwhile, core features (notifications, admin dashboard, reporting) are deferred or rushed.

**Why it happens:**
"Live tracking" sounds like it means continuous real-time GPS streaming, so teams reach for WebSockets and complex infrastructure. The actual user need is: "can I see roughly where the driver is and when the pickup status changed?"

**How to avoid:**
- Status changes (the rescue loop) do not need real-time. A status update triggers a push notification, which pulls the user back to the app. This is adequate for food rescue.
- Location updates during active delivery: poll every 10–15 seconds from the client. At 20 concurrent deliveries with 15-second polling, that is 80 requests/minute — trivially handled by Vercel serverless.
- Build the status transition system first, fully. Add location display as a layer on top. Verify with actual NGO users that location matters before building a complex tracking system.
- Use Supabase Realtime (free, already paid for) or simple 10-second polling before reaching for Pusher/Ably.

**Warning signs:**
- WebSocket server is being built before the pickup claim flow works end-to-end.
- Architecture diagrams show message brokers (Redis pub/sub, Kafka) for a single-city NGO app.

**Phase to address:** Tracking phase — define the minimum viable tracking before building it.

---

### Pitfall 14: Low-Connectivity Field Use — Volunteers on Patchy Ahmedabad 3G/4G

**What goes wrong:**
Ahmedabad volunteers driving in older city areas, industrial estates, or during peak hour network congestion will have intermittent connectivity. A pickup workflow that requires a stable connection to advance status (e.g., clicking "Picked Up" fires a network request, which times out, leaving the pickup in limbo) frustrates volunteers and creates incorrect data. A status update that appears to succeed locally but fails silently means the donor and admin see a different state than the driver.

**Why it happens:**
Development and testing happens on office WiFi. Field testing on mobile data in actual pickup locations is skipped.

**How to avoid:**
- Status transitions must show clear success/failure feedback. Never assume a tap on "Mark as Picked Up" succeeded — wait for server confirmation, show a loading indicator, and show an error with a retry button on failure.
- Design the status UI to be operable in one tap per transition (not multi-step confirmation dialogs that time out mid-flow).
- Use TanStack Query's `retry` option for mutations: automatic retry on network failure with user-visible feedback.
- Cache the current pickup details in the client (TanStack Query's default caching behavior) so the driver can see pickup address and contact details even when offline momentarily.
- Test the full driver flow on a real Android phone with Chrome, on 3G throttling in Chrome DevTools, before any phase is marked done.

**Warning signs:**
- No loading/error states on status transition buttons.
- No retry logic on failed mutations.
- Testing done exclusively on desktop or WiFi.

**Phase to address:** Pickup workflow phase. The volunteer-facing status UI must be designed for intermittent connectivity from the first iteration.

---

### Pitfall 15: Notification Fan-Out Sending Duplicates on Retry

**What goes wrong:**
A status change triggers notifications: in-app, email, SMS, WhatsApp — potentially to donor, volunteer, and admin. If the notification-sending function fails partway through (email sent, SMS fails, exception thrown), and the retry logic re-runs the whole function, the donor receives two emails. At scale or with persistent errors, users receive 5+ identical notifications from exponential retry, which erodes trust and triggers WhatsApp opt-outs.

**Why it happens:**
Notification sends are treated as a single atomic operation. They are not — each channel is an independent external call that can independently succeed or fail.

**How to avoid:**
- Track notification send state per channel per event in a `notifications` table: `(event_id, recipient_id, channel, status)` with a unique constraint. Before sending on a channel, check if it was already sent.
- Send each channel independently with its own try/catch. A failed SMS does not prevent the email from being sent or retried.
- For the MVP: in-app notifications (database rows) and email are the reliable backbone. SMS is best-effort. WhatsApp is enhancement-only.
- Use a simple Postgres-backed job queue (pgboss or similar) rather than in-process notification sending, so retries are persistent across function invocations.

**Warning signs:**
- Notification sending is a single function that sends all channels sequentially.
- No notification delivery log in the database.
- Users report receiving duplicate messages during testing.

**Phase to address:** Notifications phase, architecture step before writing notification code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Trust client-sent payment amount | Faster payment integration | INR fraud exposure (₹7.3 Cr real incident) | Never |
| Skip DLT registration for SMS | OTPs work in sandbox | 100% delivery failure in production | Never |
| No webhook idempotency | Simpler handler code | Duplicate donation records | Never |
| Google Maps without spending cap | Easy setup | Four-figure surprise bill for NGO | Never |
| Skip connection pooling suffix (Neon) | Works locally | Outage under moderate load | Never |
| In-process synchronous notification sends | Simple code | Fan-out duplicates and blocking | MVP only, replace in notifications phase |
| Polling instead of WebSockets | No infra complexity | Slightly higher latency (acceptable for rescue use case) | Acceptable long-term for this scale |
| OpenStreetMap/Leaflet instead of Google Maps | Zero billing risk | Slightly less POI data for Ahmedabad | Acceptable permanently |
| Status-based tracking without GPS | Much simpler to build | Less real-time visual feedback | Acceptable for v1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Razorpay | Record payment in `onSuccess` browser callback | Verify signature server-side; use `payment.captured` webhook as authoritative source |
| Razorpay | Single webhook handler with no dedup | Insert event ID to unique-indexed table before processing |
| Razorpay | Send `amount` from client in order creation | Create Razorpay order server-side with amount from DB; never accept amount from client |
| SMS OTP (India) | Skip DLT registration | Register entity + header + template on DLT platform before writing SMS code |
| SMS OTP | Use Twilio without DLT coordination | Use MSG91/2Factor/SMSCountry which handle DLT natively for India |
| WhatsApp Business | Build notifications assuming no approval needed | Submit all outbound templates to Meta during development; expect 1–3 day approval |
| Google Maps | No billing cap or alert | Set hard budget cap in GCP console; or use Leaflet + OpenStreetMap (free) |
| Google Maps Geocoding | Geocode on every render | Geocode once at pickup creation, store coordinates in DB |
| Neon Postgres | Use direct connection string in serverless functions | Use `-pooler` connection string for all API routes/Server Actions |
| Next.js Server Actions | Trust action is protected because it's `'use server'` | Re-verify auth and ownership inside every action, in a DAL |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Geocoding in render cycle | Geocoding API calls per page load; bill spikes instantly | Geocode at creation time, store in DB | Immediately at any real traffic |
| N+1 queries in pickup list | Pickup board slows as pickup count grows | Eager-load volunteer and donor in the pickups query | ~50+ pickups |
| Polling too aggressively | Vercel function invocations spike; cost increases | 10–15 second intervals; only poll when a delivery is active | When multiple users simultaneously track |
| Direct Postgres connection per serverless invocation | "Too many connections" under load | Use pooler endpoint; Prisma singleton | ~10–20 concurrent requests on free tier |
| Loading all historical pickups | Admin dashboard slows with time | Paginate from the start; never `SELECT *` without `LIMIT` | ~500+ pickups in DB |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trust client-sent payment amount or status | Fraudulent donations recorded as paid | Create Razorpay order server-side; verify via webhook + signature |
| No role check in Server Actions | Any user can claim/cancel any pickup (IDOR) | DAL pattern: re-verify role and resource ownership in every action |
| No OTP rate limiting | SMS pumping drains budget; brute-force OTP guessing | Per-phone + per-IP rate limits; lockout after 3 failed OTPs |
| Expose donor/recipient PII in public API responses | Privacy violation; data scraping | Restrict donor contact details to assigned volunteer only; admin-only for recipient |
| Webhook endpoint without signature verification | Fake payment.captured events | HMAC-SHA256 verify X-Razorpay-Signature before any processing |
| `roles` field sent from client and trusted server-side | Privilege escalation | Always derive role from server-side session; never read from request body |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Status transition button with no feedback | Driver taps "Picked Up," nothing visible happens; taps again, creates duplicate state change | Show spinner during mutation; confirm success with status badge update |
| Showing "live" map when driver has locked phone | Donor watches a frozen location pin for 10 minutes, assumes app is broken | Show "Last updated X minutes ago" label; explain tracking requires screen-on |
| OTP that silently fails (DLT issue) | User cannot log in at all; no error message | Monitor delivery rates; show "SMS not received? Try again or use email" fallback |
| Pickup details hidden until claim | Volunteers cannot evaluate a pickup before claiming it | Show food type, quantity, and approximate area before claiming; show donor contact only after claim |
| WhatsApp notification with no opt-out path | High block rate → number suspension → all WhatsApp notifications stop | Include opt-out in every WhatsApp template; honour opt-outs immediately |

---

## "Looks Done But Isn't" Checklist

- [ ] **Razorpay payment:** Client callback exists — verify webhook endpoint ALSO exists and is the authoritative record
- [ ] **Razorpay webhook:** Handler returns 200 — verify idempotency table exists and is checked before processing
- [ ] **OTP login:** OTPs arrive in testing — verify DLT registration is live (not sandbox bypass) before production
- [ ] **Location tracking:** Works on desktop — verify tested on real Android phone with screen locked
- [ ] **Pickup claiming:** Works for one user — verify race condition tested with two simultaneous claim attempts
- [ ] **Server Actions:** Action runs — verify auth + ownership check happens inside the action, not just in middleware
- [ ] **Notifications:** Sends once in testing — verify idempotent (re-run same event, confirm no duplicate send)
- [ ] **Neon/Supabase connection:** Works locally — verify pooler connection string is used in production environment variables
- [ ] **Maps:** Displays correctly — verify geocoding is not called on render (check Razorpay/Google billing after a day of testing)
- [ ] **WhatsApp templates:** Written in code — verify approved by Meta before sprint is marked done

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate donations from webhook | HIGH | Audit webhook_events vs payments; deduplicate manually; add idempotency retroactively |
| Client callback payment trust exploit | CRITICAL | Freeze donations feature; implement webhook-first flow; audit all past donations against Razorpay dashboard |
| Google Maps billing overrun | MEDIUM | Set hard cap immediately; switch to Leaflet + OSM for map display; keep geocode results in DB |
| DLT non-registration blocks SMS | HIGH | Emergency DLT registration (3–5 days); temporary email-only auth fallback |
| Postgres connection exhaustion | MEDIUM | Switch to pooler connection string; restart Vercel functions; monitor dashboard |
| WhatsApp number suspension | HIGH | Appeal to Meta (days to weeks); fall back to SMS + email; re-submit templates |
| OTP abuse / SMS cost spike | MEDIUM | Add rate limiting immediately; block abusive IPs; check SMS provider for abuse tools |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Browser Geolocation stops in background | Tracking phase (design) | Test on real Android phone with screen locked |
| Razorpay client callback trust | Payment integration phase | No payment is recorded without webhook signature verification |
| Razorpay webhook duplicates | Payment integration phase | Trigger same webhook twice; verify single donation record |
| Google Maps billing blowup | Maps/tracking phase | Map stack decision made before first line of map code; billing alert set |
| SMS DLT non-registration | Auth phase (week 1) | DLT approval confirmed before OTP code ships to production |
| WhatsApp template approval | Notifications phase (design) | Templates submitted to Meta before notifications sprint begins |
| WebSockets on Vercel | Tracking phase (architecture) | No Socket.io in package.json; real-time strategy documented |
| Next.js caching stale data | Pickup management phase | Two-tab test: claim in one, verify other shows claimed within polling interval |
| Server Action IDOR | Auth/roles phase + every phase with actions | Unauthenticated POST to Server Action endpoint returns 401/403 |
| Postgres connection exhaustion | Infrastructure/auth phase | Load test with 20 concurrent requests; verify no connection errors |
| OTP abuse/SMS pumping | Auth phase | OTP endpoint returns 429 after 3 requests per phone per 10 minutes |
| Food safety liability audit trail | Pickup management phase | Every pickup has donor, timestamp, food description, delivery confirmation |
| Over-engineering real-time | Tracking phase (scope) | 10-second polling works; decision to add WebSockets deferred post-v1 |
| Low-connectivity field UX | Pickup workflow phase | Driver flow tested on throttled 3G in Chrome DevTools |
| Notification fan-out duplicates | Notifications phase | Trigger same status change twice; verify single notification per channel |

---

## Sources

- Razorpay webhook validation docs: https://razorpay.com/docs/webhooks/validate-test/
- Razorpay webhook best practices: https://razorpay.com/docs/webhooks/best-practices/
- Razorpay ₹7.3 Cr client-side tampering incident: https://inc42.com/buzz/hacker-steals-inr-7-3-cr-from-razorpay-by-making-false-authorisation-of-payments/
- Chrome Geolocation stops in background (Chromium bug tracker): https://issues.chromium.org/issues/41186218
- Next.js security: Server Actions and IDOR: https://nextjs.org/blog/security-nextjs-server-components-actions
- Next.js data security guide: https://nextjs.org/docs/app/guides/data-security
- Vercel WebSocket limitation (official KB): https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
- Neon connection pooling: https://neon.com/docs/connect/connection-pooling
- Supabase + Vercel connection pooling: https://www.iloveblogs.blog/guides/supabase-connection-pooling-vercel
- Next.js App Router caching (official blog): https://nextjs.org/blog/our-journey-with-caching
- India SMS DLT registration (TRAI / Message Central): https://www.messagecentral.com/sms-guideline/india
- India DLT October 2024 URL whitelisting update: https://talk-q.com/sms-messaging-regulation-in-india
- MSG91 vs Twilio India pricing: https://www.messagecentral.com/blog/twilio-verify-alternative-india
- WhatsApp Business API template approval: https://whatsboost.in/blog/whatsapp-api-template-approval-rules-every-indian-business-must-know-2026-guide
- Google Maps billing and alternatives: https://radar.com/blog/google-maps-api-cost
- FSSAI surplus food regulations India: https://nutritionconnect.org/food-safety-standards-authority-india-fssai-guiding-optimisation-surplus-food-donation
- India food donation liability gap: https://atlas.foodbanking.org/country/india/
- Webhook idempotency patterns (Node.js): https://hookdeck.com/webhooks/guides/implement-webhook-idempotency

---

*Pitfalls research for: food-rescue logistics web app (Rajyash Foundation Food Porter)*
*Researched: 2026-06-25*
