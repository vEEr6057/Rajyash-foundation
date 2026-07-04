# Owner tasks — the things only you can do

Everything code-side is shipped. These need a human with account access / real-world data. Grouped by
effort. None blocks the app running; they harden, measure, and legitimize it.

---

## A. Cloudflare Web Analytics — ✅ DONE (token wired 2026-07-04)

Site created; beacon token `22ff4d17…` wired into the Deploy workflow as a build-time literal (it's
public — embedded in client HTML — so not a secret). Live on the next deploy; verify traffic appears
in the CF Web Analytics dashboard within a few minutes. Original steps kept below for reference.

The beacon code already ships; it only renders when a token is set.

1. Cloudflare dash → **Analytics & Logs → Web Analytics → Add a site**.
2. Site/hostname: `rajyash-food-rescue.shahveerkeaten.workers.dev` (or the real domain once you have one).
3. Copy the **JS beacon token** (a ~32-char hex string from the `data-cf-beacon='{"token":"…"}'` snippet — you only need the token value).
4. Put it where the build can see it — **GitHub Actions repository *variable*** (NOT a secret; `NEXT_PUBLIC_*`
   is inlined into the client bundle at build time so a runtime secret won't reach it):
   - GitHub repo → **Settings → Secrets and variables → Actions → Variables tab → New repository variable**.
   - Name: `NEXT_PUBLIC_CF_BEACON_TOKEN` — Value: the token.
   - Confirm the Deploy workflow passes it at build (it reads repo vars automatically for `NEXT_PUBLIC_*`;
     if not, add `NEXT_PUBLIC_CF_BEACON_TOKEN: ${{ vars.NEXT_PUBLIC_CF_BEACON_TOKEN }}` to the build step's `env:`).
5. Re-run the Deploy (push any commit or re-run the last workflow). Verify: view-source the homepage →
   the `beacon.min.js` script tag is present; traffic appears in the Web Analytics dashboard within minutes.

## B. Uptime monitor (~5 min) — free external health check

The `/api/health` endpoint already returns `{"ok":true}` (200) / 503.

1. Create a free account at **UptimeRobot** (or Better Stack / Cronitor free tier).
2. **Add New Monitor → HTTP(s)** → URL `https://rajyash-food-rescue.shahveerkeaten.workers.dev/api/health`.
3. Interval 5 min; alert contact = your email. Optionally keyword-match `"ok":true`.
4. That's it — you'll get an email if the app or DB goes down.

## C. GU / HI native-speaker review — the translations are machine drafts

Every non-English string was machine-drafted and flagged `_review: pending`. A native Gujarati/Hindi
speaker (Adit / Princy) should read them in context and correct tone/terms. Two ways:

- **In-app (best):** open the live site, switch language (footer/header EN·ગુ·हि toggle), walk the
  homepage + portal + a pickup + the admin screens, note anything that reads awkward.
- **By file (complete):** the catalogs live in `src/i18n/messages/{gu,hi}/*.json`. Namespaces to review:
  `common`, `landing`, `portal`, `admin`, `auth`, `privacy` (+ `donate` once the Razorpay scaffold merges,
  and the notification copy in `src/server/notifications/copy.ts`). Send corrections as "key → better
  text" and I'll apply them in one pass.
- Priority order (most-seen first): `landing` (homepage) → `common` (units, nav, buttons, footer) →
  `portal` (donor/volunteer/driver) → `admin` → `auth`/`privacy`.

## D. Registration / legitimacy details — real data for the footer + receipts

The footer's legitimacy column and the (dark) donation receipt use placeholders. Provide, if they exist:
- NGO/trust **registration number**, and the **80G** certificate number (for tax-deductible receipts —
  currently an empty `NGO_80G_NUMBER` constant with a TODO). Give me the strings and I'll wire them in.
- Any official **social links** beyond the Facebook/Instagram placeholders now in the footer + JSON-LD.

## E. Production Clerk instance + real domain — the #1 performance lever (bigger, when funded)

The verification pass found the homepage's ~2.4s first-visit delay is a **Clerk development-instance**
handshake (bounces through `clerk.accounts.dev`), which also triggers the "third-party cookies" flag.
It disappears on a **production Clerk instance**, which requires a real custom domain (you're on the free
`*.workers.dev`). When a domain is funded:
1. Register the domain; add it to Cloudflare; point Pages/Workers at it.
2. In Clerk: create a **Production instance**, set the domain, do the DNS (CNAMEs Clerk gives you).
3. Swap the app's Clerk keys (`pk_live_…` / `sk_live_…`) in GitHub Actions vars/secrets.
4. Update `metadataBase`, the JSON-LD `url`, sitemap/robots host, and the health-monitor URL to the new domain.
This is the single change that most improves real-world load time.

## F. Clean the hijacked WordPress at rajyashfoundation.com (security — do soon)

The **official** rajyashfoundation.com is compromised — browsers get redirected to a "1win" gambling
scam via injected/cloaked JS (the static HTML is clean; the injection is server-side/plugin-level). Our
app was rebuilt from the clean source and never mirrors the live hijacked page, so **our** site is fine —
but the foundation's real domain is actively harming visitors and its reputation.
1. Get the WordPress host/admin credentials.
2. Take a backup, then look for: unknown admin users, recently-modified `wp-content` files, malicious
   plugins/themes, injected `<script>` in `header.php`/`functions.php` or the DB `wp_options`.
3. Fastest safe path for a non-expert: engage the host's malware-cleanup service (most cPanel hosts have
   one) or a service like Sucuri/Wordfence; then rotate ALL passwords + update WP core/plugins/themes.
4. Until cleaned, consider parking the domain or putting up a static holding page.

## G. Razorpay go-live (parked — only when NGO KYC clears)

The donation flow ships as **code-complete but dark** (feature-flagged off; app boots with no keys). When
KYC is done and you want to accept donations, the steps are in the Razorpay-scaffold PR's description —
short version: clear KYC → get live keys → register the webhook URL in the Razorpay dashboard → apply the
donations migration → set the 80G number → flip `PAYMENTS_ENABLED` on. I'll walk it with you then.

---

### Quick-win order
A + B (10 min total, real monitoring/analytics) → D (5 min if the numbers exist) → C (as Adit/Princy have
time) → F (security, engage the host) → E + G (when funded / KYC clears).
