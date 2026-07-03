# Homepage Spec — Rajyash Food Rescue (public `/`)

**Status:** LOCKED build contract. Implement verbatim. No improvisation on tokens, type scale, copy, or section order.
**Audience:** the Opus dev who builds `src/features/public/components/LandingPage.tsx` and its children.
**Supersedes:** the current cloned `LandingPage.tsx` (the templated version) entirely.

This page is a *public marketing site that mirrors the official Rajyash Foundation brand* (green/gold/coral, "we rise by lifting others"). It is **not** the app portal. It runs on its own scoped token layer (`--rj-*`), deliberately separate from the internal saffron design system in `src/app/globals.css`. Do not use `--primary`, `--saffron`, `bg-primary`, `font-display` (Bricolage) anywhere on this page. The portal keeps its system; the homepage gets this one.

---

## 1. Design principles (the locked point of view)

1. **Editorial, not template.** A high-end magazine spread, not a charity-theme spreadsheet. Asymmetry over centered symmetry; rules and rhythm over boxed cards.
2. **Proof is the product.** Rajyash's unfakeable asset is that it *operates every night* and this page is wired into that operation. Lead with the live app; frame every number with provenance.
3. **Restraint is the craft.** Three deliberate moves — the typographic hero, the drawn gold rescue-line, the provenance ledger — executed with precision. Resist everything else. One coral element per viewport. One full-bleed green moment on the page.
4. **Dignity over spectacle.** Photograph the *work* (hands, tiffins, ladles, routes), never staged gratitude or need. Caption every photo as a documented event. No duotone/wash over people served.
5. **Typography is identity.** Roboto Slab at medium weight and large size carries the brand; the multi-script system (GU/HI) is first-class, not a fallback.

---

## 2. Tokens — scoped `--rj-*` layer

Define under a `.rj-home` class on the page root (`<main class="rj-home">`), with a `.dark .rj-home` override. This keeps the homepage palette isolated from the app tokens. Put this in `src/app/globals.css` **below** the existing `@theme` block, or in a co-located `rj-home.css` imported by the landing route.

```css
.rj-home {
  /* Grounds */
  --rj-paper:        #FAF7F1;   /* warm paper — page ground */
  --rj-paper-2:      #F2ECDF;   /* recessed surface: ledger panel, footer */
  --rj-paper-3:      #EBE3D2;   /* hover fill on index rows */

  /* Ink — two tones only */
  --rj-ink:          #1E2A22;   /* primary text (12.8:1 on paper) */
  --rj-ink-soft:     #55605A;   /* secondary text (5.2:1 on paper) */

  /* Brand green */
  --rj-green:        #337048;   /* brand green — lines, small marks, links (4.9:1 on paper) */
  --rj-green-cta:    #2A5C3C;   /* CTA fill, white text (6.4:1) — SHIPPED */
  --rj-green-cta-hv: #234E33;   /* CTA hover */

  /* Gold — line & ink, never a fill */
  --rj-gold:         #F6C445;   /* decorative only: rescue-line stroke, leaf on dark, pulse ring */
  --rj-gold-ink:     #8A6D1A;   /* "gold ink" for text: H1 accent word, section numbers (4.6:1 on paper) */

  /* Coral — accent ONLY, one per viewport */
  --rj-coral:        #FC615D;   /* live pulse dot, single hero accent stroke */
  --rj-coral-ink:    #C93F3B;   /* coral text if ever needed (4.5:1 on paper, large only) */

  /* Structure */
  --rj-hairline:     rgba(30,42,34,.14);
  --rj-hairline-2:   rgba(30,42,34,.26);
  --rj-shadow:       0 14px 38px rgba(40,32,18,.10), 0 3px 8px rgba(40,32,18,.05);
}

.dark .rj-home {
  --rj-paper:        #10201A;   /* green-black */
  --rj-paper-2:      #16291F;
  --rj-paper-3:      #1D3327;
  --rj-ink:          #ECF2E9;   /* (13.5:1 on green-black) */
  --rj-ink-soft:     #A6B3AB;   /* (6.1:1) */
  --rj-green:        #5AA974;   /* brightened for legibility on dark (5.0:1) */
  --rj-green-cta:    #3E8B58;   /* white text (4.7:1) */
  --rj-green-cta-hv: #489A63;
  --rj-gold:         #F6C445;   /* reads great on dark */
  --rj-gold-ink:     #E7C15A;   /* H1 accent + numbers on dark (8.9:1) */
  --rj-coral:        #FF6F6A;
  --rj-coral-ink:    #FF8A85;
  --rj-hairline:     rgba(236,242,233,.13);
  --rj-hairline-2:   rgba(236,242,233,.24);
  --rj-shadow:       0 16px 40px rgba(0,0,0,.5);
}
```

