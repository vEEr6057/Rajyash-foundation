# Rajyash Food-Rescue — Design Tokens

Warm, accessible (WCAG-AA), light + dark token set for the Rajyash Foundation
food-rescue app. Direction: **Saffron + Leaf**. Maps 1:1 to Tailwind + shadcn/ui.

## Files
- **`globals.css`** — Tailwind **v4** + shadcn. CSS variables on `:root` / `.dark`,
  exposed as utilities via `@theme inline`. This is the recommended setup.
- **`tailwind.config.js`** — Tailwind **v3** fallback. Wires the same variables
  to `theme.extend`. Still requires the `:root` / `.dark` blocks from `globals.css`.

## Install (Tailwind v4)
1. Copy `globals.css` into `app/globals.css` (or `src/index.css`) and import it.
2. Add the fonts to your `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Mukta:wght@400;500;600;700&family=Noto+Sans+Gujarati:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet">
   ```
3. Toggle dark mode by adding `class="dark"` to `<html>`.

## Install (Tailwind v3)
1. Paste the `:root { … }` and `.dark { … }` blocks from `globals.css` into your CSS.
2. Use `tailwind.config.js` as your config. Set `darkMode: ["class"]` (already set).

## Usage
```html
<!-- Primary action -->
<button class="bg-primary text-primary-foreground rounded-lg font-sans">Donate</button>

<!-- Positive action -->
<button class="bg-leaf text-leaf-foreground rounded-lg">Accept pickup</button>

<!-- Status pill: en route -->
<span class="bg-st-enroute-bg text-st-enroute-fg rounded-full">En route</span>

<!-- Headline -->
<h1 class="font-display text-foreground">Feeding hope, daily</h1>
```
(In the v3 config the status utilities are namespaced: `bg-status-enroute-bg text-status-enroute-fg`.)

## Pickup status tokens
`requested · accepted · enroute · pickedup · delivered · cancelled` — each ships a
`-bg`, `-fg`, and `-dot` value. Always pair the colour with a label and a dot;
never rely on colour alone (colour-blind + sunlight legibility).

## Notes
- Colours are stored as hex, so Tailwind opacity modifiers (`bg-primary/50`) are
  not supported as-is. Convert to HSL channel triplets if you need them.
- `--primary` (#C04E12) and `--leaf` (#2E7D46) clear 4.5:1 with white text.
  `--saffron` (#F2711C) is the vivid accent for icons/charts — not for white text.
- Type scale, spacing (4px base), and component specs are documented in
  `Rajyash Design System.dc.html`.
