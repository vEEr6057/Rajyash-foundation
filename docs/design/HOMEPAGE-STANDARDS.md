# Homepage Standards Spec — must-haves & industry baselines

**Scope:** the public homepage (`/`) only. This is the *compliance/technical* layer that sits
under [HOMEPAGE-SPEC.md](HOMEPAGE-SPEC.md) (the design contract). Design says how it looks;
this says what it must *do* to meet 2025–26 industry standards for a nonprofit site.
Researched 2026-07 (sources at bottom); statuses audited against the live codebase.

**Status legend:** ✅ have · 🟡 partial · ❌ missing

---

## 0. Scorecard (audited)

| Area | Status | Gap in one line |
|---|---|---|
| Title/meta description | 🟡 | exists, but no `metadataBase`, lengths unchecked |
| Open Graph + Twitter cards | ❌ | no OG/Twitter meta at all, no og-image asset |
| Canonical URL | ❌ | not declared |
| robots.txt | ❌ | none — crawlers unguided, `/admin` `/api` not disallowed |
| sitemap.xml | ❌ | none |
| JSON-LD (NGO schema) | ❌ | none |
| `<html lang>` per locale | ✅ | root layout sets `lang={locale}` |
| hreflang | ❌→N/A | single-URL cookie locale — see §2 mitigation |
| Core Web Vitals hero treatment | 🟡 | hero eager but no `fetchpriority`/`width/height`/preload |
| Image pipeline (srcset/AVIF) | ❌ | single JPEG per image, no responsive variants |
| Font budget | ❌ | 7 families / ~30 weights loaded; standard is 2–4 files <100KB |
| Security headers | ❌ | no CSP/HSTS/XCTO/Referrer/Permissions anywhere |
| Favicon/PWA baseline | 🟡 | manifest + 192/512/maskable ✅; no `apple-touch-icon`, no SVG icon |
| Trust: contact + identity | ✅ | footer email/phone/address + "initiative of Rajyash Group" |
| Trust: impact provenance | ✅ | provenance ledger ("counted from deliveries logged in this app") |
| Trust: real photography | ✅ | real graded+captioned program photos, no stock |
| Privacy policy page | ❌ | none (needed once analytics or donations exist) |
| Analytics | ❌ | none — decide cookieless option |
| Conversion UX above-fold CTA | ✅ | one green CTA in masthead + hero |
| A11y AA specifics | 🟡 | skip-link/contrast/reduced-motion ✅; needs axe pass + focus audit |

---

## 1. SEO & discoverability — MUST

### 1.1 Metadata (root + homepage)
- `metadataBase: new URL("https://rajyash-food-rescue.shahveerkeaten.workers.dev")` (swap when real domain lands) — without it, OG URLs resolve relative and break.
- **Title ≤60 chars, keyword-first:** `Rajyash Food Rescue — Surplus food to people in need, Ahmedabad` (63px-safe; template: `%s — Rajyash Food Rescue` for inner pages).
- **Description 150–160 chars with a CTA verb**, front-load first 110 (mobile cut): e.g. "Every evening, Rajyash Foundation volunteers carry Ahmedabad's surplus food to people in need. Donate surplus or volunteer to drive a rescue."
- `alternates: { canonical: "/" }`.

### 1.2 Open Graph + Twitter (❌ → build)
- Create **one real og-image**: `public/og.jpg`, **1200×630**, <300KB — the graded night-distribution photo + logo + tagline in the 1080×600 safe zone. Not auto-generated text-on-gradient (AI tell carries into link previews too).
- `openGraph`: `type: "website"`, `siteName`, `title`, `description`, `images: [{ url: "/og.jpg", width: 1200, height: 630, alt }]`, `locale: "en_IN"`.
- `twitter`: `card: "summary_large_image"`, same image. (No org handle yet — omit `site:` until one exists.)

### 1.3 robots + sitemap (❌ → build; Next file conventions)
- `src/app/robots.ts`: allow `/`; **disallow `/admin`, `/api`, `/portal`, `/onboarding`, `/staff`, `/sign-in`, `/sign-up`**; `sitemap:` absolute URL. No `Crawl-delay` (deprecated, Google ignores).
- `src/app/sitemap.ts`: homepage (priority 1.0) — that's the whole public surface today. Grows as public pages are added. Never list a disallowed URL.

### 1.4 Structured data (❌ → build)
One JSON-LD block on the homepage, `@type: "NGO"`:
```
name "Rajyash Foundation", url, logo (absolute), description,
foundingDate "2016", address {Satellite, Ahmedabad, GJ, 380015, IN},
contactPoint {email rajyashfoundation@rajyashgroup.com, telephone +91-9875041206},
sameAs [facebook, instagram profiles], areaServed "Ahmedabad, IN"
```
Rendered via `<script type="application/ld+json">` in the page (App Router: inline in the layout/page component). **Validate with Google Rich Results Test before sign-off.**