**Hard rules:** Gold as a *fill* is banned (line/ink/glyph only). Coral appears at most once per viewport. Never white text on coral. CTAs are `--rj-green-cta`, never coral, never gold.

---

## 3. Type system

**Latin:** Roboto Slab (display) + Roboto (body). **Self-host both** (subset latin + latin-ext), served via `next/font/local`, weights below only. Do **not** load `next/font/google` at request time (CSP + Workers cold-start).

**Indic display (GU/HI):** Roboto Slab has no Indic glyphs. Use **Baloo Bhai 2** (Gujarati) and **Baloo 2** (Devanagari) — rounded, friendly, optically close to Roboto Slab's soft slab. **Indic body:** **Mukta** (covers Latin + GU + HI, neutral, pairs with Roboto). Self-host all three, subset per script. Fallback stack per locale below.

Per-locale font wiring (set on `<html lang>` / a locale class):

```css
/* EN */  --rj-display: "Roboto Slab", Georgia, serif;
          --rj-body:    "Roboto", system-ui, sans-serif;
/* GU */  --rj-display: "Baloo Bhai 2", "Noto Sans Gujarati", sans-serif;
          --rj-body:    "Mukta", "Noto Sans Gujarati", sans-serif;
/* HI */  --rj-display: "Baloo 2", "Noto Sans Devanagari", sans-serif;
          --rj-body:    "Mukta", "Noto Sans Devanagari", sans-serif;
```

**Scale** (all `rem`; use `clamp()` where noted; tracking in em; lh unitless):

| Role | Font | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|---|
| **H1 (hero)** | display | `clamp(2.5rem, 6vw, 4.25rem)` | 500 | −0.005em | 1.06 |
| **H2 (section)** | display | `clamp(1.75rem, 3vw, 2.5rem)` | 600 | −0.004em | 1.12 |
| **Program name (index row)** | display | `clamp(1.5rem, 2.4vw, 2rem)` | 500 | −0.003em | 1.1 |
| **Section-number marker** | display | `0.8125rem` (13px) | 500, italic | 0 | 1 |
| **Body** | body | `1.0625rem` (17px) | 400 | 0 | 1.65 |
| **Body-lead (hero sub, intros)** | body | `clamp(1.125rem, 1.4vw, 1.3125rem)` | 400 | 0 | 1.55 |
| **Caption (on photos)** | body | `0.75rem` (12px) | 500 | 0.02em | 1.3 |
| **Data numeral (ledger)** | display | `clamp(2.75rem, 5vw, 4rem)` | 500, tabular-nums | −0.01em | 1 |
| **Data label / provenance** | body | `0.875rem` (14px) | 500 / 400 | 0.01em | 1.4 |

**Indic optical match:** Baloo runs visually larger and heavier than Roboto Slab at the same px. For GU/HI, scale display down: `font-size: 0.92em` on `[lang="gu"] .rj-display, [lang="hi"] .rj-display`, and never use weight >500 for Baloo (its 600 is too heavy next to Roboto Slab 500). **Test the Gujarati H1 at full display size before shipping** — check conjunct rendering (જ્ઞ, ક્ષ) and matra positioning; adjust `line-height` up to 1.15 for GU/HI H1/H2 to clear ascenders/matras.

Never use Roboto Slab above 600. The friendly-slab warmth lives at 500; 700/800 is the templated tell — banned on this page.

---

## 4. Grid & spacing

