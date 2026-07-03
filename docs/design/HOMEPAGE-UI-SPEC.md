# Homepage UI Spec — component contract

**Scope:** public homepage (`/`) components. Third layer of the homepage docs:
[HOMEPAGE-SPEC.md](HOMEPAGE-SPEC.md) = design direction (tokens, type, copy, section order) ·
[HOMEPAGE-STANDARDS.md](HOMEPAGE-STANDARDS.md) = compliance baselines · **this** = the
component-by-component UI contract: anatomy, dimensions, states, responsive behavior,
dark-mode deltas, and a QA checklist. All colors reference the `--rj-*` tokens (SPEC §2);
never restate hex here — tokens are the single source.

Status: components exist in code (`src/features/public/components/*`). This doc pins their
*contract* so refactors and the i18n pass don't drift them.

---

## 1. Breakpoints & container

| Name | Range | Container behavior |
|---|---|---|
| `sm` (mobile) | <640px | gutter 1.5rem; single column; photo blocks full-bleed |
| `md` | 640–1023px | gutter 2.5rem; nav collapses to Sheet ≤767px; rescue-line hidden <768px |
| `lg` (desktop) | ≥1024px | 12-col grid active; asymmetric spans engage |
| wide clamp | ≥1248px+gutters | content clamps at `--rj-wide` 78rem; bleeds extend to viewport edge |

- Grid: `repeat(12, 1fr)`, `column-gap: clamp(1rem, 2.5vw, 2rem)`.
- Section vertical rhythm: `clamp(4.5rem, 9vw, 8rem)`; internal steps 8/12/16/24/40/64px.
- Bleed formula (right): `margin-right: -max(gutter, (100vw − 78rem)/2)`; mirrored for left bleeds. Never two consecutive same-side bleeds.

## 2. Elevation & z-index scale

| Layer | z | Used by |
|---|---|---|
| rescue-line SVG | 0 | decorative underlay inside the hero→ledger band |
| section content | 10 | anything the line must pass behind |
| masthead | 40 | sticky header |
| skip-link (focused) | 50 | jumps above everything |

Shadow: only `--rj-shadow` (ledger panel, scrolled masthead). No other shadows on the page — card-shadow spread is a template tell.

---

## 3. Components

### 3.1 Masthead (`PublicHeader` + `HeaderScroll`)
**Anatomy:** 72px bar → logo (h-40px img) · nav links ·  right cluster (LanguageSwitcher, ThemeToggle, Sign in link, CTA button / Dashboard+UserButton when authed) · mobile: Sheet trigger.
**States:**
| State | Trigger | Visual |
|---|---|---|
| top | scrollY ≤80 | `background: transparent`, no border/shadow |
| scrolled | scrollY >80 | `--rj-paper` bg, 1px `--rj-hairline` bottom, `--rj-shadow`; 200ms transition |
- Nav link: `rj-underline` (see 3.4). CTA: primary button (3.3).
- Mobile (<768px): nav+locale+theme+auth collapse into the Sheet; logo + trigger only.
- A11y: skip-link is first focusable; `nav[aria-label]`; toggle buttons have `aria-label`.
**Don't:** add a second CTA, pills, dropdowns, or a border in the top state.

### 3.2 Hero split
**Anatomy (lg):** text block cols 1–7 (eyebrow → H1 → lead → actions row); photo figure cols 8–12, bleeds top+right, `min-height: clamp(420px, 60vh, 680px)`.
**Responsive:** <1024px photo stacks *below* text, aspect ~16:11, full-bleed horizontally; text keeps left alignment (never centers).
**Type:** H1 per SPEC §3 (clamp 2.5–4.25rem, w500); accent word in `--rj-gold-ink`; eyebrow dual-script 14px semibold.
**Actions row:** exactly one primary button + one `rj-underline` text link, 20px gap, wraps on narrow.
**Image:** `.rj-graded`, 8px radius, 1px `--rj-hairline-2` frame, caption overlay (3.6). LCP element → `loading="eager"`, `fetchPriority="high"`, explicit `width/height` (STANDARDS §3.1).