---

## 2. Multilingual (single-URL cookie locale) — accepted trade-off, mitigate

Google's standard is **separate URLs per language** (`/gu/`, `/hi/`) + reciprocal hreflang; cookie-switched content on one URL can't be crawled per-language. Migrating to locale-prefixed URLs is a routing change — **out of scope now, recorded as roadmap debt**.

Mitigations we DO ship (mostly done):
- ✅ `<html lang>` follows the active locale.
- English (the crawlable default) is the primary SEO surface — fine: donors/CSR partners search in English.
- ❌ Do NOT auto-redirect by IP/Accept-Language (we don't).
- When a real domain + more public pages exist, revisit `/[locale]/` prefixes with next-intl routing.

---

## 3. Performance — Core Web Vitals

Targets (75th percentile): **LCP ≤2.5s · INP ≤200ms · CLS ≤0.1**. Lighthouse perf 80+ is the honest goal for this page (no third-party bloat), even though 65–80 is the industry norm.

### 3.1 Hero/LCP image (🟡 → fix)
- Add `fetchPriority="high"` + explicit `width`/`height` (intrinsic 1600×721) to the hero `<img>`; keep `loading="eager"`. Everything below the fold stays `loading="lazy"` + add `decoding="async"` everywhere.
- Preload in head: `<link rel="preload" as="image" href={hero} fetchpriority="high">` (Next: `ReactDOM.preload` or metadata `other`).
- Hero byte budget: **<150KB** — current 98KB JPEG ✅; converting to WebP (~65KB) is a P2 nice-to-have.

### 3.2 Responsive images (❌ → P2)
No Workers image-resizing on the free tier, so pre-generate breakpoints offline (400/800/1200w WebP) for the hero + feature photos, serve via `<picture>`/`srcset sizes`. Thumbnails (~144px rendered) currently ship the full 1600px file — the single biggest byte waste on the page; generate small variants first.

### 3.3 Fonts (❌ → fix now, cheap)
Standard: **2–4 files, <100KB total, ≤3 weights per family**. We load ~30 weights across 7 families. Prune to what the specs actually use:
- Roboto: `400, 500` only (drop 300/700/900)
- Roboto Slab: `500, 600` only (700/800 are *banned* by HOMEPAGE-SPEC §3 anyway)
- Bricolage (app shell): `600, 700` · Mukta `400, 500, 600` · Noto Devanagari `400, 600` · Baloos already `500, 600`
- `adjustFontFallback` stays default (on) to kill swap-CLS.

### 3.4 Motion perf
- ✅ rescue-line is rAF-throttled + IO-gated + mobile-off; count-up IO-gated; both reduced-motion-safe. Keep it that way — no new scroll listeners outside these.

---

## 4. Security headers (❌ → build)

No headers configured anywhere today. Add via `src/middleware.ts` response headers (Workers-safe, one place). Baseline set:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), usb=(), payment=()
```
- **geolocation NOT disabled globally** — volunteer live-tracking uses it; scope: `geolocation=(self)`.
- **CSP:** start `Content-Security-Policy-Report-Only` and observe before enforcing — we legitimately load Clerk (js + workers), Supabase (wss), OSM tiles (img), Google Fonts CSS fallback (GU `<link>`), Nominatim/OSRM (connect). Enforcing blind WILL break auth/maps. Draft policy in the PR, promote to enforcing only after a clean week of reports.
- HSTS `preload` directive deferred until the real domain (preload list is hard to undo).

---

## 5. Trust & credibility

- ✅ Contact (email/phone/address) in footer on every page; multiple channels.
- ✅ Impact numbers with **provenance** (the ledger names its data source — stronger than any badge).
- ✅ Real, dated, captioned program photography; no stock. Dignity rule in HOMEPAGE-SPEC §6.
- 🟡 **Legal identity:** add registration line to footer when the foundation supplies it (trust/section-8/80G number). Chase with Adit. Until then "A social initiative of the Rajyash Group, serving Ahmedabad since 2016" stands.
- ❌ **Privacy policy page** — required the moment analytics or donations ship; also expected by donors. One static page (`/privacy`), plain language: what's collected (auth data via Clerk, no ad tracking), contact for removal. P1.
- Social profiles (FB/IG exist on the official site) → footer icons + `sameAs` in JSON-LD. P1.

## 6. Conversion UX (donation parked — Razorpay Phase 5)

- ✅ One primary CTA ("Become a volunteer") above the fold in masthead + hero; 48px touch target held (`py-3` + text ≈ 48px — verify in the a11y pass).
- ✅ Volunteer path is low-friction: Google OAuth + 4-field onboarding (name prefilled). Under the 5–7-field cap.
- When donations unpark: preset amounts with impact equivalents ("₹500 feeds 10 people"), guest checkout, email+amount+name only, Razorpay badge, recurring toggle. **Parked, not forgotten** — lives here.

## 7. Accessibility — WCAG 2.1 AA gate

Most-failed criteria checklist for THIS page:
- **1.4.3 / 1.4.11 contrast:** tokens AA-verified in HOMEPAGE-SPEC §2 — re-verify rendered output (esp. `--rj-ink-soft` on `--rj-paper-2`, caption-on-scrim, gold-ink on paper) with WebAIM checker; no rounding (4.47:1 fails).
- **2.4.7 focus visible:** gold `:focus-visible` ring shipped — audit every interactive element incl. Clerk widgets + language buttons.
- **2.1.1 keyboard:** tab through the whole page; program rows (links) reachable; no traps.
- **1.1.1 alt:** meaningful photos have descriptive alt ✅; thumbnails `alt=""` ✅; rescue-line `aria-hidden` ✅.
- **1.3.1 headings:** one h1 (hero) ✅; h2 per section, no skips — verify after i18n pass.
- **Zoom 200%** text reflow; **44–48px** touch targets on mobile.
- Tooling: axe DevTools + Lighthouse a11y ≥95 (catches ~40%), then manual keyboard + NVDA walkthrough. GU headline at display size (conjuncts ક્ષ જ્ઞ, matras) is part of this gate.

## 8. Analytics & privacy

- Recommendation: **Cloudflare Web Analytics** (free, cookieless, no consent banner needed, one script) — fits zero-budget; Plausible (paid) if the org later wants nicer reports. **No GA4, no pixels** — an NGO homepage with ad-tech trackers undermines the trust story.
- India has no GDPR-equivalent forcing a banner for cookieless analytics; DPDP Act 2023 baseline satisfied by the privacy page + no personal-data analytics.
- Add the CF beacon to the public layout only (not portal/admin).

## 9. Favicon/PWA baseline

- ✅ manifest (name/short_name/theme_color/background_color, 192+512+maskable icons), favicon.ico.
- ❌ add `public/apple-touch-icon.png` **180×180** (iOS ignores manifest icons).
- 🟡 optional: SVG favicon (`icon.svg`) for crisp dark/light tab icons. P2.
- theme_color currently `#2E7A47` (app green) — acceptable; revisit if brand consolidates on `#337048`.

