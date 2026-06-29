# UI Solutions & Brainstorm — Rajyash Food Rescue

Companion to UI-AUDIT.md. Each item: problem → options (with trade-offs) → **recommendation** for our stack (Next 15 RSC · Cloudflare Workers · shadcn/Tailwind v4 · zero-budget · mobile-first · green/gold brand · frugal app motion / generous public motion). Backed by 2025 research (sources at bottom).

Effort: S (≤½ day) · M (1 day) · L (multi-day)

---

## CRITICALS

### 1. Mobile public header overflow + horizontal scroll  🔴
Cause: logo + EN/ગુ/હિ + theme + Sign in + Join all inline at 390px; hero floating cards bleed past viewport.
- **A** Collapse the public header on mobile: logo + a hamburger that opens a Sheet holding nav links + language + theme + "Sign in / Join". (matches bottom-nav research: hide secondary, keep primary visible)
- **B** Keep inline but drop to icon-only + wrap language into a single globe menu.
- **Reco: A.** One primary visible ("Join"), rest in a Sheet (we already built `Sheet`). Also add `overflow-x-hidden` on the hero section + clamp the floating cards inside `overflow-hidden` so nothing bleeds. **Effort S.**

### 2. Destructive actions — no confirm / no undo  🔴
Research consensus: **undo-toast for reversible, confirm-dialog for irreversible; never over-use dialogs.**
- Deactivate user → reversible (reactivate exists) BUT account-level access → **AlertDialog confirm + success toast.**
- Delete partner / destination → **hard delete** today. Two paths: (A) `AlertDialog` confirm now [S]; (B) soft-delete column + **undo toast** [M, nicer UX]. **Reco: A now, B later** (zero-budget, ship safety fast).
- Run "Set to Cancelled" → **AlertDialog confirm.**
- Build reusable `<ConfirmButton>` (wraps shadcn `AlertDialog`) + `confirm()`-style hook. Need: `shadcn add alert-dialog`. **Effort M total.**

### 3. No success/error feedback  🔴
shadcn's old `toast` is **deprecated → use Sonner** (now the shadcn default).
- Pattern (research): server action returns `Result<T>` (we already do) → client action-caller shows `toast.success/error`; for async use `toast.promise`. Add `<Toaster richColors />` once in `providers.tsx`.
- For undo: `toast(msg, { action: { label: "Undo", onClick } })`.
- **Reco: Sonner.** Wrap our existing action calls (assign, verify, role, create, delete) to toast on `ok`/`!ok`. **Effort M** (lib + ~15 call sites).

### 4. Touch targets < 44px  🔴
- Bump `Button` `size="icon"` from `size-9` (36) → `size-10`/`size-11` (40/44); add `min-h-11 min-w-11` on mobile for row-action triggers, pagination, theme toggle, stop reorder/delete.
- Or keep visual 36 + expand hit area via padding/`before:` pseudo (hitSlop).
- **Reco:** icon size → 40 desktop / 44 mobile via responsive classes; reorder/delete get padding. **Effort S.**

---

## HIGH

### 5. Dark-mode contrast  🟠
- Measure `--muted-foreground` on dark cards; if <4.5:1, lighten the dark-theme token a notch. Add the "stale/updated" + helper texts to the audit.
- **Reco:** token tweak + a one-pass contrast check (web-perf/axe). **Effort S.**

### 6. Native controls → shadcn  🟠
- Selects: replace every native `<select>` (filters, role, partner type, food type, unit, add-stop) with the shadcn `Select` we already have. [S each]
- Dates/datetime (pickup window, run date, report range): native `<input type=date/datetime-local>` → **shadcn date-time picker** (Popover + `react-day-picker` v9 + time). Options: official shadcn date-picker (date only) or `huybuidac/shadcn-datetime-picker` (datetime, TZ-aware, Tailwind-v4 ok). **Reco:** Select swaps now [S]; adopt `shadcn-datetime-picker` for windows [M]. **Effort M.**

### 7. Mobile bottom nav (portal + driver)  🟠
Research: bottom bar = thumb-zone, 1-tap, badges, better discovery than hamburger; 3–5 items.
- **Reco:** role-aware `<BottomNav>` shown `<lg`, `env(safe-area-inset-bottom)` padding, active highlight, notification badge:
  - Donor: Home · Post · My pickups · Alerts
  - Volunteer: Home · Board · Map · Alerts
  - Driver: My Run · (History) · Alerts
- Desktop keeps current header. **Effort M.**

### 8. Driver experience build-out  🟠
- Driver shell + bottom nav; My Run shows: today's run card (even empty → "no run, next drive at…"), per-stop progress, big Navigate/Mark-done targets, past runs list, help/contact. **Effort M.**