### 3.3 Buttons
| Variant | Fill | Text | Hover | Where |
|---|---|---|---|---|
| Primary | `--rj-green-cta` | #fff | `--rj-green-cta-hv` | masthead, hero, FP feature |
| Inverse (green band only) | #fff | `--rj-green` | white/90 | finale |
| Outline-inverse | transparent, 2px white/80 border | #fff | white/10 fill | finale secondary |
- Shape: **6px radius** (never pills). Padding `0.75rem 1.5rem`; body face w500; masthead size `0.875rem`/`1rem 0.5rem`.
- Active: darken hover color 4%; no translate/scale.
- Focus: 3px `--rj-gold-ink` outline, offset 2px (white outline on the green band).
- Min touch target 48×48px effective (padding counts).
- **Ban:** coral fills, gold fills, `hover:-translate-y-*`, shadow-on-hover.

### 3.4 Text link (`.rj-underline`)
Underline 2px, offset 4px, `text-decoration-color: transparent → --rj-gold-ink` on hover/focus, 200ms. Color inherits `--rj-ink` (or `--rj-ink-soft` in footer). Focus ring same as buttons. This is the ONLY link hover on the page.

### 3.5 Proof strip
One slab sentence in a hairline-topped/bottomed band: numbers display-w500 `--rj-ink` at `clamp(1rem,1.6vw,1.375rem)`, labels body `--rj-ink-soft` 0.95rem, separators `·` in `--rj-gold-ink` with `aria-hidden`. Left-aligned; wraps to ≤2 lines on mobile (flex-wrap, row-gap 4px). **No count-up here.** Numerals `tabular-nums`.

### 3.6 Photo frame + caption
Every non-decorative photo: wrapper `relative overflow-hidden rounded-lg` (8px), 1px `--rj-hairline-2` border, `<img class="rj-graded">`.
Caption: absolute bottom, full-width, 12px w500 white, `tracking .02em`, over a text-height scrim `linear-gradient(to top, rgba(30,42,34,.55), transparent)`; format `{What}, {Where} · {Year}`. Thumbnails (program rows) skip captions and use `alt=""`.
Dark mode: unchanged (photos + scrim are self-contained).

### 3.7 Program index row
**Anatomy (12-col inner grid):** number col-span-1 (display 1rem `--rj-ink-soft`) · name+desc span-8 (name clamp 1.5–2rem w500; desc 14px `--rj-ink-soft`) · thumbnail span-3 right (4:3, max-w 9rem).
Row: `min-height ~120px`, py-24px, 1px `--rj-hairline` bottom; 3px left rule — transparent normally, `--rj-gold` on the live row (+ 11px uppercase `--rj-gold-ink` tag).
**States (linked row only — Food Porter):**
| State | Visual |
|---|---|
| hover/focus-within | row bg `--rj-paper-3`; thumb `scale(1.04)` 250ms; name gains gold underline |
| focus-visible | standard gold ring on the `<a>` |
Non-linked rows: no hover state (they're not interactive — don't fake affordance).
**Mobile:** thumbnail drops below text (grid wraps), number stays inline with name.

### 3.8 Provenance ledger (`LedgerImpact`)
**Anatomy:** inset panel `--rj-paper-2`, 20px radius, 1px `--rj-hairline`, `--rj-shadow`, max-w 52rem, offset left (not centered), padding 28–36px.
Header row: eyebrow caps 12px `--rj-ink-soft` + live chip (coral 8px pulse dot `rj-dot-live` + "Live · updated tonight" 12px).
Rows ×3: numeral display `clamp(2.75rem,5vw,4rem)` w500 `tabular-nums` left · label 14px w600 + note 14px `--rj-ink-soft` right-aligned; 1px hairline between rows, 16px row padding.
Provenance line: 14px `--rj-ink-soft`, leaf glyph lead, always last.
**Behavior:** single count-up on first scroll-in (`useCountUp`, en-IN grouping); reduced-motion → final values render immediately; **fallback:** if IO never fires, values must still be present in SSR HTML (numbers are server-rendered props — never render literal `0` as final state; count-up may start from 0 but the no-JS/reduced path shows real totals). The coral dot is the page's only coral in this viewport and doubles as the rescue-line terminus (`data-rescue-terminus`).

