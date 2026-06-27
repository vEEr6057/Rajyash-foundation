# Feature Research

**Domain:** Food rescue / surplus-food-donation logistics web app (single org, single city)
**Researched:** 2026-06-25
**Confidence:** HIGH (core features), MEDIUM (India-specific and field-use patterns)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the core rescue loop not work or feel broken.

#### Donor Role

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Post a pickup request (food type, quantity, location, time window) | The entry point of the whole loop; nothing works without it | MEDIUM | Multi-step form: food category, estimated quantity (kg/portions), photos optional but expected, pickup address, available from/until window |
| Food photo upload | Every comparable app (Olio, Careit, IFSA) lets donors show the food; text-only feels untrustworthy | LOW | 1-3 photos; compress client-side before upload; store on Cloudinary/S3 |
| Safety attestation checkbox | Donor must confirm food is safe, freshly cooked/prepared, has been stored correctly — standard in Food Rescue US and Copia | LOW | Simple boolean checklist at post time: "Food is safe to eat", "Temperature maintained", "No reheated leftovers past 2h" — not a full temperature log for v1 |
| Time window with expiry | Food has a hard freshness deadline; the app must not show expired requests | LOW | Auto-expire unclaimed requests past the pickup-by time; show countdown to volunteer |
| View my posted requests (history + active) | Basic donor dashboard — Careit and Food Rescue US both surface this | LOW | List view: active / past / expired; status badge per request |
| Edit / cancel a pending request | Restaurants often have changing quantities; cannot lock a donor in | LOW | Only editable before a volunteer claims; cancel triggers volunteer notification |
| Repeat / quick-repost | Restaurants posting daily have the same food, location, time — re-entering everything causes abandonment | MEDIUM | "Post again" prefills previous request fields; donor just adjusts quantity and time window |
| In-app notifications (request claimed, volunteer en route, delivered) | Donor needs to know their food was collected, not just posted | LOW | In-app + push notification on each status change |
| SMS/WhatsApp notification | India field reality: push notifications are missed; WhatsApp is reliable; donors are not always app-open | MEDIUM | Twilio or MSG91 for SMS; WhatsApp Business API for key events (claimed, delivered) |

#### Volunteer / Driver Role

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Browse available pickups (map + list) | Core volunteer action — Food Rescue US, Food Rescue Hero, Careit all start here | MEDIUM | Card list + map pins; show food type, quantity, distance, time window remaining |
| Claim a pickup | Atomic action — one volunteer per request, no double-claims | LOW | Claim must be server-side atomic (DB row lock or optimistic concurrency); show "claimed" status to others immediately |
| Status progression (claimed → en route → picked up → delivered) | Every logistics app (courier, food rescue, delivery) has this; without it admin cannot track anything | LOW | Simple 4-state machine; each transition recorded with timestamp |
| Map/directions to pickup address | Volunteer needs to navigate; inline link to Google Maps / Apple Maps is minimum | LOW | Deep-link to maps app with address pre-filled; no in-app turn-by-turn needed for v1 |
| Proof of delivery (photo) | Careit, courier apps, food bank software all require this; closes the accountability loop | MEDIUM | Photo capture on delivery step; stored with timestamp and GPS coordinate |
| Cancel claimed pickup (with reason) | Volunteers cancel; if no fallback, food is wasted | LOW | Cancel before pickup triggers re-listing; reason required; pattern from Food Rescue Hero |
| My pickups history | Volunteer engagement and sense of impact | LOW | Simple list of completed rescues; kg rescued, meals count |
| Push + SMS/WhatsApp notifications | New rescues near them; admin reassignment; expiry alerts | MEDIUM | See donor notes; same infra |