### 9. Distinctive hero + branded auth  🟠 (frontend-design)
Research (Webby/Awwwards nonprofits: Obama Foundation, WaterAid, Farm Africa, Greenpeace): **storytelling-first, oversized editorial type, real stats band, scroll focus, mission urgency** — not gradient-blob SaaS.
- **Hero options:** (A) editorial — giant headline + a single strong photo/illustration + live impact band, asymmetric; (B) split narrative — fixed left mission, right scrolls stats/steps (Obama-style); (C) stat-forward — hero IS the impact counter, huge.
- **Reco:** **A** (editorial, achievable zero-budget) — drop gradient blobs + glass chips, oversized Bricolage headline, one warm motif/illustration, real "6,952 meals" band inline, asymmetric. Keep green/gold. Add tasteful scroll motion (stagger, not uniform fade).
- **Auth:** Clerk `layout.logoImageUrl` + `logoPlacement:"inside"` + `socialButtonsVariant:"blockButton"` (fixes icon-only Google), `layout` links (privacy/terms). Wrap `<SignIn>` in our own **split-screen page** — left brand panel (logo + mission + impact + photo), right Clerk card. Remove "Development mode" by going Clerk production later. **Effort M–L.**

---

## MEDIUM

### 10. Charts on Reports  🟡
- Add recharts to `/admin/reports` (partner/destination bars, deliveries trend) mirroring overview. Pairs with existing tables = good a11y (table = chart fallback). **Effort S.**

### 11. KPI delta/context  🟡
- Compute previous-period totals; show ▲/▼ % + a tiny sparkline per KPI card (recharts `<Sparklines>`-style or mini Area). **Effort M.**

### 12. tabular-nums everywhere  🟡
- Add `tabular-nums` utility to all numeric `<TableCell>` + stat values + chart axes. **Effort S.**

### 13. Table sorting + aria-sort  🟡
- Sortable column headers driving `?sort=col&dir=` (URL state per WIG), `aria-sort` on `<th>`. Repo pattern already URL-driven (pagination). **Effort M.**

### 14. Reveal-on-scroll first-paint  🟡
- Bug: below-fold content invisible on instant load. Fix: on mount, if element already in viewport → show immediately; add a short fallback timer to reveal regardless; only arm hide for genuinely below-fold. Or CSS `@starting-style`/`animation-timeline: view()` (progressive). **Reco:** in-view-on-mount check + fallback. **Effort S.**

### 15. Recharts a11y  🟡
- Add `accessibilityLayer` (arrow-key nav + aria, RC v3), `role="img"` + `aria-label` summary per chart, and a visually-hidden data summary/table. **Effort S.**

### 16. Forms UX  🟡 (our RHF forms: pickup, partner, destination, onboarding)
- Validate on blur (not keystroke); focus first invalid on submit; `autocomplete`/`inputmode`/semantic `type`; placeholders end "…"; required `*`; password show/hide is Clerk's (auth) so n/a for ours. **Effort M.**

### 17. Google button label / Clerk polish  🟡
- `socialButtonsVariant:"blockButton"` → shows "Continue with Google". (covered in #9)

---

## LOW
- "Development mode" badge → resolves when Clerk goes production.
- Hero faint motif → replaced in hero redesign (#9).
- Skip-link + heading scroll-margin → add to layouts. **Effort S.**
- GU/HI machine-draft → needs human translation review (non-code).

---

## Suggested sequence (criticals → polish)
**Phase 1 (safety + feedback, S/M):** Sonner toasts (#3) → AlertDialog confirms on all destructive (#2) → 44px targets (#4) → mobile header fix (#1). One PR, screenshot-verified.
**Phase 2 (consistency, M):** native→shadcn Select + datetime picker (#6) → dark contrast (#5) → tabular-nums (#12) → forms UX (#16).
**Phase 3 (mobile + nav, M):** bottom nav (#7) → driver build-out (#8).
**Phase 4 (distinctiveness, M–L):** editorial hero (#9) → branded split auth (#9) → reveal-on-scroll fix (#14).
**Phase 5 (analytics depth, M):** reports charts (#10) → KPI deltas (#11) → table sorting (#13) → chart a11y (#15) → skip-link.

## New deps implied
`sonner`, `shadcn add alert-dialog select` (Select present; ensure), `react-day-picker@9` + `date-fns` (datetime picker). All free, Tailwind-v4 + Workers compatible.

## Sources
- Sonner + RSC server actions: buildui.com/posts/toast-messages-in-react-server-components · robinwieruch.de react-server-actions-useactionstate-toast
- Destructive UX (undo vs confirm): nngroup.com/articles/confirmation-dialog · medium design-bootcamp destructive-actions
- shadcn datetime picker: ui.shadcn.com/docs/components date-picker · github huybuidac/shadcn-datetime-picker
- Mobile bottom nav: uxpin.com mobile-navigation-patterns · nngroup mobile-navigation-patterns
- Recharts a11y: github recharts/recharts/wiki/Recharts-and-accessibility · deque.com how-to-make-interactive-charts-accessible
- Clerk layout/branding: clerk.com/docs customizing-clerk/appearance-prop/layout
- Distinctive nonprofit hero: numiko.com best-non-profit-websites-2026 · awwwards nonprofit-websites · webbyawards charitable-nonprofit