### 3.9 Rescue-line (`RescueLine`)
1.5px `--rj-gold` S-curve, `vector-effect: non-scaling-stroke`; absolute overlay z-0 spanning hero→ledger; `aria-hidden role="presentation" pointer-events-none`.
Draw mapping: progress 0 at band-top = 70vh, 1 at band-bottom = 40vh; rAF-throttled; IO attaches/detaches listener. `data-arrived="true"` at ≥0.98 (may trigger the pulse).
Visibility: hidden <768px; reduced-motion → fully drawn static, no listener. Removing it entirely must lose zero meaning.

### 3.10 Human story
Photo cols 1–6 bleeding LEFT (mirror of hero) · text cols 7–11. Pull-quote display clamp 1.5–2rem w500 `--rj-ink`; attribution 16px w500 `--rj-gold-ink` with em-dash; support line body `--rj-ink-soft`. One story only; no carousel, no avatar circles, no star ratings.

### 3.11 Finale CTA
Full-bleed `--rj-green`; the ONLY centered section. H2 white w600; sub white/85; two buttons (inverse + outline-inverse, 3.3), 16px gap; leaf mark 20px white-context below, 40px top margin. Focus rings white here.

### 3.12 Footer
`--rj-paper-2`, 1px `--rj-hairline` top; 4-col grid (brand+leaf / Explore / Contact / legitimacy), collapses 2-col ≤1024px, 1-col ≤640px. Links `rj-underline` in `--rj-ink-soft`; column headings 12px caps w600 `--rj-ink`. Bottom bar: hairline top, copyright 12px + `footMade` + LanguageSwitcher.

### 3.13 Leaf mark (`LeafMark`)
12–20px inline SVG, gold fill on paper, white-context on green. Exactly three uses: section divider (hairline—leaf—hairline), provenance/list lead bullet, footer/finale brand mark. Never as button icon, never beside lucide icons, never >24px.

---

## 4. Dark-mode delta table

Everything flows from token swap (`.dark .rj-home`); component-level deltas to verify:
| Component | Delta to check |
|---|---|
| Masthead scrolled | paper bg is `#10201A`; hairline visible on dark |
| Photos | grade unchanged; frame `--rj-hairline-2` still separates from dark ground |
| Ledger | `--rj-paper-2` dark panel keeps ≥ contrast for numerals (13.5:1) |
| Buttons | primary switches to `--rj-green-cta` dark value (4.7:1 w/ white) |
| Gold ink | `#E7C15A` on dark — H1 accent + markers re-verified |
| Finale | unchanged (green band identical both themes) |
| Focus ring | `--rj-gold-ink` visible on both grounds |

## 5. Content & formatting rules

- Numerals: `tabular-nums` wherever digits align; locale grouping (`en-IN` → 3,65,000 style is WRONG for the English "365,000" proof strip — proof strip is typographic copy, ledger uses `toLocaleString(locale)`).
- Captions: `{What}, {Where} · {Year}` — no filenames, no lorem.
- Truncation: program desc is one line of copy by design, not CSS-truncated; nothing on the page uses `line-clamp`.
- Dual-script eyebrows: GU word first, `·`, then English (SPEC §8); in GU/HI locales the localized word leads.
- All strings via `landing.json` after the i18n pass — zero hardcoded JSX copy (STANDARDS regression note).

## 6. Per-component QA checklist

For EACH component before sign-off:
- [ ] Light + dark rendered (toggle, not just OS pref).
- [ ] 360px, 768px, 1024px, 1440px widths — no horizontal scroll, bleeds intact.
- [ ] Keyboard: reachable, gold focus ring visible, order logical.
- [ ] Hover states only on genuinely interactive elements.
- [ ] Reduced-motion: no movement (rise/count-up/line all static).
- [ ] GU + HI locale render (Baloo loads, 0.92em optical match, matras unclipped).
- [ ] No banned patterns: pills, coral/gold fills, icon chips, card-lift hover, `rounded-2xl`, centered section (except finale), second coral per viewport.

*Deviation from this contract is a defect unless HOMEPAGE-SPEC.md is amended first.*