- **Container:** `--rj-wide: 78rem` (1248px) max for full sections; `--rj-text: 40rem` (640px, ~62ch) max for prose. Gutters: `1.5rem` mobile, `2.5rem` ≥768px, `4rem` ≥1200px.
- **Grid:** 12-column, `column-gap: clamp(1rem, 2.5vw, 2rem)`. Use `grid-template-columns: repeat(12, 1fr)` on section inners; place blocks on explicit column spans.
- **Asymmetry rules (mandatory, not decorative):**
  - Alternate the "heavy" side section to section. Hero text cols 1–7, photo 8–12 bleeding right. Food Porter ledger cols 1–6, photo 7–12 bleeding right. Human story photo cols 1–6 bleeding *left*, text 7–11.
  - At least two images **bleed past the container edge** to the viewport edge (`margin-right: calc(-1 * max(1.5rem, (100vw - var(--rj-wide)) / 2))`), never both on the same side consecutively.
  - **No section is fully centered** except the finale CTA. Eyebrow/number markers are left-aligned to their text column.
- **Section rhythm:** vertical padding `clamp(4.5rem, 9vw, 8rem)` top and bottom. One continuous `--rj-paper` ground throughout — **no alternating background stripes**. Sections are separated by the leaf hairline divider (§8), not by color blocks. The **only** background-color breaks on the whole page: the ledger panel (`--rj-paper-2`), the finale CTA (full-bleed `--rj-green`), and the footer (`--rj-paper-2`).
- **Baseline spacing unit:** 8px. Component internal rhythm steps: 8 / 12 / 16 / 24 / 40 / 64.

---

## 5. Section-by-section

Final order. Build in this sequence. Copy is **real and final** — write these exact strings into `landing.json` (keys noted; reuse existing keys from §current file where they already say the right thing).

### 5.0 — DROP these (do not build)
- Hero photo *slider* / slide dots. Static single hero only.
- The separate green "365,000+ / 70 / 6 / 2016" stats band (merged into the proof strip).
- The duplicate second stats moment (the old `ImpactCounter` styling is replaced by the ledger).
- Testimonials carousel. Replaced by one human story.
- "Recent Causes", "Strategic Priorities", "Latest News", Activities photo-carousel, parallax fixed band, black top contact bar. None of these ship.
- Icon-chip-on-photo program cards. Replaced by editorial index rows.
- `RevealOnScroll` stagger on every element (keep only the single section-entry rise, §7).

---

### 5.1 — Header / nav
- **Purpose:** brand + wayfinding + the one primary action. Feels like a masthead, not a nav bar.
- **Layout:** full-width, `--rj-wide` inner, `72px` tall. Left: leaf mark + wordmark "Rajyash Foundation" (display 500, 18px) with "Food Rescue" as a `--rj-ink-soft` 13px kicker beneath or beside (`·` separated). Center-right: text nav. Far right: language switcher (EN/ગુ/हि), theme toggle, and the primary CTA. Auth-aware: signed-in shows "Dashboard" link + UserButton in place of the CTA.
- **Nav items:** `How it works · Programs · Impact · About · Contact` (reuse `nav.*`; add `nav.programs`). Links are `--rj-ink`, hover → gold underline (§8). No pill backgrounds, no dropdown.
- **Behavior:** transparent over hero on load (`--rj-ink` still legible because hero text sits left on paper, not on the photo — see 5.2); on scroll past 80px, gains `--rj-paper` background + bottom `--rj-hairline` + `--rj-shadow`, via a scroll listener toggling a class (rAF-throttled, no lib). Sticky.
- **CTA:** "Become a volunteer" → `--rj-green-cta` fill, white, 6px radius (§8 button).
- **Image:** none.
- **Motion:** background fade-in on scroll threshold only (150ms). The rescue-line (§7) originates just below this, under the H1.

