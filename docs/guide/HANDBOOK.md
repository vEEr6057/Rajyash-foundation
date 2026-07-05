# Food Porter — Complete User Handbook

*The Rajyash Foundation food-rescue platform · every screen, every action, every persona*

This handbook covers the whole web app, action by action, for everyone who uses it:
**donors** who share surplus food, **volunteers** who help distribute it, **drivers** who
collect the food and run the delivery route, and **foundation staff (admins)** who coordinate
everything. It doubles as the **training and support reference** for the foundation team —
every persona section opens with a **"What you can do" powers table**, then walks each power
end to end: where it lives, what each field means, how you do it step by step, what happens
the moment you submit, and what you see next. Wherever an action is gated to a role or checked
against ownership, a **"Who can do this / boundary"** note spells out the limit — useful for
training and for troubleshooting "why can't I…" support questions.

> **How the rescue works (the real-world model).** A donor posts surplus food. The foundation's
> **driver collects it** — either by claiming it from a driver board or being assigned it by
> staff into a run — and drives it to a **distribution point**. **Volunteers never collect.**
> They ride along or meet the run at the drop to help **distribute** the food and confirm it
> reached people, and they can watch a rescue's progress for awareness. Staff coordinate pickups
> into delivery **runs**, build and adjust those runs, and watch everything live on one dashboard.

This edition documents **82 distinct actions** across all personas — the newest additions
include repeat-last-pickup, the donor status timeline and delivery proof-back, the volunteer
distributions map, driver call/navigate buttons and distance-aware board sorting, and a wave of
admin tooling: bulk-assign, users search/filter, invite-any-role, per-pickup and per-run audit
history, and the destination active/inactive toggle. It also documents the driver push
notification opt-in on **My Run**, the restored **Verify/Unverify** toggle on the admin pickup
detail page, and the removal of the dead volunteer-assignment code path — all fixed as of this
edition.

---

## Contents

