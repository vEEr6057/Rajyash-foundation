# claude.ai/design — Premium Redesign Brief (Rajyash Food Rescue)

Paste this into claude.ai/design (Opus 4.8, max effort). It's a **redesign of an existing, working app** — flows exist; the job is to make it feel like a polished product built by a senior team. Attach/paste the locked design-system files alongside this brief: `tokens/globals.css`, `tokens/motion.css`, `tokens/motion.ts`, `tokens/MOTION.md`, `docs/design/rajyash-design-system.html`, `docs/design/rajyash-motion-system.html`.

> Note: the operating model below is our current understanding (an external requirements meeting may refine it). The **visual/premium direction is model-agnostic** — design for it confidently; we'll adjust content/flow labels after the meeting.

---

## 1. Product (the real model)

**Rajyash Food Rescue** — a food-rescue web app for the Rajyash Foundation, an NGO in **Ahmedabad, India**. It is **NGO-coordinated dispatch**, not a marketplace:

- **Restaurants** (pre-vetted partners) have **leftover event food**. They flag surplus (or the NGO logs it).
- A **dispatcher** (NGO staff) **assigns a driver** (usually a **rickshaw** driver).
- The driver navigates to the restaurant, the food passes a **safety check**, the driver **picks up** and drives to a **slum/roadside zone**.
- **Volunteers** help **distribute** to families there.
- Recipients are **areas/zones**, not individuals who sign up.

Audience is mostly on **Android phones**, in **English, Gujarati, and Hindi**. It's an installable **PWA**. Zero-budget NGO → restrained but premium.

## 2. Brand (use the attached tokens; extend, don't replace)

- Colors: primary **saffron `#C04E12`**, secondary **leaf-green `#2E7D46`**, background **warm cream `#FBF7F0`**, plus the neutral/surface/border tokens in `globals.css`. **Light + dark** (both polished).
- Type: display = **Bricolage Grotesque** (warm, confident); body = **Mukta / Noto Sans** (must support **Latin + Gujarati + Devanagari**).
- Feel: warm, human, hopeful, trustworthy — **not** corporate or sterile. Rounded, soft depth, generous whitespace.
- Keep our token names so the export maps onto **Tailwind v4 + shadcn** CSS variables.

## 3. Quality bar

Aim for the polish of **Linear / Stripe / Zomato's order-tracking**. It should read as "built by senior product designers + senior engineers." If a screen looks like a default Tailwind starter, it's not done.

## 4. Premium cues (make these explicit, every screen)

- **Branded splash / loading screen** (logo + warm motion) on first load.
- **Skeleton loaders** for every data view (no spinners-on-blank).
- **Route/page transitions** (smooth, transform+opacity only).
- **Micro-interactions** — hover lift, button press, springy reveals on scroll, animated count-ups, a subtle live pulse for "live" elements.
- **Depth** — layered soft shadows, gentle gradients/mesh, tasteful glass where it fits, real imagery (don't leave empty image slots).
- **Strong hierarchy** — confident headlines, clear sectioning, breathing room.
- **Polished states** — loading, **empty**, **error**, success/confirmation; never a bare blank.
- Motion respects `prefers-reduced-motion`. Public pages = generous motion; app/portal = frugal-but-refined.

## 5. Screens to design (the whole app, mobile-first + dark mode + the 3 states)

1. **Public landing** — premium hero (real imagery + depth), live impact counter (animated), how-it-works (the dispatch loop), about, donate/volunteer CTAs, footer. (Replaces the current "basic" one.)
2. **Auth + onboarding** — sign-in/up + role onboarding (donor/restaurant, volunteer, driver), polished.
3. **Restaurant surplus-flag** — a restaurant quickly says "we have surplus" (food type, qty, pickup window, location via Google-Maps link/address + map-pin confirm). Fast, 1–2 taps.
4. **Dispatcher / admin dashboard** — queue of surplus → **assign a driver**, manage partners/users, **impact reporting**. Desktop-first but responsive.
5. **Driver live-tracking screen** — the hero of the app: a **Zomato-style** live map with the driver's moving marker, route line, **ETA card**, pickup → drop steps, a big **"Navigate" (Google Maps)** button, status advance, proof/headcount on delivery.
6. **Volunteer distribution view** — assigned drop zone, arrival, confirm distribution (photo + headcount).
7. **Watcher/tracking view** (dispatcher or a shareable link) — same live map, read-only.
8. **System** — branded splash/loading, empty states, error states, toasts/confirmations, the install-PWA prompt.

## 6. i18n + responsive + dark

- Every screen in **EN / Gujarati / हिन्दी** — leave room for longer translated strings; never bake text into images; show a language switcher.
- **Mobile-first** (drivers/volunteers/restaurants on phones); tablet/desktop graceful (dispatcher on a laptop).
- **Light + dark**, both first-class.

## 7. How to drive it (process)

- Design **one screen at a time**, deepest first (driver tracking + landing).
- After each: critique + iterate ("more confident hero," "add depth," "richer reveal," "tighten mobile") — don't accept the first pass.
- Ask it to **output the tokens/CSS/motion values** (mapping to our Tailwind v4 + shadcn vars) so import is clean.
- Export the code/tokens per screen → hand to the engineer to reconcile with the locked tokens + wire real data, i18n, maps, and live tracking.

## 8. Deliverable

A cohesive, premium, responsive design system + key screens (light + dark, all 3 states), with exportable tokens/CSS/motion that drop onto Tailwind v4 + shadcn. Make it feel inevitable, warm, and senior-built.
