# Rajyash Food-Rescue — Motion Language

Extends the existing system (`rj-live`, `rj-shimmer`, `rj-spin`, `rj-toast-in`,
`rj-sheet-up`, `rj-fade-in`, ease `cubic-bezier(.2,.8,.3,1)`, reduced-motion guard).
Files: **`motion.css`** (tokens + keyframes + CSS-only interactions),
**`motion.ts`** (Motion/`motion/react` variants + hooks).

## a) Principles

1. **Motion is feedback, not decoration.** Every animation answers *what just
   happened* or *what's next*. If it doesn't, cut it.
2. **Transform & opacity only.** Both are GPU-composited. Never animate
   `width/height/top/left`, `box-shadow`, or `filter` (use a pseudo-element or a
   `transform` proxy instead).
3. **Two budgets.** The **app/portal** is frugal and functional (≤200ms micro,
   touch `:active`, no loops except the live dot). The **public site** is
   generous (reveals, springs, count-ups).
4. **Reduced motion is a first-class state.** Moves become fades, loops stop,
   content always lands in its final position. Never gate information behind motion.
5. **Touch, not hover.** Drivers tap one-handed — design `:active`/press states;
   reserve `:hover` for desktop/public.

## b) Tokens (added to CSS variables — see `motion.css`)

| Group | Token | Value |
|---|---|---|
| Duration | `--motion-instant` | 90ms |
| | `--motion-fast` | 140ms |
| | `--motion-snappy` | 200ms |
| | `--motion-base` | 280ms |
| | `--motion-slow` | 420ms (public) |
| | `--motion-deliberate` | 640ms (public) |
| | `--motion-count` | 1400ms (public) |
| Easing | `--ease-standard` | `cubic-bezier(.2,.8,.3,1)` |
| | `--ease-out` | `cubic-bezier(.16,1,.3,1)` |
| | `--ease-in` | `cubic-bezier(.4,0,1,1)` |
| | `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` |
| | `--ease-back` | `cubic-bezier(.34,1.56,.64,1)` |
| Distance | `--motion-rise-sm / md / lg` | 8 / 16 / 24px |
| Scale | `--motion-press` | .97 (pills .96) |

JS mirrors live in `motion.ts` as `DUR`, `EASE`, `SPRING`.

## c) Page transitions

**In-app (cheap, zero JS).** Put `.rj-route-shell` on `app/template.tsx`'s wrapper
— a 200ms `translateY(6px)+fade` *enter only* (exits cost layout/jank on low-end).

```tsx
// app/template.tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="rj-route-shell">{children}</div>;
}
```

**Public (richer).** Use the **View Transitions API** for cross-route crossfades
(`::view-transition-old/new(root)` already styled in `motion.css`). For shared
elements (hero image → detail), add `view-transition-name` to both. Fall back to
Motion `AnimatePresence` + `appRoute` where you need an exit on a subtree.
Skip View Transitions in the app shell — the morph snapshot is costly on mid-range Android.

## d) App vs Public budget

| | **App / Portal / Admin** | **Public marketing** |
|---|---|---|
| Network/device target | mid-range Android, patchy 3G | desktop/wifi |
| Micro-interaction max | 200ms | 280ms |
| Entrance/reveal max | 280ms | 640ms |
| Springs | success moments only | yes (sheets, hero, cards) |
| Scroll reveals | ✗ (content is instant) | ✓ stagger, `once:true` |
| Count-ups | ✗ | ✓ |
| Continuous loops | live dot + skeleton only | tasteful (contained) |
| Parallax / scroll-linked | ✗ | desktop only, ≥768px |
| Trigger | `:active` / state change | `:hover` + `whileInView` |
| Properties | transform + opacity | transform + opacity |
| Reduced motion | hard fade / instant | hard fade / instant |

## e) Per-component specs (CSS vs Motion + why)

| Component | Tech | Spec |
|---|---|---|
| **Primary/secondary button** | **CSS** | `.rj-press` — `:active scale(.97)` @ 90ms ease-out; bg/shadow 140ms. No JS = instant + offline-safe. |
| **Form field focus** | **CSS** | ring via `box-shadow` 140ms ease-standard. |
| **Field valid** | **CSS** | leaf check fades in (opacity 140ms). |
| **Field error** | **CSS** | `.rj-field--error` shake (±5px, 360ms) **once**. Reduced-motion → no shake; red border + icon carry it. |
| **Status pill** | **CSS + Motion** | dot colour transitions 200ms (CSS). On label change, `AnimatePresence mode="popLayout"` + `pillLabel` (140ms tween). App can skip the swap and just transition colour. |
| **Claim/accept success** | **Motion** | tap→spinner(`rj-spin`)→`successPop` (scale 1→1.08→1, 340ms `ease-back`) as bg morphs to leaf + check draws. Orchestrated multi-step → Motion variants; one-shot so cost is fine. |
| **Toast** | **Motion** | `toastVariant` enter 200ms; **exit** 140ms via `AnimatePresence`. Auto-dismiss 3.2s. |
| **Bottom sheet** | **Motion** | `sheetVariant` spring `gentle` (stiffness 260/damping 30); backdrop fade; `drag="y"` dismiss at offset>120 or velocity>600. Drag+spring+velocity = Motion's job. |
| **Skeleton → content** | **CSS** | shimmer loop (CSS) → on load crossfade to `rj-content-in` (220ms). Keep CSS in long lists to avoid Motion cost. |
| **Live-tracking dot** | **CSS** | `.rj-dot-live` `rj-live` 2s infinite — the only app loop. Reduced-motion → static solid dot. |
| **New-pickup badge** | **Motion/CSS** | `badgeBump` scale 1→1.22→1 @180ms when count increments. |
| **Impact counter** | **Motion** | `useCountUp` 1.4s `ease-out`, `tabular-nums` to avoid reflow, `once:true`. Reduced-motion → final number instantly. |

## f) Extras (tasteful) + Core Web Vitals flags

- **Public-only — hero gradient drift** (`rj-drift`, 12s): contain to a small
  element, animate `background-position` only. ⚠️ background-position isn't
  composited — keep the element small; never full-bleed.
- **Public-only — image parallax** on scroll (Motion `useScroll`+`useTransform`,
  ≤24px). ⚠️ scroll-linked → can jank; **disable below 768px**.
- **App — status timeline fill**: progress bar `transform: scaleX()` 200ms. ✓ cheap.
- **App — pull-to-refresh**: `rj-spin` on the existing spinner. ✓ functional.
- **Avoid everywhere:** animating `width/height/top/left`, `box-shadow`, `filter`,
  large `blur()`, or layout-affecting properties — these trigger layout/paint and
  hurt INP/CLS, especially on the drivers' phones.