### 5.2 — Hero (60/40 typographic split)
- **Purpose:** deliver the verdict in 3 seconds — "this org operates, with warmth." No slider, no dark full-bleed overlay.
- **Layout:** 12-col. **Left, cols 1–7, on paper** (not on the photo): eyebrow → H1 → lead → actions. **Right, cols 8–12: full-height photo column**, bleeding to top and right viewport edges, min-height `clamp(420px, 60vh, 680px)`. On mobile: photo stacks *below* the text block, 16:11, full-bleed.
- **Copy (exact):**
  - Eyebrow (dual-script §8, `heroEyebrow`): **"સેવા · We rise by lifting others"**
  - H1 (`heroTitle`): **"We rise by lifting others."** — set "lifting" in `--rj-gold-ink`. (This tagline is the headline; retire "Join us in creating a better tomorrow.")
  - Lead (`heroSub`): **"Since 2016, the Rajyash Foundation has turned Ahmedabad's surplus into dignity. Every evening, volunteers still carry warm meals across the city — and this page counts them as they go."**
  - Primary CTA: **"Become a volunteer"** (`becomeVol`) → green-cta fill.
  - Secondary, as a text link with gold underline, not a second button: **"or donate surplus food →"** (`donateFood`).
- **Image:** the **night street-food distribution from tiffins** photo (most distinctive asset), graded per §6, captioned bottom-left *on the image*: **"Evening distribution, Ahmedabad · 2026"** (`photoHeroCaption`). 1px `--rj-hairline-2` inset frame, 8px radius, does not use rounded-2xl.
- **Motion:** section-entry rise on the text block (§7). Rescue-line starts here (§7). No parallax.

### 5.3 — Proof strip
- **Purpose:** institutional credibility in one editorial line — replaces the green stats band.
- **Layout:** full `--rj-wide`, a single horizontal row, hairline rule above and below. One slab sentence with gold `·` separators; wraps to 2 lines on mobile. Left-aligned, not centered.
- **Copy (`proofStrip`):** **"365,000 people helped · 70 volunteers · 6 programmes · serving Ahmedabad since 2016"** — set each *number* in display 500 `--rj-ink`, the words in `--rj-ink-soft`, separators in `--rj-gold-ink`.
- **Image:** none.
- **Motion:** none (the rescue-line passes through vertically between this and Programs). Numbers do **not** count up here — counting is reserved for the live ledger, where it's earned.