#### Admin / Foundation Staff Role

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| View all pickups (filterable by status, date, volunteer, donor) | Admin's operational view; every food bank tool surfaces this | MEDIUM | Table with filters; search by donor/volunteer name; date range |
| Manual assignment of volunteer to a request | Coordinator sometimes needs to override or assign directly (new volunteer, urgent pickup) | MEDIUM | Dropdown of available volunteers; triggers notification to assigned volunteer |
| Manage users (view, activate, deactivate, change role) | Standard admin user management | LOW | Role-based: admin can set donor / volunteer / admin roles |
| Manage donor partners (restaurants, caterers, event planners) | Org maintains relationships with repeat donors | MEDIUM | Partner profile: name, address, contact, typical food types, average frequency |
| Reporting: meals rescued, kg of food, rescues by period | Foundation reports this to CSR sponsors and public; Careit and Food Rescue Hero both include this | MEDIUM | Summary stats with date-range filter; export to CSV for v1 |
| Impact dashboard (internal view) | Staff need real-time operational health | MEDIUM | Active requests, unclaimed requests, in-progress, completed today |
| Money donation history / reconciliation | Foundation receives Razorpay donations; staff needs to see records | MEDIUM | List of donations with amount, donor name/email, payment status, Razorpay reference |

#### Public / Visitor Role

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Public landing / awareness page | Every NGO site has this; it is the org's face | LOW | What we do, who we serve, photos, foundation story |
| Public impact counter | Meals served, kg rescued — Careit, Food Rescue Hero, and virtually every NGO site shows this | LOW | Real-time or daily-cached aggregate from DB; displayed prominently on home page |
| Donate money online (Razorpay/UPI) | Explicitly in PROJECT.md; India NGOs increasingly depend on digital giving; UPI is the primary channel | MEDIUM | Razorpay checkout; server-side webhook signature verification; amount selector + custom; 80G receipt email |
| Volunteer signup (public → volunteer role) | Primary volunteer acquisition channel | LOW | Sign up form → pending role → admin approves or auto-approves |
| Contact / reach us | Basic trust signal | LOW | Form or WhatsApp link + email |

