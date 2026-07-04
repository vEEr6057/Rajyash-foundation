# UI-SPEC — Rajyash Food-Rescue Design System

> **⚠️ PARTIALLY SUPERSEDED (2026-07-04):** the color + typography sections below are historical —
> the app is now **green+gold with Roboto Slab display** (Bricolage retired, saffron demoted).
> Canonical for anything visual: [APP-UI-CHARTER.md](APP-UI-CHARTER.md) (+ HOMEPAGE-SPEC.md for `/`).
> Still current here: status-pill tokens, motion budgets, component inventory, radius/spacing scale.

Binding design contract for **all phases**. Imported from claude.ai/design
(`0e5ea7a4-…`). Source of truth:

- **`/tokens/globals.css`** — CANONICAL token file (Tailwind v4 + shadcn, `.dark` class, `@theme` mapping done, motion keyframes appended). Phase 1 drops this into `src/app/globals.css`.
- `/tokens/tailwind.config.js` — Tailwind v3 fallback. `/tokens/README.md` — install notes.
- `docs/design/rajyash-design-system.html` — full rendered reference (the visual oracle).
- this spec — the rules every phase honours.

> Tokens caveat (from tokens/README): colors are raw hex, so Tailwind opacity modifiers (`bg-primary/50`) don't work as-is. If shadcn components need them, convert the vars to HSL channel triplets in Phase 1.

When building any screen, match this. Don't invent new colors, type sizes, or radii — use the tokens.

## Brand & tone
Warm, hopeful, human. India-resonant **saffron + leaf-green** on a warm cream canvas — not a literal flag, not charity-sad, not corporate. Headline: "Rescuing surplus food, with warmth."

## Color (tokens in `design-tokens.css`)
- **Primary (saffron/clay):** `--primary #C04E12` (hover `#A8420E`, soft `--primary-soft`). Brand accent `--brand-saffron #F2711C`.
- **Leaf green:** `--leaf #2E7D46` (= success). Use for confirmations, "delivered", eco framing.
- **Canvas:** `--background #FBF7F0`, surfaces `--surface #FFF` / `--surface-2`.
- **Text:** `--foreground #22271F`, `--muted-foreground`, `--subtle-foreground`.
- **Semantic:** success(leaf) · warning `#B26A07` · danger `#BE3B2E` · info `#0E6F9E`, each with `-soft` / `-foreground`.
- **Light + dark both shipped** (`[data-theme="light"|"dark"]`). v1 ships light; dark is ready when we want it.

### Pickup status pills (use these exact tokens — one per state)
`requested` (amber) · `accepted` (blue) · `enroute` (teal) · `pickedup` (violet) · `delivered` (green) · `cancelled` (red).
Each has `--st-<state>-bg / -fg / -dot`. Pill = rounded-pill, dot + label, `font-weight:700`, ~12.5px.
**En route / live** dots use the `rj-live` pulse animation.

## Typography
- **Display:** `Bricolage Grotesque` (`--font-display`), weights 700/800, tight tracking (−.02 to −.025em). Used for h1–h3, big stat numbers, hero.
- **Text/body + multilingual:** `Mukta` + `Noto Sans Gujarati` + `Noto Sans Devanagari` (`--font-text`). Covers EN/GU/HI — **never bake text into images.**
- Scale: h1 `clamp(34px,6.2vw,60px)` · h2 `clamp(26px,4vw,36px)` · section h3 ~17–26px · body ~15px · caption ~12.5–13.5px. `text-wrap:balance` on headings.
- Load via the Google Fonts `<link>` in the source HTML (or `next/font` in Phase 1).

## Shape, spacing, elevation
- Radius: `--radius-sm 8` · `--radius 12` (base) · `--radius-lg 16` · `--radius-xl 22` · pill 999.
- Spacing: base-4 scale.
- Shadows: `--shadow-sm / -md / -lg` (warm-tinted in light, black in dark).
- Inputs: 46px height, 10px radius, focus = `--ring` outline + soft glow (`box-shadow 0 0 0 3px ring@28%`).

## Components defined (build with shadcn/ui + Tailwind, themed to these tokens)
Buttons (primary / secondary / ghost / destructive, multiple sizes) · Inputs & Select · Badges · **status pills** · Cards · stat cards · **data table** (admin) · top nav · **bottom sheet** (mobile) · **modal** · **toast** · spinner · **shimmer skeleton** · quantity stepper · live-tracking map marker.

Sample screens already designed (reference layouts): public landing, donor "Donate food" multi-step flow, admin dashboard, live tracking.

## Motion & effects
Full motion language is its own spec: **[`/tokens/MOTION.md`](../../tokens/MOTION.md)** (principles, budget table, per-component specs), with paste-ready code in **`/tokens/motion.css`** (tokens + keyframes + CSS-only interactions + reduced-motion guard) and **`/tokens/motion.ts`** (Motion `motion/react` variants + `useCountUp`). Live reference: `docs/design/rajyash-motion-system.html`.

Five principles: (1) motion is feedback not decoration; (2) **transform + opacity only** (never width/height/top/left/box-shadow/filter — CWV); (3) **two budgets** — app/portal frugal (≤200ms, touch `:active`, only the live dot + skeleton loop), public generous (reveals, springs, count-ups); (4) reduced-motion is first-class (moves→fades, loops stop); (5) touch not hover.

Key pieces: app route enter via `.rj-route-shell` (CSS) · public route via View Transitions API · scroll reveals via Motion `revealContainer/revealItem` (`once:true`, public only) · claim-success `successPop` · toast/sheet/badge/pill variants · impact-counter `useCountUp`. Build each screen's motion to its surface budget.

## How phases consume this
1. **Phase 1** copies `/tokens/globals.css` into `src/app/globals.css` (Tailwind v4 + shadcn, `@theme` already wired), installs the fonts (`next/font` or `<link>`), sets up shadcn themed to these tokens, builds the status-pill + skeleton + toast primitives. Decide the hex-vs-HSL opacity question here.
2. **Every later phase** composes only from these primitives/tokens. New component → add it to `src/components/ui` themed to tokens, never a one-off color.
3. Keep `rajyash-design-system.html` as the visual oracle; if a screen drifts from it, the screen is wrong.