1. [For everyone — roles, signing in, onboarding, top bar, notifications](#1-for-everyone)
2. [The public website (homepage & visitors)](#2-the-public-website)
3. [Donor guide](#3-donor-guide)
4. [Volunteer guide](#4-volunteer-guide)
5. [Driver guide](#5-driver-guide)
6. [Admin / staff guide](#6-admin-staff-guide)
7. [Appendix — the rescue loop, live-tracking table, status glossaries, languages, support](#7-appendix)

Known limitations are listed at the very end, after the appendix.

---

## 1. For everyone

### The four roles

| Role | Who they are | What they do in the app |
|------|--------------|--------------------------|
| **Donor** | A restaurant, hostel, family, or event host with surplus food | Posts food for pickup; tracks it to delivery |
| **Volunteer** | A helper who assists with distribution | Browses pickups for awareness (read-only); joins active runs to confirm drops — **never claims or collects** |
| **Driver** | The foundation's driver | Claims or is assigned pickups; drives the collection and delivery route; shares live location while active |
| **Admin (staff)** | Foundation coordinators | Coordinate pickups, build and adjust delivery runs, manage people & places, read reports |

Your role is set once, the first time you sign in (see **Onboarding** below), unless the
foundation invited you directly — see **Invite a user** in the [admin guide](#users). Admins are
appointed by the foundation through that invite path; you can't pick "admin" yourself at sign-up.

### Signing in

- **Donors, volunteers, drivers:** open the site and choose **Sign in** (top-right) or **Become
  a volunteer** (or the donor/driver equivalent). You sign in with your email — enter the
  one-time code we send you. No password to remember. Google sign-in is also offered on the same
  widget.
- **Foundation staff:** use the **Staff sign-in** page (linked in the footer, or go to `/staff`
  directly) — a separately branded front door. It's still the same account system underneath;
  your **admin** role is what actually unlocks the admin area, not which door you walked through
  — the server checks your role independently every time, on every admin page.

### Onboarding (first sign-in only)

{{IMG:05-onboarding}}

**Where it lives:** `/onboarding` — a full page shown automatically the first time a
self-registered user signs in. **Who can do this / boundary:** everyone who signs up directly
(not invited) passes through here exactly once; the role you land with is re-validated
server-side no matter what the page sends, and you can never make yourself an admin from this
screen even if you tamper with the request.

**Step by step:**
1. **Pick a role** — three cards: **Donate food** ("I have surplus food to share"), **Volunteer**
   ("I'll help distribute food"), and **Driver** ("I drive collections & deliveries"). Tap one —
   it's not a dropdown. If you arrived via a specific link (e.g. the homepage's "Become a
   volunteer" button), the matching card may already be pre-selected.
2. **Complete your profile** — name (pre-filled from your account if available), phone
   *(optional)*, and city.
3. **Submit.**

**What happens on submit:** your Clerk account metadata and a database profile row are written
together; your role is locked in.

**What you see next:** you land straight on your home screen — `/portal/dashboard` for
donor/volunteer, `/portal/run` for driver.

> **Invited users never see this screen.** If the foundation invited you (any role — see
> **Invite a user** in the [admin guide](#users) below), your name, role, and city were set at
> invite time; your first sign-in provisions your profile automatically and lands you straight
> on your dashboard (admins on `/admin/dashboard`) — you never see the three role cards. The
> onboarding page still contains an internal fallback path for this case, but it's effectively
> unreachable — the sign-in redirect sends invited users elsewhere before they'd ever land here.

### The top bar (everywhere once signed in)

- **EN · ગુ · हि** — switch language (English, Gujarati, Hindi) any time. Tap the pill for the
  language you want. The choice is saved as a cookie immediately, and if you're signed in it's
  also mirrored onto your profile, so notification copy follows it too.
- **Moon / Sun icon** — tap to switch between light and dark themes, instantly, no page reload.
- **Your avatar (top-right)** — tap to open your account menu: manage account, sign out. This is
  Clerk's own modal, not a custom app screen.
- **Bell icon** — your notifications (see below).

**Who can do this / boundary:** these four controls are available to every signed-in user on
every persona, with no role gate at all — the exact same code path everywhere.

These same three controls (language, theme, account menu) also exist for **anyone visiting the
public site**, before signing in — see [section 2](#2-the-public-website).

### Notifications

{{IMG:41-notification-feed}}

**Where it lives:** the bell icon in the top bar, on every signed-in page — portal and admin
alike. **Who can do this / boundary:** any signed-in user; marking a notification read is scoped
to your own user id server-side, so you can never mark (or see) someone else's notification by
guessing an id.

The app can tell you about new pickups and status changes in three ways:

- **The notification bell** — tap it to open the feed: your recent notifications, newest first,
  each with a timestamp. Tap an unread one to mark it read; **Mark all read** clears the badge in
  one tap. The small number badge on the bell shows your unread count (capped at "9+"). When you
  have nothing yet, the feed shows a simple empty state instead of a blank list.
- **Phone / browser push** (the main channel) — tap **Enable notifications** when the app offers
  the card, then choose **Allow** in your browser's permission prompt. This is what reaches your
  phone even when the app itself is closed. *If you never tap "Allow," you won't get push alerts
  — that's the usual reason someone "isn't getting notified."* This opt-in card appears on the
  donor dashboard, the volunteer dashboard, **and now on the driver's My Run page** — every
  persona has a discoverable place to enable push.
- **Email** (secondary) — receipts and some updates, once the foundation's email domain is fully
  set up.

**What happens when you tap Enable notifications, step by step:** the card asks your browser for
permission → you choose **Allow** → your browser's push subscription is saved against your user
id on the server → the card is replaced with a confirmation. **What you see next:** future
pickup/run events that concern you arrive as both an in-app notification and (once allowed) a
phone push.

---

## 2. The public website

Anyone can visit the site without signing in. This is the foundation's public face and the
donation entry point.

### Homepage

{{IMG:01-home-full}}

**Where it lives:** `/` — the public homepage, no sign-in required.

- **Browse "What we do" / programs** — tap the header nav's **What we do** link, or just scroll.
  **How you do it:** click the nav item or scroll the page. **What happens:** the page
  anchor-scrolls smoothly to the `#programs` section — no navigation, no reload. Each programme
  card carries its own photo, so this isn't just a wall of text.
- **Browse the impact ledger** — tap **Impact** in the nav, or scroll. Shows the foundation's
  all-time totals (meals, kg, deliveries), computed from real delivery records, with a small
  note on where the numbers come from — the same honesty principle the admin dashboard uses.
- **Open the mobile menu** — on narrower screens (phones/small tablets), tap the hamburger icon
  in the header. **What happens:** a slide-over sheet opens with the nav links plus the language
  and theme controls and the sign-in/sign-up links, so small-screen visitors don't lose access to
  them.
- **Switch language** — tap **EN / ગુ / હિ**. **What happens:** a cookie is set immediately and
  the page's copy re-renders in that language — no auth required, works for a completely
  anonymous visitor.
- **Switch theme** — tap the sun/moon icon. Flips `light`/`dark` instantly, client-side only.
- **Become a volunteer / donor / driver** — tap any of the "Become a volunteer" style CTAs (they
  appear in the hero, the nav, and the closing "finale" band, each pre-selecting a different
  role). **What happens:** you're routed to `/sign-up?role=X`, and after account creation, to
  `/onboarding?role=X` with that role's card pre-selected.
- **Footer** — contact details, social links, and the legal pages (see below).

### Signing in / creating an account

{{IMG:02-signin}}

{{IMG:03-signup}}

- **Sign up** — tap **Sign up** in the nav or homepage. Opens Clerk's own account-creation
  widget: enter an email, confirm the one-time code sent to it (Google OAuth is also offered).
  **What happens on submit:** a new account is created and you're taken into
  [onboarding](#onboarding-first-sign-in-only).
- **Sign in** — tap **Sign in**. The same Clerk widget in reverse, for a returning user.
  **What happens on submit:** you land straight on your dashboard (`/portal/dashboard` or
  `/portal/run` for drivers).

Neither page is a custom app screen; both hand off entirely to the account provider (Clerk).

### Staff sign in

{{IMG:04-staff-signin}}

**Where it lives:** `/staff`, linked from the footer as **Staff sign-in** — a public route (no
auth required to view the page itself). **How you do it:** enter your staff email and one-time
code, same as any sign-in. **What happens on submit:** you land on `/admin/dashboard` **only if**
your account's role is `admin` — the page is just a differently-branded front door; reaching it
grants nothing by itself. **Who can do this / boundary:** anyone can *view* `/staff` (it's a
public route so coordinators can bookmark it), but the server independently re-checks your role
on every subsequent `/admin/*` request — a non-admin who signs in here simply lands on their own
regular dashboard instead.

### Donate (money)

**Where it lives:** a **Donate** link in the header/footer — **only rendered when the
foundation's payments feature flag (`PAYMENTS_ENABLED`) is on**. With it off, `/donate` redirects
home and no Donate link renders anywhere in the nav; this is a deliberate kill switch, not a bug,
if you ever see it missing.

**Step by step, when it's on:**
1. Pick a preset amount, or type a custom one.
2. Add your name and email *(optional, used only for the receipt)*.
3. Complete the Cloudflare Turnstile check (an invisible-to-mostly-invisible bot check) — this
   runs **before any database write**, so an automated flood never reaches the order-creation
   step.
4. Confirm in the **Razorpay Checkout** modal that opens.

**What happens on submit:** the server mints a Razorpay order (only after the Turnstile check
passes) and opens the Checkout modal; on success you see a "thank you — your receipt is on its
way" screen. **Who can do this / boundary:** unauthenticated — anyone can donate, gated only by
the feature flag and the bot check. This confirmation screen makes **no claim of success itself**
— the payment is only ever confirmed by Razorpay's server-side webhook (HMAC-verified), never by
what the browser reports back. This protects the foundation from a donor's browser lying about a
payment that didn't actually go through.

### Legal pages

**Where it lives:** footer links — **Privacy**, **Terms & Conditions**, and **Refund &
Cancellation Policy**. Read-only prose pages, available in all three languages, required reading
for anyone paying online and required by Razorpay for the account to process payments at all.

---

## 3. Donor guide

*You have surplus food — a restaurant tray, a wedding's extra thalis, a hostel's leftovers.
Here's how to get it to people who need it, in about a minute.*

### What you can do (donor powers)

| Capability | What it lets you do |
|---|---|
| Post a pickup | Share surplus food with the driver network in under a minute |
| Repeat last pickup | Reuse your last posting's details as a one-tap starting point |
| Find address on map | Pin your exact pickup location so the driver can find you |
| Upload a food photo | Give whoever collects it a visual before they arrive |
| Edit a pickup | Fix details before anyone has claimed it |
| Cancel a pickup | Call it off before anyone has claimed it |
| Repost a pickup | Re-share the same surplus again with one tap, any time |
| View My Pickups | See everything you've ever posted and its current status |
| Track a pickup live | Watch the driver's real-time approach while they're en route to you |
| View the status timeline | See every stage your pickup has passed through, at a glance |
| See the delivery proof-back | Get visual confirmation your food reached people in need |

### Your dashboard

{{IMG:10-donor-dashboard}}

**Where it lives:** `/portal/dashboard` — your landing page after sign-in. At a glance:

- **Total posted · Open · In progress · Delivered** — your running tally.
- **Post a pickup** — the big button; start here to share food.
- **My pickups** — a shortcut to everything you've posted.
- **Recent pickups** — your latest posts with their current status.
- **Enable notifications** — turn on push alerts so you know the moment your food is claimed and
  delivered (see [Notifications](#notifications) above).

### Posting a pickup

{{IMG:13-donor-postpickup-sheet}}

**Where it lives:** tap **Post a pickup** on the dashboard, or the **＋** on the My Pickups page.
A sheet slides in from the right with the copy **"our driver will pick it up"**, so the model is
clear from the first screen.

**Who can do this / boundary:** donors only. If the foundation has turned off new-pickup intake
(a kill switch for incident response), the button is disabled/hidden and posting is blocked
server-side too, not just in the UI.

**If you've posted before, the sheet opens with a "Repeat last pickup" button at the top** —
covered in its own subsection right after this one; skip ahead to it if you're re-posting the
same kind of surplus.

**Fields, step by step:**

*What*
1. **Food type** — cooked meal, bakery, packaged, raw produce…
2. **Quantity + Unit** — how much, in **servings** *or* **kg** (see [Meals vs. kg](#how-meals-and-kg-are-counted) — they're never converted into each other).
3. **Description** *(optional)* — a helpful note, e.g. "40 veg thalis from a wedding."

*When*
4. **Pickup window** — the **from** and **until** times your food is available to collect. Pick
   a realistic window; food safety depends on it.

*Where*
5. **Pickup address** — paste a **Google Maps link** or type an address/landmark, then tap
   **Find** — a spinner runs briefly, then a map appears below with a **draggable pin** you can
   fine-tune. Accurate location = a faster pickup. (This is the same **Find address on map**
   control described in its own subsection below — it's embedded here in the post form.)
6. **Food photo** *(optional)* — tap **Add photo**; the native file/camera picker opens, the
   image is compressed on your device, then uploaded with a progress indicator and a checkmark
   when done. Helpful for volunteers/drivers and nice for the foundation's records.
7. **Safety checkbox** — confirm the food is fresh, safely stored, and fit to share.
8. Tap **Post pickup.**

**What happens on submit:** a new pickup row is created in `Requested` status, attributed to you
(and automatically linked to your partner organisation if the foundation has one on file for
you). **What you see next:** the sheet closes and your pickup appears at the top of My Pickups —
it has now joined the driver board for the foundation to collect.

> **Food-safety promise.** The confirmation checkbox is a real commitment: only post food that is
> fresh and safe to eat at pickup time.

### Repeat last pickup

**Where it lives:** inside the **Post a pickup** sheet — a **"Repeat last pickup"** button at the
very top, shown only when you have at least one prior pickup on record.

**How you do it:** open the post-pickup sheet, tap **Repeat last pickup**.

**What happens:** the form prefills from your most recent pickup — category, quantity, unit,
address, pin, and the Google Maps link if you used one. **What does NOT carry over, on purpose:**
your pickup **window** (you must set a fresh time each time — yesterday's window is meaningless
today) and your **food photo** (a new posting should show today's food, not a reused image).

**What you see next:** the same form as posting fresh, just prefilled — edit anything that's
changed, then submit exactly as described above.

**Who can do this / boundary:** donors only; the "last pickup" is always pulled from **your own**
posting history — there's no way to prefill from someone else's pickup even by manipulating the
request, because the lookup is scoped to your session's own id server-side, not a client-supplied
one.

### Find address on map

**Where it lives:** inside the post-pickup and edit-pickup forms — the **Find** button next to
the address field.

**How you do it:** either paste a **Google Maps share link** (from the Maps app's Share button)
or type a plain address/landmark into the field, then tap **Find**.

**What happens:** a brief spinner runs while the app resolves the link or geocodes the text, then
a small map appears below the field with a pin dropped at the resolved location. **Drag the pin**
to fine-tune it if the automatic match is slightly off.

**What you see next:** the pin's coordinates are what get saved when you submit the form — an
accurate pin means a faster, more confident pickup for the driver.

### Upload food photo

**Where it lives:** inside the post-pickup form — the **Add photo** control (optional).

**How you do it:** tap **Add photo** — your device's native camera/file picker opens. Choose or
snap a photo.

**What happens:** the image is compressed on your device before upload (to keep it fast on a weak
connection), then uploaded with a visible progress bar; a checkmark confirms it finished.

**What you see next:** the photo attaches to the pickup you're creating or editing — visible to
whoever ends up viewing that pickup's detail page (driver, volunteer, admin).

### Editing, cancelling, and reposting a pickup

**Where it lives:** a pickup's detail page (open it from **My Pickups**) — your available actions
depend on its current status.

- **Edit** — shown **only while the pickup is still `Requested`** (nobody has collected it yet).
  **How you do it:** tap **Edit**, the same form as posting opens in a sheet, pre-filled with the
  pickup's current details — change whatever needs changing, submit. **What happens on submit:**
  the sheet closes and refreshes the detail page in place, rather than navigating away. **Who can
  do this / boundary:** only the pickup's own donor, and only while it's still `Requested` — the
  server re-checks both the ownership and the status on every edit attempt; if either check
  fails you get a conflict error instead of a silent no-op.
- **Cancel** — also **`Requested`-only**, a destructive action set apart below a hairline. **How
  you do it:** tap **Cancel**, confirm in the dialog that appears ("are you sure?"). **What
  happens:** the pickup moves to `Cancelled`, and as a privacy side effect any GPS trail
  associated with it is purged. **Who can do this / boundary:** same ownership + status check as
  Edit.
- **Repost** — available **at any status**, no confirmation needed. **How you do it:** tap
  **Repost**. **What happens:** it fires immediately and creates a brand-new pickup with the same
  details in a fresh `Requested` state — handy for a donor who has the same surplus again
  tomorrow. **What you see next:** you're taken straight to the new pickup's own detail page. **Who
  can do this / boundary:** only the original pickup's donor — the server explicitly checks the
  source pickup's `donorId` matches your session before creating the copy.

Once a pickup is claimed or assigned, it's in motion and can no longer be edited or cancelled —
only reposted.

### View My Pickups list

{{IMG:11-donor-pickups}}

**Where it lives:** bottom nav → **My pickups**. **What you see:** a grid of every pickup you've
ever posted, each card showing its current status pill. **How you do it:** tap any card to open
its full detail page and reach the actions above. **Who can do this / boundary:** the list is
scoped to your own `donorId` server-side — you never see another donor's pickups here.

### Tracking a pickup live

**Where it lives:** a pickup's detail page — the map area, automatically, no button to press.

**What happens:** while your pickup's status is `En route` (the driver is on the way to collect
it), the detail page automatically swaps its static map for a **live tracking map** showing the
driver's position, updating roughly every 30 seconds via a background poll plus realtime updates.

> **Your live view ends once the food is collected.** This is deliberate, leg-aware tracking: you
> see the driver coming *to you*, but not the rest of their route once your food is in the
> vehicle and headed to a distribution point (see the [live-tracking table](#live-tracking-who-sees-what)
> in the appendix). The status text keeps updating (`Picked up` → `Delivered`) even after the map
> view ends. **Who can do this / boundary:** only you, the pickup's owning donor, and only while
> the pickup is at exactly the `En route` stage — the check is `donorId === you AND status ===
> 'en_route'`.

### Status timeline (history)

{{IMG:14-donor-pickup-detail}}

**Where it lives:** a pickup's detail page — the **"History"** section, shown to you as a
vertical stage timeline.

**What you see:** the four stages — `Posted → Claimed → En route → Delivered` — laid out
vertically, with your pickup's **current stage visually highlighted** (a soft pulsing indicator).
Unlike a flat event log, this always shows all four stages even if the underlying event log is
sparse, because the "posted" stage is inferred from the pickup row itself. Timestamps are shown
for stages that have happened; **no actor names are shown to donors** — that level of detail
(who exactly claimed/advanced it) is an admin/driver-facing view, described next.

**Who can do this / boundary:** shown automatically once you're viewing your own pickup's detail
page (the same ownership check that gates the whole page). Any *other* viewer of the same pickup
(admin, or a driver/volunteer browsing) instead sees a plain flat `→ status · time` list — the
timeline is a donor-specific presentation of the same underlying data, not different data.

### Delivery proof-back

**Where it lives:** a pickup's detail page, automatically, once the pickup reaches `Delivered`
**and** the driver attached a proof-of-delivery photo.

**What you see:** a panel reading **"Your food reached families in need"** alongside the driver's
proof photo. *(No screenshot of this exact state exists in this handbook — no seed pickup in the
demo data currently has both a `Delivered` status and a proof photo set. The panel described here
renders exactly as stated once both conditions are true; visually it sits in the same spot the
live tracking map and status timeline occupy above, just further down the page.)*

**Who can do this / boundary:** only you, the pickup's owning donor — the same ownership check
already established for the page. **Note on wording:** the copy is deliberately generic
("families in need"), not destination-named — a pickup has no direct link to the exact
destination it ends up dropped at (that link lives one hop away, at the run/stop level), so
naming the specific destination would need a join the app doesn't currently make. Not a bug — a
scope-narrower-than-originally-worded decision.

---

## 4. Volunteer guide

*You help get rescued food to people who need it — never by collecting it yourself. Here's your
side of the app.*

### What you can do (volunteer powers)

| Capability | What it lets you do |
|---|---|
| Browse the pickup board | See every open pickup waiting to be collected, for awareness |
| View any pickup's detail | Look at the full detail of any open or active pickup |
| View Today's Distributions + map | See every active run's remaining drop stops on a list and a map |
| Confirm a drop | Mark a distribution stop as done once food is actually handed over |
| View your dashboard | Land on a distributions-first home screen with quick stats |
| Enable push notifications | Get phone alerts about pickups/runs, same as donors |

> **You never claim or collect a pickup.** There is no claim button anywhere in your view of the
> app — that control only renders for drivers. This is intentional, not a missing feature.

### Your dashboard

{{IMG:20-volunteer-dashboard}}

**Where it lives:** `/portal/dashboard` — your landing page. **What you see:** it leads with
active-runs/drop-stop stats and a prominent **"Today's distributions"** call to action; the
read-only board is demoted to a smaller "what's cooking" link further down the page rather than
being the first thing you see. Your notification opt-in card is here too. **Who can do this /
boundary:** shown to signed-in volunteers only — this is a judgment-call rebalance of an existing
page's layout (documented as such in the code), not a new route or new data.

### Browsing the pickup board (read-only)

{{IMG:27-volunteer-board-readonly}}

**Where it lives:** bottom nav → **Board**. **What you see:** every open (`Requested`) pickup
waiting to be collected — the same board drivers use, with **List** and **Map** tabs.

**How you do it:** just browse — tap **List** or **Map** to switch views, scroll the cards. There
is **no claim button anywhere on this screen** — in its place, a quiet note explains that
browsing is all this screen is for.

**Who can do this / boundary:** volunteers see this board read-only by design — dispatch-model-v2
deliberately removed the old volunteer claim button, because collecting is the driver's job now.
This isn't a bug or an oversight; the claim control's code explicitly only renders for the
`driver` role.

### View a pickup's detail (awareness)

**Where it lives:** tap any card on the Board (or on Today's Distributions) to open the pickup's
full detail page.

**What you see:** the same detail page a driver sees (map, food details, status), **minus any
claim or advance-status control**. **Who can do this / boundary:** you can view any pickup that's
either still `Requested` or currently active (`En route`/`Picked up`) — once it's `Delivered` or
`Cancelled`, the volunteer view no longer shows it here (though you may still see it via a run's
history if you were part of that run).

### View Today's Distributions (+ map)

{{IMG:26-volunteer-distributions}}

**Where it lives:** bottom nav → **Runs**, route `/portal/distributions`. **What you see:** every
currently **active** run and, for each, only its **drop stops** (the deliveries left to make) —
the pickup leg is deliberately left off this screen, since that's the driver's job, not yours.
Below the list, a **Leaflet map with a pin per drop stop** renders automatically whenever at
least one stop has coordinates — so you can see the geography of today's remaining drops at a
glance, not just a text list.

**Who can do this / boundary:** this whole route redirects away any signed-in user whose role
isn't `volunteer` — it's a volunteer-only screen. If no run is active right now, the page shows a
plain empty state instead of an empty list.

### Confirm a drop

**Where it lives:** on the Today's Distributions list — a **"Mark done"** button on each stop row.

**How you do it:** tap **Mark done** on the stop you've just physically handed food over at.

**What happens on submit:** the stop is recorded as `Done`; if that was the run's **last**
remaining stop, the run itself auto-completes and the success toast specifically calls that out.

**Who can do this / boundary:** this isn't restricted to one "assigned" volunteer — **any**
volunteer can confirm a drop on **any active run**, since in practice whoever is physically
present at the destination is the one who can actually see food handed over. The server's only
checks are: you're a volunteer, and the run is currently `active` — attempting this on a run
that's `Planned`, `Completed`, or `Cancelled` is rejected.

### View dashboard (rebalanced)

See **Your dashboard** above — this is the same route, listed separately here because it's one
of the 82 tracked actions (a rebalanced landing experience, not a new page).

### Enable push notifications

The same **Enable notifications** card that donors see, offered on your dashboard — see
[Notifications](#notifications) in section 1. **Who can do this / boundary:** volunteers and
donors both see this card on their dashboard; see the driver section for the equivalent control
on **My Run**.

### Switch language/theme, notification bell, sign out

These are the same cross-persona controls described in [section 1](#the-top-bar-everywhere-once-signed-in)
— nothing volunteer-specific about them.

> **Tip:** because you're never claiming anything, there's no "leave it for someone else"
> decision to make on the board — just browse for awareness, and act from **Today's
> Distributions** when a run is actually active.

---

## 5. Driver guide

*You collect the food and run the delivery route. The app gives you a claim board, today's run,
and lets you tick off each stop.*

### What you can do (driver powers)

| Capability | What it lets you do |
|---|---|
| Browse the pickup board | See every open pickup, with a claim control on each |
| Claim a pickup | Take ownership of an open pickup, from the board or its detail page |
| See distance to open pickups | Get a nearest-first sort and a distance chip per pickup |
| Call the donor / partner contact | Dial the contact for a pickup you're assigned to |
| Navigate to a stop | Open turn-by-turn directions in Google Maps with one tap |
| Advance a pickup's status | Move a claimed pickup forward one stage at a time |
| Upload a proof-of-delivery photo | Optionally attach visual confirmation of a delivery |
| Share your live location | Broadcast your position automatically while a pickup or run is active |
| View My Run | See your assigned route for the day, stop by stop |
| Mark a run stop done | Confirm you've completed a pickup or drop stop on your run |
| View the run's live map | Watch your own route rendered live while the run is active |
| Enable push notifications | Get phone alerts about assignments and run updates, from My Run |

### The pickup board

{{IMG:23-driver-board}}

**Where it lives:** bottom nav → **Board** — the same list/map view volunteers see, but as a
driver you get a **Claim** control on every open pickup card.

**What you see:** a **distance chip** next to each pickup's status pill, and the board **re-sorts
nearest-first** automatically — this is a client-side-only feature: the app requests your
one-shot device location after the page loads, then sorts locally. **Who can do this / boundary:**
purely a client convenience — there's no server call involved, and if you deny location access or
it times out, the board silently falls back to chronological order with no nagging re-prompt.

### Claiming a pickup

{{IMG:24-driver-pickup-claim}}

You can claim a pickup from **two entry points** — both call the exact same underlying action:

- **From the board card** — tap **Claim** directly on a card in the Board. **How you do it:** a
  two-tap confirm — tap **Claim**, then confirm in the dialog that appears. **What happens on
  submit:** the claim is atomic — if another driver claimed the same pickup a split second
  earlier, you get a clear **"already taken"** error and the card clears/refreshes to reflect the
  real state, instead of two drivers both showing up for the same food.
- **From the pickup's detail page** — open any `Requested` pickup (from the board, or via a
  direct link) to reach a large **Claim this pickup** button. Same atomic behaviour as above.

**What you see next:** once claimed, the pickup moves to `Accepted` and is yours to run through
its remaining stages — advance status, call, navigate, and (once you arrive) upload a proof
photo, all described below. **Who can do this / boundary:** drivers only; the claim itself is a
single atomic database operation (claim only succeeds if the pickup is still unclaimed at that
exact instant) — there is no window where two drivers can both "win" the same pickup.

### See distance to each open pickup

Described above under **The pickup board** — this is the distance-chip / nearest-first-sort
feature, listed separately here because it's tracked as its own action in the inventory this
handbook is built from.

### Call the donor / partner contact

{{IMG:24b-driver-navigate-call}}

**Where it lives:** a **Call** button (phone icon) on a pickup's detail page once you're assigned
to it, and a smaller icon-only variant on each stop of your run.

**How you do it:** tap the button — it's a plain `tel:` link, no in-app dialog.

**What happens:** your phone's own dialer opens with the contact's number pre-filled.

**Who can do this / boundary:** the phone number is only ever shown to **you, the assigned
driver** on that specific pickup — anyone else viewing the same pickup (a volunteer browsing for
awareness, or you before you've claimed it) never sees this button at all; if the contact simply
has no phone on file, the button renders nothing rather than showing a broken control or leaving
a layout gap.

### Navigate (Google Maps deep link)

**Where it lives:** a **Navigate** button on a pickup's detail page, and on each run stop's
current-stop card and its entry in the quiet remaining-stops list.

**How you do it:** tap **Navigate**.

**What happens:** it opens `https://www.google.com/maps/dir/?api=1&destination=…` in a new
browser tab, pre-loaded with turn-by-turn directions to that pickup or stop's coordinates — a
free deep link, no in-app map or dialog involved, no server call made.

**Who can do this / boundary:** available on any pickup/stop with a resolved address — no
special role check beyond already being on that pickup/run's detail page.

### Advancing a pickup's status (sticky mobile bar)

**Where it lives:** a pickup's detail page — an **"Advance to `<next status>`"** button.

**How you do it:** tap the button. On a phone, this control becomes a **fixed bottom bar** —
always within thumb's reach, positioned above the bottom nav with safe-area padding so it never
overlaps your phone's own gesture bar. On desktop it renders inline as before.

**What happens on submit:** the pickup moves forward exactly one stage: `Accepted → En route →
Picked up → Delivered`. Once it reaches a terminal state (`Delivered`/`Cancelled`), the button
disappears — there's nowhere further to advance.

**Who can do this / boundary:** only you, the pickup's **assigned** driver — the server checks
`pickup.volunteerId === your user id` (this column holds the assigned collector's id, historically
named for the pre-dispatch-model-v2 volunteer-collector design, but it's a driver id today) and
rejects the advance otherwise.

### Upload proof-of-delivery photo

**Where it lives:** a pickup's detail page — an **"Add photo"** control, shown **only on the
delivering step** (i.e. between `Picked up` and `Delivered`).

**How you do it:** tap **Add photo**; your device's camera/file picker opens, same
compress-then-upload flow as the donor's photo upload.

**What happens:** the photo attaches to the pickup as its proof-of-delivery image — this is what
later powers the donor's [delivery proof-back](#delivery-proof-back) panel.

**Who can do this / boundary:** optional, **never a gate** — you can advance to `Delivered`
without one; distribution is confirmed by whoever is present, not by a photo requirement. Only
the assigned driver can set this photo; the server checks row ownership before accepting it.

### Share your live location (pickup or run)

**Where it lives:** no button — it starts automatically as soon as you're on a pickup detail page
while its status is `En route`/`Picked up`, or on **My Run** while the run is `Active`.

**What you see:** a small **"Sharing your location…"** banner (with a soft pulsing dot) confirms
it's on.

**What happens behind the scenes:** the app pings the server roughly every 30 seconds with your
coordinates; it self-stops the moment the server confirms the pickup/run is no longer active —
you never need to remember to turn it off, and the trail is **deleted the moment you mark the
pickup/stop delivered**, nothing lingers.

**If your browser denies location access** (or doesn't support it), a muted note explains sharing
is off and that the pickup still works normally either way — your driving isn't blocked by
consent. *(Keep your screen on during the run for continuous tracking on the web app.)*

**Who can do this / boundary:** the server independently validates you're the assigned driver,
the pickup/run is genuinely active, and the coordinates you send are within a sane range, before
accepting a ping.

### View My Run

{{IMG:25-driver-run}}

**Where it lives:** bottom nav → **My run**, route `/portal/run`. **What you see:** the run a
coordinator has built or assigned you, driven stop by stop — a current-stop hero card up top and
a quieter list of the remaining stops below.

The **Enable notifications** push opt-in card now also appears here — right at the top of the
page, both on the empty state (no run assigned yet) and once you have an active run — so you
have a discoverable place to turn on push alerts even though you land on this page instead of the
shared dashboard.

**Who can do this / boundary:** you see only your **own** active/next-planned run — the query is
scoped to your driver id, never another driver's route.

*Before a run is assigned to you, this screen simply reads "No run assigned to you yet — check
back later," with the coordinator's phone number underneath (and the push opt-in card, described
above).*

### Mark a run stop done

**Where it lives:** on **My Run**'s current-stop hero card — a **"Mark done"** button.

**How you do it:** tap it once you've completed that stop (collected the food, or handed it off).

**What happens on submit:** that stop moves to `Done`; the run **auto-completes** once every stop
on it is done, and your GPS trail is purged at that point.

**Who can do this / boundary:** the server checks `run.driverId === your user id` — only the
run's own assigned driver can mark its stops done from this screen (a volunteer riding along
confirms **drop** stops from their own **Today's Distributions** screen instead, which is a
looser "any volunteer on an active run" check, described in the volunteer section).

### View run live map

**Where it lives:** **My Run**, automatically, while the run is `Active`.

**What you see:** your route toward the next stop — a real road-following route when the OSRM
routing service is available, otherwise a straight-line-plus-rough-ETA fallback so the map is
never simply blank.

**Who can do this / boundary:** the run's own driver, any admin, or any volunteer can view this
live map — it's not restricted to "volunteers on this specific run."

The structure of a run — its ordered pickup and drop stops — is exactly what staff build on the
admin side; see [Open a run's detail](#open-a-runs-detail) in the admin guide for the full
picture, including how a coordinator can reassign you mid-run or override a stop if something
needed correcting in the field.

---

## 6. Admin / staff guide

*This is the coordinator's cockpit. Everything the foundation needs to run the operation lives
under **Staff sign-in → Admin**. This section is your training + support reference.*

The left sidebar is your map: **Overview · Pickups · Dispatch Runs · Destinations · Partners ·
Users · Reports**. Header buttons let you jump straight to **Log surplus** and **New run** from
several pages. **Every action below is gated to the `admin` role** on the server, independent of
the sidebar/UI — this is stated once here rather than repeated in every subsection.

### What you can do (admin powers)

| Capability | What it lets you do |
|---|---|
| View the overview dashboard | See the day's situational picture at a glance |
| Log surplus on a partner's behalf | Record a pickup that came in by phone/in-person |
| Create a new run | Start building a driver's route for a trip |
| View & filter pickups | Browse, filter, sort, and paginate every pickup in the system |
| Assign a pickup to a driver | Put a specific driver on a `Requested` pickup manually |
| Bulk-assign pickups | Assign many pickups to one driver in a single action |
| View a pickup's admin detail | See donor/partner/driver names and the full status history |
| Verify / unverify a pickup | Flag a pickup as bookkeeping-verified, without blocking dispatch |
| Export pickups to CSV | Download the filtered pickups list as a file |
| View the runs list | See every dispatch run with its date, slot, status, driver |
| Open a run's detail | Drill into one run's live stops and controls |
| Assign / reassign a run's driver | Put a driver on an existing run, or swap them |
| Edit a run | Change a run's slot/date |
| Add a pickup or drop stop to a run | Build out a run's route |
| Reorder run stops | Change the sequence a driver visits stops in |
| Remove a run stop | Take a stop off a run |
| Override a stop's status | Force a stop's status directly, bypassing the normal flow |
| Advance / cancel / delete a run | Move a run through its lifecycle, or remove it |
| View a run's stop history | See the full audited trail of every stop status change |
| View reports | Read impact numbers, rescue-time SLA, and breakdowns over any date range |
| Export reports / pickups CSV | Download run summaries or pickups for a chosen range |
| Manage destinations | Add, edit, toggle active/inactive, or delete a drop destination |
| Manage partners | Add, edit, or delete a donating organisation |
| Link a donor to a partner | Attribute a donor's posts to a partner for reporting |
| View & search/filter users | Browse everyone in the system, searchable and filterable by role |
| Invite a user | Provision any role (including admin) with name/phone/city, skipping onboarding |
| Change a user's role | Promote or change any user's role, except your own or the last admin's |
| Deactivate / reactivate a user | Suspend or restore access, with last-admin protection |

### Overview (dashboard)

{{IMG:30-admin-dashboard}}

**Where it lives:** sidebar → **Overview**, your landing page after admin sign-in.

**What you see:**
- **Top-line tiles** — meals rescued, kg rescued, deliveries, open pickups, in-progress count,
  active runs.
- **Deliveries — last 30 days** — the trend line.
- **Pickup status** — a donut of Open / In progress / Delivered / Cancelled.
- **Top partners** and **Top destinations** — where food comes from and where it goes.
- **Directory counts** — partners, destinations, volunteers, drivers.

**Note on load time:** this page fires every independent aggregate query in one batched round
trip rather than several sequential ones, so it should feel snappy — but on Cloudflare's
serverless database connections it can still occasionally feel slow to first paint compared to a
simple list page. If it seems to hang, give it a few seconds before assuming something's broken;
this is a known characteristic of the current architecture (see [Known limitations](#known-limitations)),
not a sign the data is wrong.

#### How meals and kg are counted

A small **"?"** hint sits next to each of these two tiles, because they are genuinely two
separate things and the app is deliberate about **never converting one into the other**:

- **Meals rescued** — delivered pickups logged in **servings**; one serving = one meal.
- **Kg rescued** — delivered pickups logged by **weight**, counted completely separately.

A pickup is logged in whichever unit the donor (or the staff member logging on their behalf)
chose — never both, and never converted. If you're explaining the dashboard to a partner or a
CSR sponsor, this is the one number that needs the caveat.

**Use the Overview to:** spot a pile-up of *Open* pickups that need dispatching, or *In progress*
items that look stalled.

### Log surplus on a partner's behalf

{{IMG:38-admin-log-surplus}}

**Where it lives:** **Log surplus** header button, available from Overview or the Pickups page.

**How you do it, step by step:**
1. Tap **Log surplus** — a sheet opens.
2. Pick the **partner** this surplus is coming from, from a dropdown — this comes first.
3. Fill the same food form a donor would: food type, quantity/unit, description, pickup window,
   address (with **Find**, same as the donor's address flow).
4. Submit.

**What happens on submit:** a new pickup is created exactly as if the partner had posted it
themselves, but internally tagged as **logged by a coordinator**, so it's distinguishable in
reports. **What you see next:** you land on the Pickups list with the sheet closed and your new
pickup at the top.

**Who can do this / boundary:** admins only. This exists for surplus that came in by phone call or
in person, rather than through the partner (or a linked donor account) posting it themselves.

### Create a new run

{{IMG:33-admin-runs}}

**Where it lives:** **New run** header button, from Overview or the Runs page.

**How you do it:**
1. Tap **New run** — a sheet opens.
2. Choose the **slot** (morning/night) and **date**.
3. Optionally pick a **driver** right away, or leave it unassigned and set it later.
4. Submit.

**What happens on submit:** a new run is created in `Planned` status; stops are **not** added
here. **What you see next:** you land directly on the new run's detail page, where you add stops
(see **Inside a run** below).

### View pickups (filter/sort/paginate)

{{IMG:31-admin-pickups}}

**Where it lives:** sidebar → **Pickups** — the master list behind the whole rescue loop.

**How you do it:** use the filter bar (status, date range) to narrow the list; click any column
header to sort by it, click again to reverse the sort. **Any filter or sort change resets you to
page 1** of the results. Use the pagination control at the bottom to move between pages.

**Row-level actions** (each described in its own subsection below): the **⋯** menu on each row
offers **Assign** (when `Requested`) and **View**; selecting row checkboxes reveals a bulk **Assign**
bar; **Export** in the filter bar downloads the current filtered/sorted view.

### Assign a pickup to a driver

{{IMG:31b-admin-bulk-assign}}

**Where it lives:** Pickups row → **⋯** menu → **Assign** — shown only on `Requested` rows.

**How you do it:** open the **⋯** menu, tap **Assign**, pick a driver from the dialog's picker,
confirm.

**What happens on submit:** an atomic conditional update runs (same "first one wins" safety as a
driver's own claim), a status event is recorded, and the assigned driver gets a notification.

**Who can do this / boundary:** admins only; the picker is deliberately sourced from an
**assignable-drivers** list, never volunteers — a pickup assigned to a volunteer here would get
stuck, since only the `driver` role can later advance a pickup through its stages. (An earlier
build had this picker wrongly sourcing volunteers; that's been fixed, and the dead
volunteer-listing code path behind it has since been removed entirely.)

### Bulk-assign pickups to a driver

Also shown in the screenshot above ({{IMG:31b-admin-bulk-assign}}).

**Where it lives:** Pickups list → select multiple rows via their checkboxes → an **"N selected →
Assign to driver"** bar appears at the bottom.

**How you do it, step by step:**
1. Tick the checkboxes on the `Requested` pickups you want to hand to one driver.
2. Tap **Assign** in the bar that appears.
3. Pick **one** driver in the dialog (the picker validates this single driver up front).
4. Confirm.

**What happens on submit:** each selected pickup runs through the **same** atomic per-row assign
path as a single assign — this is never a blanket database update. **What you see next:** each
row reports its own success or failure independently; if another admin or driver raced you and
claimed a row in the meantime, that row's checkbox **stays selected** (so you can see what failed
and retry), while succeeded rows clear automatically.

**Who can do this / boundary:** admins only, capped at 100 pickups per bulk action.

### View a pickup's detail (admin-only, with history)

{{IMG:32-admin-pickup-detail}}

**Where it lives:** Pickups row → **⋯** menu → **View** — opens the dedicated route
`/admin/pickups/[id]`, deliberately separate from the shared donor/driver/volunteer detail page.

**What you see:** donor, partner, and driver names spelled out (not just ids), plus a
collapsible, actor-resolved **status history** section — who did each transition, not just what
happened and when. This is the admin-specific depth the shared portal page doesn't expose to
every role.

**Who can do this / boundary:** admins only.

### Verify / unverify a pickup

Shown in the same screenshot above ({{IMG:32-admin-pickup-detail}}) — the **"Mark verified"**
toggle near the top of the admin pickup detail page.

**How you do it:** tap the toggle to flip a pickup between verified and unverified.

**What happens:** a verified badge appears/disappears, and (optionally) some bookkeeping metadata
is recorded — **this never blocks or gates the pickup's normal dispatch progress**, it's purely a
records flag.

**Who can do this / boundary:** admins only. This control now lives directly on the admin pickup
detail page — it was previously only reachable via the shared portal pickup page, with no link to
it from the admin table's "View" flow; that gap is closed as of this edition.

### Export pickups CSV

**Where it lives:** the **Export** link in the Pickups page's filter bar (and again on the
Reports page, described below).

**How you do it:** apply whatever filters you want first, then tap **Export**.

**What happens:** your browser downloads a CSV file of exactly the filtered/sorted list you're
looking at — no in-app dialog, just a file download.

### View runs list

{{IMG:33-admin-runs}}

**Where it lives:** sidebar → **Dispatch Runs**. **What you see:** every run with its date, slot,
status, driver, and stop count (computed efficiently in one grouped query, not one query per
row). **How you do it:** tap a row's chevron to open its detail page.

### Open a run's detail

{{IMG:39-admin-run-detail}}

**Where it lives:** Runs list → a row's chevron. **What you see:** the full live control surface
for that one route — every action below happens on this page.

### Assign / reassign a driver on an existing run

**Where it lives:** run detail page → **"Assign driver"** section — an inline picker plus a
**Save** button.

**How you do it:** open the picker, choose a driver, tap **Save**.

**What happens on submit:** the run's driver is set (or changed) immediately. **Who can do this /
boundary:** admins only. This is how you change the driver on a run **after it already exists** —
separate from picking one at creation time on the New Run sheet.

### Edit an existing run (slot/date/driver)

{{IMG:40-admin-edit-run}}

**Where it lives:** run detail page → **Edit** button, opening a sheet.

**How you do it:** change the **slot** and/or **date**, submit. The sheet is deliberately narrow
— it does **not** touch the driver; that's the separate control described directly above, so the
two concerns (schedule vs. who's driving) don't get tangled into one form.

**What happens on submit:** the sheet closes and the run detail page reflects the new slot/date.

### Add a pickup stop to a run

**Where it lives:** run detail page → **Add stop** → **Pickup** toggle.

**How you do it:** toggle to **Pickup**, choose a **partner** from the dropdown, tap **Add pickup
stop**.

**What happens:** the stop is appended to the run's stop list, ready to be reordered if needed.

**Who can do this / boundary:** admins only, and only while the run is still `Planned` or
`Active` — a completed or cancelled run's stop list is permanently read-only.

### Add a drop stop to a run

**Where it lives:** run detail page → **Add stop** → **Drop** toggle.

**How you do it:** toggle to **Drop**, then choose **Saved** (pick a destination from the
dropdown) or **Ad-hoc** (type a free-text address).

**What happens on submit:** for a saved destination, the stop is appended directly. For an ad-hoc
address, the server **geocodes it automatically** before inserting the stop.

**Who can do this / boundary:** admins only, same `Planned`/`Active` restriction as pickup stops.
**The destination picker filters to active-only destinations** — an inactive destination (see
the Destinations section below) won't appear here, so a place the foundation has stopped using
can't accidentally be added to a new run.

### Reorder run stops

**Where it lives:** run detail page → up/down arrow icons on each stop row.

**How you do it:** tap the up or down arrow next to a stop.

**What happens:** it swaps sequence position with its neighbour immediately — no dialog, no
confirm.

**Who can do this / boundary:** admins only, `Planned`/`Active` runs only.

### Remove a run stop

**Where it lives:** run detail page → trash icon on each stop row.

**How you do it:** tap the trash icon, confirm in the dialog.

**What happens:** the stop is removed from the run.

**Who can do this / boundary:** admins only, `Planned`/`Active` runs only.

### Override a stop's status

**Where it lives:** run detail page → a status **dropdown** directly on each stop row.

**How you do it:** open the dropdown on a stop, pick `Pending`/`Done`/`Skipped` directly.

**What happens on submit:** the stop's status is force-set to whatever you picked — this
**bypasses** the normal driver/volunteer "Mark done" confirm flow entirely, and if it closes out
the last remaining stop, the run auto-completes exactly as it would from a driver's own action. A
`stop_status_events` row is recorded either way, so the override shows up in the stop's audit
trail (see below) just like a normal confirm would.

**Who can do this / boundary:** admins only; rejected outright (a conflict error) if the run is
already `Completed` or `Cancelled` — you can't retroactively edit a closed run's stop statuses.
This is a deliberate escape hatch for correcting a missed "mark done" in the field.

### Advance / cancel a run

**Where it lives:** run detail page → status buttons for the run itself (not a single stop).

**How you do it:** tap the button for the run's next legal transition
(`Planned → Active → Completed`, or `→ Cancelled` from either state).

**What happens:** forward transitions (`Planned → Active`, `Active → Completed`) apply
immediately with no confirm; **Cancel** goes through a confirm dialog first, since it's
destructive to the plan.

**Who can do this / boundary:** admins only, and only for legal transitions — the button set
adapts to the run's current status so you can never attempt an illegal jump.

### Delete a run

**Where it lives:** run detail page → **Delete** button.

**How you do it:** tap **Delete**, confirm.

**What happens:** the run is permanently removed. **Who can do this / boundary:** admins only, and
**only** while the run is `Planned` or `Cancelled` — an `Active` run must be cancelled first, and
a `Completed` run can never be deleted (it's permanent history at that point).

### View run stop history (full audit trail)

{{IMG:39-admin-run-detail}}

**Where it lives:** run detail page → **"History"** collapsible section, below the Stops list.

**What you see:** a chronological `<from> → <to> · <actor> · <time, IST>` line per stop —
who changed what, and when, for every status transition any stop on this run has ever had,
including admin overrides.

**Note on older runs:** a stop with **zero** recorded status-change events (created and completed
before this audit-trail feature shipped) falls back to showing just a completion-time line with
no actor and no "from" status, rather than going blank — this is expected for older/legacy runs,
not a bug; see [Known limitations](#known-limitations).

**Who can do this / boundary:** admins only.

### View reports

{{IMG:37-admin-reports}}

**Where it lives:** sidebar → **Reports**.

**What you see:**
- **Meals / kg rescued and deliveries** for the period — the same never-converted split as the
  Overview dashboard.
- **Average and 90th-percentile rescue time** (posted → delivered minutes) — the headline
  food-safety/impact SLA metric, shown only once there's at least one delivered pickup in range.
- **Breakdowns** by run, by destination, and by partner, each with a small bar chart.

### Change reports date range

**Where it lives:** date inputs directly on the Reports widget.

**How you do it:** change the start/end date inputs.

**What happens:** the whole report re-runs, applied via URL query parameters — so a specific
date range is shareable as a link with a colleague. Defaults to month-to-date.

### Export reports (run summary) CSV

**Where it lives:** Reports page → **"Export runs"** link.

**How you do it:** tap it (after setting whatever date range you want).

**What happens:** downloads a CSV summary of runs for the current range — a route handler, not an
in-app dialog.

### Export pickups CSV (from Reports)

**Where it lives:** Reports page → **"Export pickups"** link.

**How you do it:** tap it.

**What happens:** downloads the same pickups export the Pickups page's own **Export** button
produces, carrying whatever filters were active.

### Destinations

{{IMG:34-admin-destinations}}

**Where it lives:** sidebar → **Destinations** — the places rescued food is delivered to
(shelters, night zones, community points). Each row has an **Open in maps** link. These become
the **drop stops** available when building a run.

#### Add a destination

{{IMG:33b-admin-add-destination}}

**How you do it:** tap **Add destination** — a sheet opens: name, area, an **address field +
Find** button (same paste-a-maps-link-or-type-an-address flow as the donor's), a draggable pin on
an embedded map, and city. Submit.

**What happens on submit:** the destination is created — **always active by default** (there's no
way to create one pre-inactive in a single step; see below).

#### Edit a destination

**How you do it:** row **⋯** menu → **Edit** — the same sheet, pre-filled.

#### Toggle a destination active/inactive

**Where it lives:** inside the **Edit destination** sheet only (not the Add sheet) — an
**Active** switch.

**How you do it:** open **Edit** on an existing destination, flip the **Active** switch, submit.

**What happens on submit:** the destination's active flag flips; the destinations list shows an
**Inactive** badge on it, and — critically — **the add-stop picker on a run's detail page filters
to active destinations only**, so an inactive place quietly stops being offered for new runs
without needing to be deleted.

**Who can do this / boundary:** admins only. **Edit-only by design:** a brand-new destination is
always created `active: true`; the toggle only becomes relevant once a destination is already in
use and the foundation wants to stop offering it for new runs — see the note directly above.

#### Delete a destination

**How you do it:** row **⋯** menu → **Delete**, confirm.

**What happens:** if the destination was used by any past run, the delete is **blocked** with a
conflict message that now correctly points you at the active/inactive toggle above as the
alternative — deleting isn't the only way to retire a destination from active use anymore.

### Partners

{{IMG:35-admin-partners}}

**Where it lives:** sidebar → **Partners** — the restaurants, hostels, and organisations that
regularly donate.

#### Add / edit / delete a partner

**How you do it:** **Add partner** (a sheet: name, type, contact, city) or row **⋯** → **Edit**
(same form, pre-filled) or **Delete** (confirms first; blocked with a conflict message if the
partner is linked to donors or has past run stops).

### Link a donor to a partner

**Where it lives:** Partners page → a separate card below the partners table, **"Link donor to
partner."**

**How you do it:** two plain **native HTML `<select>` dropdowns** (donor, then partner — visually
plainer than the rest of the page, a known cosmetic inconsistency, see
[Known limitations](#known-limitations)) — pick a donor, pick a partner, tap **Link**.

**What happens:** the foundation can now **attribute rescued food to that partner** in reports,
even though the donor posted it under their own personal account.

**Who can do this / boundary:** admins only.

### Users

{{IMG:36-admin-users}}

**Where it lives:** sidebar → **Users** — everyone in the system: name, email, role, status,
actions.

### Search / filter users

**Where it lives:** the search box and role-filter dropdown at the top of the Users page.

{{IMG:36c-admin-users-search}}

**How you do it:** type into the search box (matches name/email), and/or pick a role from the
filter dropdown.

**What happens:** the table filters live, applied via URL parameters. **A distinct "no match"
empty state** shows when your search/filter combination finds nothing, versus a different
"no users yet" state when the system genuinely has none — so you can tell a typo apart from an
empty system at a glance.

### Invite a user (any role, with name/phone/city)

{{IMG:36b-admin-invite}}

**Where it lives:** Users page → **Invite** button, opening a modal.

**Fields, step by step:**
1. **Email** (required).
2. **Name** — the person's full name (required).
3. **Role** — a dropdown offering **all four roles**: donor / volunteer / driver / **admin**.
   Selecting **Admin** shows a small inline hint, because **this is the only way to make someone
   an admin** — there's no separate "promote to admin" control anywhere else in the app.
4. **Phone** *(optional)* — validated server-side against an Indian mobile number pattern.
5. **City** *(optional)*.
6. Tap **Send invite**.

**What happens on submit:** the person receives a Clerk email invitation. Their profile is
pre-stamped with `onboardingComplete: true` and the name/role/phone/city you entered, carried in
the invite's metadata. **When they sign in through that invite link, they skip onboarding
entirely** — no role-picker, no profile form; their profile row is provisioned automatically on
their first authenticated request, and they land straight on their dashboard (or
`/admin/dashboard` if you invited them as an admin).

**What you see next:** the modal shows an inline **"invite sent"** confirmation (not a toast that
disappears), so you can immediately invite another person without losing your place.

**Who can do this / boundary:** admins only; email, role, name, and phone are all format-validated
server-side regardless of what the client sends.

### Change a user's role

**Where it lives:** Users row → the role `<select>` dropdown, directly in the table.

**How you do it:** pick a different role from the dropdown.

**What happens on submit:** it **fires immediately — there is no confirm dialog.** The database
role write happens **before** the corresponding Clerk metadata update, specifically so a partial
failure never leaves the two systems silently disagreeing about someone's role.

**Who can do this / boundary:** admins only; your **own row shows a static badge instead of a
dropdown** (you cannot change your own role from here), and the server independently blocks any
change that would demote the platform's **last active admin** — the system can never be left with
zero admins through this control.

### Deactivate a user

**Where it lives:** Users row → **Deactivate** button.

**How you do it:** tap it, confirm in the dialog.

**What happens on submit:** a soft-deactivated flag is set (treated as signed-out immediately on
their next request) plus a best-effort ban on their Clerk account.

**Who can do this / boundary:** admins only; blocked on your **own account** and on the **last
active admin** — same protection as the role-change control.

### Reactivate a user

**Where it lives:** Users row → **Reactivate**, shown only on already-deactivated rows.

**How you do it:** tap it — **it fires immediately, with no confirm dialog**, deliberately
asymmetric with Deactivate, since restoring access is considered the safer direction.

**What happens:** the soft-deactivated flag clears, plus a best-effort unban on Clerk.

**Who can do this / boundary:** admins only.

---

## 7. Appendix

### The rescue loop (corrected model)

```
Donor posts food  →  Staff dispatch it into a run  →  Driver claims/is assigned it, collects (pickup leg)
      →  Driver + volunteers deliver to a destination (distribution leg)  →  Delivered ✓
```

- A **driver** collects — by claiming an open pickup from the board, or by being assigned into a
  run by staff. Volunteers are never the collector.
- A **volunteer** rides along or meets the run at the drop to help distribute and can confirm
  the drop; they browse pickups and runs for awareness but don't act on the pickup leg.
- **Staff** build runs, adjust them live (reorder/add/remove/override stops, reassign the
  driver), and can manually assign a specific driver to a pickup outside the normal claim flow.

Every step is recorded — who did it and when — via an audited status-event trail. Nothing is
marked delivered without going through the proper stages.

### Live tracking — who sees what

The driver's GPS is the tracked position; visibility depends on which **leg** the pickup is on
and who's watching:

| Leg | Pickup status | Admin | Donor (owner) | Volunteer | Driver (self) |
|-----|---------------|:-----:|:--------------:|:---------:|:---------:|
| Pickup (→ collect) | `En route` | ✅ | ✅ | ✅ | ✅ (own position) |
| Distribution (→ drop) | `Picked up` | ✅ | ❌ — the donor's live view ends here | ✅ | ✅ (own position) |
| Run (driver's whole route) | run `Active` | ✅ | n/a | ✅ | ✅ (own position) |

The donor's status text keeps updating after their live view ends (`Picked up` → `Delivered`);
they simply stop seeing the moving pin once their food has been collected. Any active volunteer
can view a driver's location on both legs, and on an active run's live map — in this
single-organisation app that's treated as acceptable; a future refinement could scope it to
"volunteers on this specific run" only.

### Pickup statuses

| Status | Meaning |
|--------|---------|
| **Requested** | Posted, waiting to be collected (donor can still edit/cancel) |
| **Accepted** | Claimed or assigned to a driver — someone is on it |
| **En route** | Driver on the way to collect |
| **Picked up** | Food collected, heading to the destination |
| **Delivered** | Reached people in need — done |
| **Cancelled** | Called off, or auto-cancelled after its pickup window lapsed |

### Run statuses

| Status | Meaning |
|--------|---------|
| **Planned** | Built, not yet started — stops can be freely added/reordered/removed |
| **Active** | Underway — live map on, stops still editable, driver reassignable |
| **Completed** | Every stop marked done (auto) — read-only from here on |
| **Cancelled** | Called off by staff — read-only |

### Run stop statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Not yet done |
| **Done** | Confirmed — by a driver (pickup stop), a volunteer (drop stop), or an admin override |
| **Skipped** | Deliberately bypassed (set via the admin override control) |

### Languages & accessibility

The entire app works in **English, Gujarati, and Hindi** — every screen documented in this
handbook, from onboarding to the admin invite modal, exists and is fully translated in all three
languages — in **light and dark** themes, and installs on any phone as an app (no app store
needed) — tap your browser's "Add to Home Screen" (the app also proactively nudges you to install
it after a few visits). All screenshots in this handbook show the English interface; the same
layouts appear in every language.

### Support

Questions about the platform or a specific rescue:
**rajyashfoundation@rajyashgroup.com · +91-9875041206 · Satellite, Ahmedabad 380015**

---

## Known limitations

These are genuinely open, by-design-or-deferred items as of this edition — not bugs to hunt for,
but worth knowing before you rely on the affected screen for training or a demo:

1. **Run-stop history has a legacy fallback.** A stop with zero recorded status-change events
   (created/completed before the audit-trail feature shipped) shows a thinner, completion-time-only
   history line — no actor, no "from" status — instead of a full audit entry. This only affects
   **older runs** created before this feature existed; every run built from here on gets the full
   trail. Avoid using a very old run as your first demo of the History section — pick a recent one.
2. **Destination active/inactive toggle is edit-only.** A brand-new destination is always created
   active; there's no way to create one pre-inactive in a single step. The toggle only matters
   once a destination is already in use and needs to be retired from new runs — which is exactly
   the scenario it's built for, so this is a deliberate scope choice, not a missing feature.
3. **"Link a donor to a partner" still uses two plain native `<select>` dropdowns**, visually
   inconsistent with the styled dropdown component used everywhere else on the Partners page. A
   cosmetic-only gap — the linking function itself works correctly.
4. **The admin overview dashboard can feel slow to first paint.** The underlying queries are
   already batched into one round trip rather than several, and that's a deliberate architecture
   trade-off for this hosting platform (a time-based server cache was tried and reverted because
   it reproduced a worse rendering bug) — so on an occasional slow load, give it a moment rather
   than assuming something's broken.
5. **Onboarding still carries a small dead-code fallback path** for admin-invited users, even
   though invited users never actually reach the onboarding screen anymore (they're redirected
   straight to their dashboard). Harmless — flagged here only so a future cleanup pass knows it's
   safe to remove.

---

*This handbook reflects the live application as of this edition, including the notification
bell, run-driver reassignment, run editing, per-stop status override with a full audit trail,
the donor status timeline and delivery proof-back, the volunteer distributions map, driver
call/navigate/distance-aware board sorting, admin bulk-assign and users search/filter, invite-any-role
provisioning, the restored admin Verify/Unverify toggle, and the driver push-notification opt-in
on My Run. Screens are shown in English; the same screens appear in Gujarati and Hindi when you
switch language.*