### 5.4 — Programs (editorial index rows)
- **Purpose:** present the six real programs as a magazine index, not a card grid. Food Porter is visually the loudest (it's the app).
- **Layout:** eyebrow/number marker + H2 left-aligned at text column; then a full-width list of **6 rows**, each a 12-col grid: `[number 1col][name + one-line desc 7col][thumbnail 3col, right]`, separated by `--rj-hairline` rules. Row min-height ~120px. Hover: row fills `--rj-paper-3`, thumbnail scales 1.04 (250ms), name gains gold underline.
- **Section head copy:** marker **"01 — What we do"**; H2 (`programsTitle`): **"Six ways we lift our city."**
- **Rows (exact `title` / one-line `desc`; keep the real program names):**
  1. **Plantation** — "Tree drives that give Ahmedabad cleaner air and shade."
  2. **Education** — "Books, supplies and support for children who deserve to rise."
  3. **Animals & Birds Rescue** — "Rescue, feeding and care for the creatures who share our streets."
  4. **Food Porter** — "Surplus food, rescued warm and carried to people in need — every evening." *(loud row: gold left-rule, small `--rj-gold-ink` tag "The live programme", links to sign-up; this is the only row that is a link.)*
  5. **Anand Mela** — "Community fairs that raise support and bring the city together."
  6. **Other Activities** — "Blood-donation drives, disaster relief, and everyday kindness all year."
- **Image:** one small graded thumbnail per row (existing `prog*.jpg` / `food-porter*.jpg`), 4:3, 8px radius, hairline frame. Thumbnails are decorative → `alt=""` (names carry meaning).
- **Motion:** section-entry rise on the block; per-row hover only. No per-row scroll stagger.

### 5.5 — Food Porter live feature (the app moment)
- **Purpose:** the biggest section on the page — the differentiator no charity template can claim. Narrative + entry into the live app.
- **Layout:** 12-col, asymmetric. **Left cols 1–6:** marker "02 — Food Porter", H2, a short lead, one CTA into the app. **Right cols 7–12:** the largest photo on the page, bleeding right, graded, captioned.
- **Copy:**
  - Marker: **"02 — Food Porter"**
  - H2 (`fpTitle`): **"The rescue loop runs on software now."**
  - Lead (`fpBody`): **"A donor posts surplus food. A volunteer nearby claims it, picks it up while it's still warm, and delivers it to people in need — often within the hour. Every step is logged, so nothing is lost and nobody is guessing."** (Optional: render the three verbs — posts / claims / delivers — as an inline three-beat with the leaf glyph between, not as three cards.)
  - CTA: **"See how it works →"** → `#how` or the live board; secondary text-link "Start volunteering".
- **Image:** volunteer ladling dal / handing off a tiffin. Grade §6. Caption: **"A Food Porter run, Satellite · 2026"** (`photoFpCaption`).
- **Motion:** rescue-line runs down the left edge of this section and terminates at the ledger below (§7).

### 5.6 — Provenance ledger (live impact)
- **Purpose:** the data centerpiece — verifiable numbers with methodology. Credibility through provenance, not spectacle. This replaces the old `ImpactCounter` visual.
- **Layout:** an inset panel `--rj-paper-2`, `--rj-hairline` border, radius 20px, `--rj-shadow`, at `--rj-text`-plus width (max ~52rem), offset left (not centered) under 5.5. Inside: a small header row (eyebrow + live chip), then **three ledger rows** stacked, each separated by a hairline: `[big data numeral][label + note]`, tabular-nums, left-aligned like an accounting statement. Below the rows, a **provenance line**.
- **Copy:**
  - Eyebrow (`impactEyebrow`): **"Live impact"**; live chip (`impactLive`): **"Live · updated tonight"** with the coral pulse dot (this is the page's one coral element in this viewport).
  - Row 1 — numeral = `servings`; label **"Meals served"** (`statMeals`); note **"warm meals to people in need"**.
  - Row 2 — numeral = `kg`; label **"Kilograms rescued"** (`statKg`); note **"of good food kept from waste"**.
  - Row 3 — numeral = `count`; label **"Deliveries completed"** (`statDeliveries`); note **"pickups logged by volunteers"**.
  - **Provenance line (`impactProvenance`, the load-bearing sentence):** **"Counted directly from deliveries logged in the Food Porter app — not estimates. Updated as each rescue is marked delivered."** Set in `--rj-ink-soft` 14px with a leaf glyph lead.
- **Data source:** `getCachedImpactReport()` (already wired). Keep `useCountUp` for a single count-up on scroll-in (reduced-motion → renders final value immediately). Format `en-IN` / locale-aware.
- **Image:** none — numbers are the subject.
- **Motion:** rescue-line **terminates** at the coral pulse dot here (the drawn route arrives at the live count). Count-up fires once on entry.

### 5.7 — One human story
- **Purpose:** a single real face, told with dignity — replaces testimonials.
- **Layout:** 12-col. Photo cols 1–6 bleeding **left**; text cols 7–11. Text: one short story (2 sentences) + a pull-quote in display 500, + attribution with first name + role.
- **Copy (`story*` — replace with a real volunteer's words when available; ship this as the honest placeholder, clearly a real quote in voice):**
  - Pull-quote: **"I drive for an hour after work. By the time I'm home, forty people have eaten."**
  - Attribution: **"— Riya, Food Porter volunteer since 2023"**
  - Supporting line: **"Most of our volunteers give a couple of evenings a month. That's all it takes to keep the loop turning."**
- **Image:** a candid volunteer portrait (white-shirt group photo cropped to one person, or a genuine single portrait). Grade §6. Caption: name + neighbourhood + year. **Dignity rule (§6) applies hardest here.**
- **Motion:** section-entry rise only.

### 5.8 — Finale CTA
- **Purpose:** the single conversion moment. The page's **only** full-bleed green section and **only** centered section.
- **Layout:** full-bleed `--rj-green` band, centered text, generous padding (`clamp(5rem, 10vw, 9rem)`). H2 + one line + two actions.
- **Copy:**
  - H2 (`finalTitle`): **"Good food, in the right hands."**
  - Sub (`finalSub`): **"Whether you have food to give or a few hours to drive, there's a place for you in the loop."**
  - Primary: **"Become a volunteer"** → white fill, `--rj-green` text (inverse on the green band). Secondary: **"Donate surplus food"** → white 2px outline, white text, hover fills white.
- **Image:** none (or a very low-contrast graded group photo behind the green at 8% — optional, skip if it costs legibility).
- **Motion:** section-entry rise. The rescue-line does **not** extend here — it ended at the ledger; this is the resolution.

### 5.9 — Footer
- **Purpose:** legitimacy + contact + wayfinding (absorbs the dropped black contact bar).
- **Layout:** `--rj-paper-2`, 3–4 columns: brand + tagline + leaf; Explore (nav links); Contact (email, phone, address); a small "Made with care in Ahmedabad" line + registration note.
- **Copy (reuse existing):** `footTagline`, `footExplore`, `footContact`, `footAddr` = "Satellite, Ahmedabad 380015", phone **+91-9875041206**, email **rajyashfoundation@rajyashgroup.com**, `footRights` = "© 2026 Rajyash Foundation. An initiative of the Rajyash Group.", `footMade`.
- **Motion:** none.

---

## 6. Imagery grade (exact, repeatable)

All homepage photos pass through **one consistent grade** so six phones read as one photographer. Apply either as a preprocessing step (preferred — bake into the asset, smaller payload) or as a reusable CSS filter class `.rj-graded`. Exact values:

```css
.rj-graded {
  filter: saturate(0.88) contrast(0.96) brightness(1.03);
  /* warm lift + lifted blacks via an overlay, not filter: */
}
.rj-graded::after {                 /* warm wash + black-lift */
  content:""; position:absolute; inset:0; pointer-events:none;
  background:
    linear-gradient(rgba(246,196,69,.05), rgba(246,196,69,.05)),   /* +warmth */
    linear-gradient(rgba(30,42,34,.06),  rgba(30,42,34,.06));       /* lift blacks toward ink, not pure black */
  mix-blend-mode: normal;
}
```

Targets, stated plainly so a preprocess pipeline can match: **saturation −12%, contrast −4%, brightness +3%, warmth +5 (toward gold), black point lifted so nothing sits below ~#1A1A1A.** No blur, no vignette, no duotone.

**Framing:** thin `1px --rj-hairline-2` inset frame, radius **8px max** (never rounded-2xl). Two hero/feature images bleed to the viewport edge (§4). Program thumbnails 4:3; feature/hero photos free aspect but min-heights per section.

**Caption format (every non-decorative photo):** `{What}, {Where} · {Year}` in caption type (§3), placed bottom-left on the image over a 40%→0 `--rj-ink` scrim gradient behind the text only (not a full wash). Captions are real and specific — they confer documentation and dignity.

**Dignity rule (non-negotiable):** photograph the *work*, not the need — hands, tiffins, ladles, routes, volunteers mid-task. No close-ups that make a served person the spectacle; no sad-eyes framing; no grade that aestheticizes hardship. If a photo's subject is a beneficiary's face, it needs consent context and a caption that names an event, not a condition. When in doubt, choose the volunteer-side frame.

---

## 7. Signature motion — the gold rescue-line

**One memorable interaction. This is the page's motion budget; spend almost nothing elsewhere.**

- **What:** a single **1.5px gold (`--rj-gold`) SVG path** that visually reads as a *route* — echoing the app's live pickup→delivery tracking. It starts just below the hero H1 (5.2), travels down the page (past the proof strip, alongside the programs index, down the left edge of the Food Porter feature) and **terminates at the coral live-pulse dot on the provenance ledger** (5.6). The drawn line = surplus becoming a delivered meal.
- **Geometry:** an absolutely-positioned `<svg>` overlay (`position:absolute; pointer-events:none; z-index:0; inset:0`) sized to the hero→ledger span, `preserveAspectRatio="none"` or a viewBox matched to that region. The path is a gentle vertical S-curve with 2–3 soft bends (not straight, not busy). `fill:none; stroke:var(--rj-gold); stroke-width:1.5; stroke-linecap:round`.
- **Scroll-draw mechanism:** on mount, `const len = path.getTotalLength()`; set `path.style.strokeDasharray = len; path.style.strokeDashoffset = len` (fully hidden). On scroll, map the page's scroll progress across the hero→ledger band to `[0,1]` and set `strokeDashoffset = len * (1 - progress)`. Throttle with `requestAnimationFrame` (one rAF per scroll frame, no library). Use a single `IntersectionObserver` to attach/detach the scroll listener only while the band is in view (perf).
- **Terminus:** when `progress ≥ 0.98`, add a class that triggers the coral pulse dot's `rj-live` animation (already in `motion.css`) — the route "arrives."
- **Reduced-motion (mandatory):** `@media (prefers-reduced-motion: reduce)` → render the path **fully drawn and static** (`stroke-dashoffset:0`), no scroll listener attached at all. The coral dot shows a static ring, no pulse.
- **A11y:** the SVG is purely decorative → `aria-hidden="true"`, `role="presentation"`. **Motion is never the sole conveyor of information** — the rescue loop is fully readable from the copy (5.5) and the ledger (5.6) with the line absent. The line adds delight, never meaning.
- **Perf/CSP budget:** vanilla JS in a small `"use client"` component (`RescueLine.tsx`), no Framer needed. Inline SVG, no external asset, CSP-safe. Skip entirely below 768px (the S-curve doesn't read on narrow columns) — mobile gets no line, which is fine because it carries no info.

---

## 8. Micro-details (the handcraft layer)

- **Leaf divider glyph:** redraw the logo's gold leaf as a ~12px inline SVG. Use it three ways: (a) section dividers — `hairline —— leaf —— hairline`, centered on the rule; (b) the lead bullet on the provenance line and the Food Porter three-beat; (c) footer brand mark. One proprietary mark, repeated, beats any icon set. It is the **only** recurring glyph on the page — do **not** reintroduce lucide icon chips.
- **Link / hover language:** links use a gold underline that grows in — `text-decoration: underline; text-decoration-color: var(--rj-gold-ink); text-decoration-thickness: 2px; text-underline-offset: 4px;` animated from `transparent`→gold on hover (200ms). Program-row hover per 5.4. **Ban `hover:-translate-y-1 hover:shadow-xl` everywhere** (the card-lift tell).
- **Button shape:** 6px radius (near-square), **not** pills. Primary = `--rj-green-cta` fill + white; hover → `--rj-green-cta-hv`. Secondary = text link with gold underline (not a second filled button), except the finale where the inverse-outline variant is allowed. Padding `0.75rem 1.5rem`, body weight 500.
- **Focus states:** `:focus-visible { outline: 3px solid var(--rj-gold-ink); outline-offset: 2px; }` on paper; on the green finale band, `outline-color: #FFFFFF`. Never remove outlines.
- **Dual-script eyebrow:** eyebrows lead with the Gujarati word then the English, `·`-separated — e.g. **"સેવા · We rise by lifting others"**, **"કાર્ય · What we do"**. Honest to the city; nothing templated ever does this. Gate on locale: in GU/HI locales, show the localized script word; in EN keep the GU word as a small cultural signature (it's the org's own language). Provide `heroEyebrow`, `programsEyebrow` keys per locale.
- **Numerals:** all data numerals `font-variant-numeric: tabular-nums` so counting doesn't reflow.

---

## 9. Accessibility & i18n checklist (this page)

- **Contrast:** every pairing in §2 is AA-verified; do not deviate. Re-check any new color against 4.5:1 (text) / 3:1 (large ≥24px/700 or UI). Coral is never text on paper below `--rj-coral-ink` at large size.
- **Landmarks:** one `<main id="main-content">`, skip-link (`skip` key) first focusable, `<header>`/`<nav>`/`<footer>` landmarks, one `<h1>` (hero), sequential `<h2>` per section, no skipped levels.
- **Images:** meaningful photos get descriptive `alt` (reuse `photo*` keys); decorative thumbnails `alt=""`; the SVG line `aria-hidden`.
- **Motion:** `prefers-reduced-motion` honored by the rescue-line (static, no listener), count-up (final value immediately), and section-entry rise (opacity-only or none). No motion conveys info.
- **Keyboard:** all links/buttons reachable, visible focus ring (§8), logical order top→bottom. Language switcher and theme toggle are real buttons with `aria-label`.
- **i18n:** all copy from `landing.json` via next-intl — **no hardcoded strings in JSX** (the current templated version hardcodes English; this is a regression to fix). Add the new keys: `nav.programs`, `heroEyebrow`, `programsEyebrow`, `programsTitle`, `proofStrip`, program `desc` keys, `fpTitle`, `fpBody`, `photoHeroCaption`, `photoFpCaption`, `impactProvenance`, `story*`. Provide GU + HI translations for every key. Numbers formatted with the locale (`en-IN` / `gu-IN` / `hi-IN`).
- **Script rendering:** verify GU/HI H1/H2 at display size (conjuncts, matras) per §3; bump line-height for Indic if matras clip.
- **RTL:** not required (GU/HI are LTR).

---

## 10. Build order & acceptance criteria

Build in this sequence; each step is independently reviewable.

1. **Token layer + type wiring.** Add `.rj-home` / `.dark .rj-home` blocks (§2); self-host Roboto Slab, Roboto, Baloo Bhai 2, Baloo 2, Mukta via `next/font/local`; wire per-locale `--rj-display`/`--rj-body`. **AC:** page ground is warm paper (light) / green-black (dark), toggling theme flips both; GU/HI headings render in Baloo, not a system fallback; no `--primary`/`font-display` leakage from the app system.
2. **Header (5.1)** with scroll-state + auth-aware CTA. **AC:** transparent→paper on scroll; single green CTA; gold-underline hovers; keyboard-navigable; no dropdown/pills.
3. **Hero (5.2)** — 60/40 split, H1 = tagline with gold-ink "lifting", graded night photo bleeding right with caption. **AC:** text sits on paper (not on the photo); on mobile photo stacks below; passes the AI-tell test below.
4. **Proof strip (5.3)** + **Programs index (5.4).** **AC:** programs are hairline-separated rows, not cards; no icon chips; Food Porter row is visibly loudest and is the only link; hover fills row + gold underline, no card-lift.
5. **Food Porter feature (5.5)** + **Provenance ledger (5.6)** with real `getCachedImpactReport()` data, single count-up, and the provenance sentence. **AC:** ledger reads like an accounting statement (tabular numerals, hairline rows), the provenance line is present and prominent, the live chip is the viewport's only coral, count-up respects reduced-motion.
6. **Rescue-line (5.7 motion, §7).** **AC:** gold line draws on scroll from hero to the ledger's coral dot; reduced-motion renders it static/fully-drawn with no scroll listener; `aria-hidden`; absent below 768px; the page's meaning survives with the line removed.
7. **Human story (5.8) + Finale CTA (5.9) + Footer (5.10).** **AC:** one story not a carousel; finale is the only full-bleed green + only centered section; footer carries contact + registration (absorbs the dropped contact bar).
8. **i18n + a11y pass (§9).** **AC:** zero hardcoded strings; GU + HI complete; axe/Lighthouse a11y ≥ 95; every §2 contrast pair verified; GU H1 visually checked at display size.

**The "human-made, not AI" acceptance test** (apply to the whole page before sign-off — must pass all):
- [ ] **No centered eyebrow→H2→sub→card-grid** repeated anywhere (finale is the sole centered section).
- [ ] **No `rounded-2xl` card with an icon chip**, and **no icon on top of any photo**.
- [ ] **At most one coral element per viewport**; gold never used as a fill; CTAs are green, never coral.
- [ ] **No uniform fade-in-up stagger** on every element — motion is the one rescue-line + a single quiet section-entry rise.
- [ ] **Every photo is graded identically and captioned** as a dated event; none aestheticize need.
- [ ] **At least two images bleed past the container edge**; sections alternate their heavy side.
- [ ] **Roboto Slab never appears above weight 600.**
- [ ] **The live ledger names its source** (the provenance sentence is present).
- [ ] Removing the rescue-line SVG loses zero information.
- [ ] A reviewer reading only the copy can tell this is *Rajyash, Ahmedabad, food rescue, since 2016/2023* — not a generic charity.

---

*End of spec. Any deviation from tokens (§2), type scale (§3), copy (§5), or the anti-AI acceptance test (§10) is a defect, not a judgment call.*
