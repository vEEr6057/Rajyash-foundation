# Food Porter — Where the Platform Is Going

*Prepared for the Rajyash Foundation co-founders · July 2026*

---

## What Food Porter is

Food Porter connects people who have surplus food — restaurants, families, event halls — with
the foundation's food-rescue operation across Ahmedabad. A donor posts surplus food in under a
minute; the foundation's driver collects it and, together with volunteers who ride along as
helping hands, distributes it to people in need. The web platform runs the whole loop: the
pickup and delivery are tracked live on a map from door to door, and the foundation sees
everything on one dashboard. It also gives the foundation a modern public website with online
donations (UPI/cards via Razorpay) in English, Gujarati, and Hindi.

Under the hood it is built the same way large delivery platforms (Swiggy, Porter, Uber) are
built — the same guarantees that no two people are ever dispatched to the same pickup, that
every status change is recorded with who did it and when, and that no donation payment can ever
be counted twice or lost.

## Where we are today

The platform is **ready to launch now, at ₹0/month** in running costs:

- Complete rescue loop: donor posts → driver picks up → volunteers help distribute → live
  tracking → delivered — tested end to end.
- Admin dashboard: pickups, delivery runs, volunteers, partners, destinations, reports.
- Public website with online donation flow (goes fully live once Razorpay NGO verification clears).
- Three languages, light/dark themes, installable on any phone as an app (no app store needed).
- Runs on the foundation's own domain — **rajyashfoundation.com** — replacing the current site
  (which is currently broken and showing an error page).

Launching costs nothing but access: the domain login, a foundation email for the hosting
accounts, and the Razorpay paperwork already in progress.

## The end goal

A platform the foundation can run for years and point to with pride: **every rescued meal
counted and visible, every driver and volunteer coordinated through the channels they actually
use, every donation safe and receipted, and the service reliable enough that partners plan
around it.**

Getting there is four stages. Each stage stands on its own — the foundation decides the pace.

---

### Stage 1 — Launch on our domain (now · ₹0/month)

The switch-over: Food Porter live on rajyashfoundation.com, donations in test mode until
Razorpay verification clears, daily automatic data backups, uptime alerts, and error monitoring
in place from day one.

**Needs from the foundation:** domain access (GoDaddy), a foundation email to own the accounts,
the content decision on the old site's program pages, and the Razorpay KYC push.

### Stage 2 — Drivers & volunteers on WhatsApp (~₹500–1,000/month)

Today the platform notifies drivers and volunteers by app notification and email. In India they
live on WhatsApp — the most successful food-rescue networks (e.g. Robin Hood Army) coordinate
entirely there. This stage adds official WhatsApp messages for new pickups, assignments, and
delivery confirmations.

Cost is per message (about 12 paise each); at current scale that is roughly **₹300–500/month**,
growing gently with activity. This is the single highest-impact rupee the foundation can spend
on the platform.

### Stage 3 — Professional-grade reliability (~₹2,500–3,500/month)

Upgrades the database to a paid plan (Supabase Pro, ~₹2,200/month): professionally managed
daily backups with point-in-time recovery, no free-tier limits, and guaranteed uptime. Add
roughly ₹500–1,000 buffer for email volume and message growth. Right time: once donations flow
and the platform is part of daily operations — when losing a day of data would genuinely hurt.

This stage also delivers the **public impact dashboard**: live "meals rescued / kg saved"
counters on the website — the number donors, CSR partners, and auditors ask for, produced
automatically from real delivery records.

### Stage 4 — Native mobile app (when scale demands · project cost, not monthly)

The web app works on every phone today, with one honest limitation: live GPS tracking pauses
when a driver's screen locks. A native Android app (drivers first) removes that, adds offline
support for dead zones, and puts Food Porter on the Play Store. This is a build project —
worth doing when volunteer count or a funding partner justifies it, not before. Ongoing cost
stays near zero (Play Store: ₹2,200 one-time).

---

## Cost summary

| Stage | What the foundation gets | Monthly cost |
|---|---|---|
| 1 · Launch | Full platform, live on rajyashfoundation.com | **₹0** |
| 2 · WhatsApp | Driver & volunteer coordination where they actually are | **~₹500–1,000** |
| 3 · Professional grade | Guaranteed backups & uptime + public impact counters | **~₹2,500–3,500** |
| 4 · Native app | Background tracking, offline support, Play Store | Project cost; ~₹0/month |

For context: Stage 3 — a professionally-run donation and logistics platform — costs less per
month than a single restaurant table for four. Razorpay charges 2% per donation (industry
standard, no fixed fee).

## What we ask of the foundation

1. **Access** — GoDaddy domain login (or someone who can change settings for us).
2. **Ownership** — a foundation email address that owns all the platform accounts, with us as
   operators. The platform belongs to the foundation, not to any individual.
3. **Razorpay KYC** — complete the NGO verification (in progress) so donations go live.
4. **A decision on pace** — which stage the foundation wants, and when. Stage 1 needs nothing
   but the access above.