---

## 10. Build order (P0 → P2) + acceptance

**P0 — ship next (one PR, ~a day):**
1. Metadata block: `metadataBase`, tuned title/description, canonical, OG + Twitter + `public/og.jpg` (1200×630).
2. `robots.ts` + `sitemap.ts`.
3. JSON-LD NGO schema.
4. Font-weight prune (§3.3).
5. Hero LCP attrs: `fetchPriority` + `width/height` + preload; `decoding="async"` sweep.
6. Security headers in middleware (CSP report-only).
7. `apple-touch-icon.png`.

**AC:** link pasted into WhatsApp/Slack/X shows image+title+description · Rich Results Test passes NGO entity · robots blocks `/admin`+`/api` and names the sitemap · font payload <120KB (measure in devtools) · Lighthouse: perf ≥80, SEO ≥95, a11y ≥95, best-practices ≥95 on `/` · securityheaders.com grade ≥ B (A after CSP enforce) · zero regressions on sign-in/maps/tracking with CSP report-only.

**P1 — same week:** privacy page `/privacy` + footer link · Cloudflare Web Analytics beacon (public pages only) · social links in footer + `sameAs` · registration number from Adit · full a11y manual pass (§7).

**P2 — opportunistic:** responsive image variants (thumbnails first) · WebP hero · SVG favicon · CSP enforce after a clean report week · locale-URL migration decision when real domain lands.

---

### Sources (key)
web.dev Core Web Vitals thresholds · Google Search Central (multi-regional/localized sites, robots, canonical) · schema.org NGO + Google Rich Results Test · Krumzi OG-image guide 2026 · MDN (HSTS, Permissions-Policy) · Cloudflare CSP docs · WebAIM contrast · W3C WCAG 2.1/2.2 · Vercel next/font docs · Plausible data policy · Funraise/Better.Giving donation benchmarks · UMMA Foundation charity-verification checklist 2026.