#### Cross-Cutting Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Auth: email sign-in + phone OTP | India context: phone OTP is expected for field users (volunteers on mobile); email/password for staff | MEDIUM | Next-Auth or custom; OTP via MSG91 or Twilio; rate-limit OTP attempts |
| Role-based access control | Without RBAC, a volunteer can see admin screens | LOW | Server-side role check on every API route; roles: public, donor, volunteer, admin |
| Live tracking of in-progress pickup | Core v1 requirement (PROJECT.md); donor and admin both want to watch the pickup move | HIGH | Volunteer's browser sends GPS position every 30s via WebSocket/SSE; map shown to donor and admin; battery-aware: only tracks during "en route" and "picked up" statuses |
| Responsive, mobile-first UI | Volunteers and donors are phone-first; Next.js web app must work at 320px | MEDIUM | Tailwind with mobile breakpoints first; test on mid-range Android (4" screens common in field) |
| Basic food-safety workflow | Attestation at post + auto-expiry — minimum viable safety layer | LOW | See donor attestation row above; auto-expire stale requests |

---

### Differentiators (Competitive Advantage)

Features that are not universal across competitor apps but add meaningful value for this context.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| WhatsApp-first notifications | India's dominant communication channel; most food rescue apps use email + push only; WhatsApp reaches illiterate and low-smartphone-literacy donors/volunteers | MEDIUM | WhatsApp Business API (Twilio/360dialog); key events only: claimed, en route, delivered. Not a chat feature — one-way status alerts |
| Gujarati / Hindi i18n | Regional language builds trust with restaurant owners and volunteers who are not comfortable in English | HIGH | next-intl or i18next; at minimum Gujarati for UI labels and notification messages; donor name/address already in Gujarati |
| Recurring scheduled pickups (donor side) | Restaurants and caterers donate daily at the same time; "Set up a recurring rescue" (Food Rescue US does this) reduces daily re-entry and increases retention | MEDIUM | Cron-based auto-creation of pickup requests from a schedule template; donor can pause/cancel the template |
| Volunteer radius / geofencing filter | Volunteers only want rescues within their practical travel distance (auto/bike/walking in Ahmedabad); showing citywide requests causes abandonment | MEDIUM | Volunteer sets home location + max radius; browse page filters by distance; no complex route optimization needed for v1 |
| Public stories / impact blog | Foundation needs to demonstrate CSR impact to Rajyash Group sponsors; storytelling differentiates from pure logistics apps | LOW | Simple CMS-like page: admin posts a story with photo + summary; linked from landing page |
| Donor impact receipt (email summary) | Copia pioneered this; donors get a periodic email: "Your food fed X people this month" — drives retention and repeat donations | LOW | Weekly/monthly batch job; templated email from SendGrid |
| Proof-of-delivery visible to donor | Donor sees the photo taken at delivery; closes the "did it really happen?" trust gap; not all apps show this to donors | LOW | Photo stored with rescue record; accessible from donor's history view |

---

### Anti-Features (Deliberately NOT Build for v1)

Features that seem natural but would bloat scope, introduce risk, or solve problems that don't yet exist for this org at this scale.

| Feature | Why Requested | Why Problematic for v1 | Alternative |
|---------|---------------|------------------------|-------------|
| In-app chat / messaging between donor and volunteer | "What if they need to coordinate?" | Adds real-time chat infrastructure, content moderation risk, and notification complexity out of proportion to the actual need at 200 meals/day scale | WhatsApp number visible on request detail; volunteer has donor's phone number for the duration of the active pickup |
| Route optimization / multi-stop dispatch | Looks like a logistics app should have it | True route optimization (OR-Tools, Google OR) is overkill for a single-volunteer, single-pickup model; Ahmedabad at 200 meals/day doesn't need it | Google Maps link pre-loaded with donor address handles navigation; optimize in v2 if volume justifies |
| Recipient self-service portal | "Recipients should track their food too" | Out of scope in PROJECT.md; recipients are served via volunteers/admin; self-service requires identity verification for vulnerable populations — wrong problem for v1 | Admin records delivery as completed; recipients identified by location/partner agency |
| Native iOS / Android apps | "A mobile app would be better" | Out of scope in PROJECT.md; web app is PWA-installable; building native doubles the codebase for no v1 benefit | Responsive PWA with home-screen install prompt; revisit post-v1 |
| Volunteer gamification (badges, leaderboards, points) | Community engagement tactic | Adds a motivation layer on top of an unproven logistics loop; gamification only works when the base behavior is already happening | Volunteer history page with simple "total rescues" count is sufficient for v1; add in v1.x if retention is a problem |
| Food temperature logging / IoT sensor integration | Food safety purists want this | Far exceeds the actual safety workflow needed; adds hardware dependency; FSSAI compliance in India for food redistribution does not yet mandate IoT logging at NGO scale | Donor attestation checklist (already in table stakes) is the correct v1 safety layer; document that food must be in acceptable condition |
| Multi-language auto-translation | "What if volunteers don't read English?" | Machine translation of dynamic user-entered content (food descriptions) is unreliable and requires review pipeline | Add Gujarati as a static UI language (differentiator above); donor-entered descriptions are short and field-operable even with imperfect language |
| Social sharing / "share a rescue on Instagram" | Engagement and virality | Distraction from the core rescue loop; social sharing increases scope significantly (share cards, OG images, privacy considerations for location data) | Public impact page and donor receipt emails serve the sharing need |
| Subscription / recurring monetary donations | "Let donors set up monthly giving" | Razorpay subscription payments add webhook complexity and recurring billing management; one-time UPI donations are sufficient for v1 | One-time Razorpay checkout covers the v1 funding need; recurring in v1.x |
| Multi-city / multi-tenant expansion | "We might expand to Surat" | Multi-tenant adds significant schema, routing, and permission complexity; PROJECT.md explicitly rules this out | Single-city for v1; expansion is a future milestone decision after the product is proven |
| AI matching / auto-assignment of volunteers | Sounds modern | At 200 meals/day with a small volunteer pool, manual claim + optional admin assignment is sufficient; ML matching requires training data that doesn't exist yet | Volunteer browses and claims; admin can override assign; automate in v2 if claim latency becomes a problem |

---

## Feature Dependencies

```
[Auth: email + phone OTP]
    └──required by──> [Donor: post request]
    └──required by──> [Volunteer: browse + claim]
    └──required by──> [Admin: manage all]

[Donor: post request]
    └──required by──> [Volunteer: browse + claim]
    └──required by──> [Live tracking]
    └──required by──> [Status progression]
    └──required by──> [Proof of delivery]

[Volunteer: claim pickup]
    └──required by──> [Status progression (claimed → en route → picked up → delivered)]
    └──required by──> [Live tracking]
    └──required by──> [Proof of delivery]

[Status progression]
    └──required by──> [Notifications (all channels)]
    └──required by──> [Admin pickup view]
    └──required by──> [Reporting (meals rescued)]
    └──required by──> [Proof of delivery visible to donor]

[Live tracking]
    └──depends on──> [Status progression (only active during en route + picked up)]
    └──depends on──> [Volunteer claim]

[Razorpay money donation]
    └──required by──> [80G receipt email]
    └──required by──> [Admin donation history]
    └──depends on──> [Server-side webhook verification (independent of UI)]

[Reporting: meals rescued]
    └──depends on──> [Status progression (delivered state)]
    └──feeds──> [Public impact counter]
    └──feeds──> [Donor impact receipt email]

[Recurring scheduled pickups (differentiator)]
    └──depends on──> [Donor: post request (base form must exist first)]
    └──depends on──> [Admin: partner management (to know which partners are recurring)]

[Volunteer radius filter (differentiator)]
    └──depends on──> [Volunteer: browse + claim]
    └──depends on──> [Donor location stored on request]

[WhatsApp notifications (differentiator)]
    └──depends on──> [Status progression]
    └──depends on──> [Auth: phone number collected at signup]
```

### Dependency Notes

- **Live tracking depends on status progression being implemented first:** The tracking map must know when to start (en route) and stop (delivered) emitting. Implement status state machine before adding the GPS layer.
- **Notifications depend on both status progression and auth:** Notification routing (push vs SMS vs WhatsApp) requires knowing the user's phone number and device push token — both collected at signup.
- **Public impact counter feeds from reporting aggregates:** Build the reporting query first; the public counter is just a cached read of the same number.
- **Proof-of-delivery visible to donor enhances status progression:** The photo is stored at the "delivered" status transition; the donor view is a read-only display of what's already there.
- **Recurring pickups conflict with manual quick-edit UX:** If a recurring template auto-creates requests, the donor must not accidentally edit the template when they mean to edit today's instance (Food Rescue Hero discovered this and had to redesign). Design "edit this request" vs "edit all future requests" from the start.

---

## MVP Definition

### Launch With (v1)

The complete rescue loop plus public presence and money donation — as stated in PROJECT.md.

- [x] Auth (email + phone OTP, RBAC) — nothing else works without it
- [x] Donor: post pickup request (food type, quantity, location, time window, photo, safety attestation) — loop entry point
- [x] Donor: view / edit / cancel own requests + repeat/quick-repost — basic donor usability
- [x] Volunteer: browse available pickups (list + map) + claim — loop middle
- [x] Volunteer: status progression through 4 states — loop completion
- [x] Volunteer: proof of delivery photo — accountability closure
- [x] Live GPS tracking during active pickup (volunteer → donor + admin map view) — explicitly core in PROJECT.md
- [x] Notifications: in-app + push + SMS + WhatsApp key events — India field reality
- [x] Admin: view + filter all pickups, manual assign, manage users, manage partners — operational control
- [x] Admin + internal impact dashboard — operational health visibility
- [x] Reporting: meals rescued, kg by date range, CSV export — donor/CSR reporting
- [x] Public landing page with impact counter, foundation story — public presence
- [x] Money donation (Razorpay/UPI) with server-side verification + 80G receipt email — funding CTA
- [x] Volunteer signup from public page — volunteer acquisition
- [x] Responsive mobile-first UI — phone-first field use

### Add After Validation (v1.x)

Once the loop is working and volunteers are retaining:

- [ ] Recurring / scheduled pickups — add when restaurant partners ask for it (strong signal they're active)
- [ ] Volunteer radius / geofencing filter — add when volunteer pool grows and browse list becomes noisy
- [ ] Donor impact receipt email — add when donor retention becomes measurable
- [ ] Gujarati / Hindi i18n — add when onboarding non-English-comfortable donors/volunteers at scale
- [ ] Public stories / impact blog — add when foundation wants to share named case stories
- [ ] Proof-of-delivery visible to donor — simple add-on once POD photo is stored in v1

### Future Consideration (v2+)

- [ ] Volunteer gamification (badges, leaderboards) — defer until retention problem is confirmed
- [ ] Recurring monetary donations (Razorpay subscriptions) — defer until one-time volume is stable
- [ ] Multi-stop route optimization — defer until daily volume exceeds what manual routing handles
- [ ] Native iOS / Android — revisit after PWA usage data shows install friction
- [ ] AI volunteer matching — defer until claim latency becomes a real problem
- [ ] Multi-city expansion — separate milestone, separate scoping

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth (email + OTP) | HIGH | MEDIUM | P1 |
| Post pickup request | HIGH | MEDIUM | P1 |
| Browse + claim pickups | HIGH | MEDIUM | P1 |
| Status progression (4 states) | HIGH | LOW | P1 |
| Live GPS tracking | HIGH | HIGH | P1 |
| Notifications (in-app + push + SMS + WhatsApp) | HIGH | MEDIUM | P1 |
| Proof of delivery (photo) | HIGH | MEDIUM | P1 |
| Admin pickup management | HIGH | MEDIUM | P1 |
| Razorpay/UPI money donation | HIGH | MEDIUM | P1 |
| Public landing + impact counter | HIGH | LOW | P1 |
| Volunteer signup public page | HIGH | LOW | P1 |
| Safety attestation on post | MEDIUM | LOW | P1 |
| Donor request history | MEDIUM | LOW | P1 |
| Repeat / quick-repost | MEDIUM | LOW | P1 |
| Admin reporting + CSV | MEDIUM | MEDIUM | P1 |
| Partner management (admin) | MEDIUM | MEDIUM | P1 |
| Recurring scheduled pickups | MEDIUM | MEDIUM | P2 |
| Volunteer radius filter | MEDIUM | MEDIUM | P2 |
| WhatsApp-first notifications | HIGH | MEDIUM | P1 (India context elevates this) |
| Donor impact receipt email | LOW | LOW | P2 |
| Public stories / blog | LOW | LOW | P2 |
| Gujarati/Hindi i18n | MEDIUM | HIGH | P2 |
| Proof-of-delivery visible to donor | MEDIUM | LOW | P2 |
| Volunteer gamification | LOW | MEDIUM | P3 |
| Route optimization | LOW | HIGH | P3 |
| Recurring monetary donations | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible (post-launch backlog)
- P3: Nice to have, v2+ consideration

---

## Food Safety Workflow (India NGO Context)

This deserves its own section because it is both a table-stakes concern and a scope boundary.

**What is required for v1:**
1. Donor attestation at post time — a simple required checkbox group before submitting:
   - "Food was freshly prepared within the last 4 hours OR is properly refrigerated"
   - "Food is in clean, sealed containers"
   - "No reheated leftovers stored beyond safe holding time"
   - "I confirm this food is safe to consume"
2. Time-window auto-expiry — any unclaimed request auto-expires at pickup-by time; an expired request cannot be claimed.
3. Volunteer can flag a concern — if food appears unsafe at pickup, volunteer can mark the rescue as "food not safe — not collected" with a reason; this notifies admin.

**What is deliberately out of scope for v1:**
- Temperature logging (IoT sensors, manual temp entry)
- ServSafe or FSSAI training certification tracked in-app
- Full HACCP traceability chain

**Rationale:** Rajyash Foundation operates at ~200 meals/day with known donor partners. The Good Samaritan model (India equivalent: Food Safety and Standards Authority of India has no specific safe harbor law yet, but standard practice follows similar principles) means the donor bears primary responsibility. The app needs to surface the attestation and auto-expire stale requests — not build a compliance management system for v1.

---

## India / Low-Connectivity Field Use

Volunteers are using phones on the move in Ahmedabad. Connection quality varies (2G/3G in some areas, flaky 4G indoors).

**Design constraints this imposes:**

| Concern | Approach | Complexity |
|---------|----------|------------|
| Status updates must survive brief disconnects | Queue status change locally (IndexedDB/localStorage), retry on reconnect — PWA background sync | MEDIUM |
| Live GPS tracking on flaky network | Send GPS pings every 30s (not 1s); fall back to 60s if repeated failures; only track during active states | MEDIUM |
| Photo upload on slow connection | Compress image client-side (browser-image-compression lib) before upload; show upload progress; allow retry | LOW |
| App shell must load fast | Static Next.js pages served from Vercel edge CDN; avoid large JS bundles on volunteer/donor routes | MEDIUM |
| WhatsApp as fallback channel | If push notification fails (app not open, network gap), WhatsApp message reaches the volunteer reliably | MEDIUM |
| Installable as home screen app | Add Web App Manifest + service worker for PWA install prompt; volunteers install once and use like native | LOW |
| Form data not lost on refresh | Auto-save donor post form to localStorage as they type; pre-fill on return | LOW |
| SMS fallback for OTP | MSG91 or Twilio; do not depend solely on internet-based OTP delivery; standard SMS is the baseline | LOW |

**What not to over-engineer:** Full offline mode (queuing new pickup posts while offline, syncing on reconnect) is complex and the scenarios are rare — a donor posting food while offline is unlikely given they need to communicate with a volunteer. Status updates offline for volunteers are the more real scenario and are covered by the queue-and-retry approach above. Do not build a full local-first database for v1.

---

## Competitor Feature Analysis

| Feature | Food Rescue US | Olio | Careit | Food Rescue Hero | Our Approach |
|---------|---------------|------|--------|-----------------|--------------|
| Volunteer browse + claim | Yes (web) | Yes (mobile) | Yes | Yes (mobile) | Web app, list + map |
| Recurring pickups (volunteer "adopt") | Yes — "adopt a rescue" | No | Yes | Yes | v1.x, donor side |
| Live tracking | Not prominent | No | Partial | No | v1 core (PROJECT.md) |
| Photo at post | No (text only) | Yes (required) | Yes | No | Yes (optional but encouraged) |
| Proof of delivery photo | Not explicit | Yes (item photo) | Implicit | Not explicit | Yes (required at delivery step) |
| WhatsApp notifications | No (US-focused) | No | No | No | Yes (India differentiator) |
| Money donation to org | No | No | No | Yes (fundraising integration) | Yes (Razorpay/UPI, v1) |
| Public impact counter | Yes | No | Yes | Yes | Yes |
| Multi-stop routing | No | No | No | Yes (2024 feature) | No (v1 single-stop) |
| Volunteer gamification | Partial (impact stats) | No | No | Yes (leaderboards) | No (v1) |
| Food safety attestation | Implied (coordinator training) | No (peer trust) | Yes (compliance) | Coordinator-level | Yes (donor checklist) |
| Admin manual assignment | Yes | No | Yes | Yes | Yes |
| Gujarati/Hindi | No | No | No | No | v1.x differentiator |
| Razorpay / UPI | No | No | No | No | India-native differentiator |

---

## Sources

- [Food Rescue US — App overview](https://foodrescue.us/our-app/)
- [Food Rescue Hero — Platform features](https://foodrescuehero.org/)
- [Food Rescue Hero — Multi-stop rescues (2024)](https://foodrescuehero.org/introducing-multi-stop-rescues/)
- [Careit — Food rescue and donation software](https://careit.com/)
- [Olio — Food Waste Hero volunteer workflow](https://help.olioapp.com/en/articles/12277114-what-is-a-food-waste-hero-and-how-do-i-get-started)
- [Copia — Food donation platform](https://gocopia.com/solutions/)
- [RecyclingWorks MA — Best practices for food donation safety](https://recyclingworksma.com/donate/best-management-practices-for-food-donation/)
- [FoodCycle LA — Safe food donation guidelines](https://www.foodcyclela.org/foodcycle-safety-guidelines/)
- [Razorpay for NGOs — UPI + 80G receipts](https://razorpay.com/blog/accept-online-donations-with-80g-receipts/)
- [Track-POD — Proof of delivery apps](https://www.track-pod.com/blog/proof-of-delivery-apps/)
- [Onfleet — Proof of delivery + geofencing](https://onfleet.com/blog/proof-of-delivery-apps-couriers/)
- [MDN — PWA offline / service workers](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [fundsforNGOs — Technology for hunger relief features](https://www.fundsforngos.org/proposals/features-and-functionalities-leveraging-technology-for-hunger-relief/)
- [A3Logics — Food donation app development features](https://www.a3logics.com/blog/food-donation-app-development/)

---

*Feature research for: Rajyash Foundation — Food Porter (food rescue logistics web app)*
*Researched: 2026-06-25*
