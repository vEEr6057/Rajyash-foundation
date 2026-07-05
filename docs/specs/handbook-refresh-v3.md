# Handbook refresh v3 — exhaustive per-persona capability reference

**Goal (owner, verbatim):** "each and every detail mentioned — what power does each persona have,
what actions can they perform, and how can they perform everything, detailed full e2e … as
detailed as possible." Take the time; completeness > brevity.

**Why v3:** v2 (PR #104) was exhaustive for the app *as captured*, but four feature PRs landed
after it — invite-provisioning (#107, partly back-patched), UX wave-1 (#106), UX wave-2 (#108),
stop-audit (#109). ~18 new actions + changed UI are undocumented and the screenshots predate the
new surfaces. v3 re-establishes 100% coverage of the CURRENT app.

## Fire trigger (do NOT start before this)

All true:
1. #108 merged + deployed (UX wave-2 live).
2. #109 merged + deployed (stop-audit live) — migration 0015 already applied ✓.
3. Post-deploy asset guard green on the final deploy.

Capturing before this = stale screens (the v1 mistake). Migration-first already done, so #109
code is deploy-safe.

## Pipeline (orchestrator-run, in order)

### Phase A — authoritative current-state inventory (read-only agent, off merged main)
Sweep the WHOLE app and produce `docs/guide/ACTION-INVENTORY-v3.md`: every action, grouped by
persona, each row = { action, where (route + control), server action/guard, ownership/authz rule,
outcome, since-PR }. Must include the new surfaces:
- **Public/visitor:** homepage sections, live-impact panel + provenance, language/theme, donate
  (flag-gated, Turnstile→Razorpay), legal pages, sign-up/in, staff sign-in.
- **Cross (all signed-in):** onboarding (self-signup path only), notification bell + feed + push
  opt-in, language/theme, PWA install nudge (UX-17), instructive empty states (UX-16).
- **Donor:** post via sheet (all fields + Find + photo + safety), **repeat-last-pickup** (UX-6),
  edit/cancel/repost, My Pickups, live tracking (en_route-only), **status timeline** (UX-7),
  **delivery proof-back** (UX-8), receipts/history.
- **Volunteer:** read-only board (+ "what's cooking" demotion, UX-10), **Today's distributions +
  map** (UX-9), confirm a drop, tracking-visibility awareness — never claims/collects.
- **Driver:** board + **claim from card** (UX-1) + **distance sort/chips** (UX-2), pickup detail,
  **call** (UX-3) + **navigate** (UX-4), advance status + **sticky bar** (UX-5), proof photo,
  share location, My Run + mark stops.
- **Admin:** overview (+ meals/kg explainer + dashboard-perf note), pickups + assign-to-driver +
  **bulk assign** (UX-12), dispatch runs (create/advance/delete/add-remove-reorder stops/
  **override stop status**/reassign driver/edit run), **stop status history — full transitions**
  (#109), destinations + **active toggle** (UX-15), partners + link donor, users: change role /
  **invite any role w/ name/phone/city → skips onboarding** (#107) / deactivate / reactivate /
  **search + role filter** (UX-13), reports + CSV, log surplus, **status-event history** (UX-14).
Cross-check against source — flag any action found in code but not previously documented, and any
still-open gap (e.g. run-stop legacy fallback). This file is the writer's completeness contract.

### Phase B — recapture ALL screens against the LIVE deployed app (orchestrator, Playwright MCP)
Sign into all 4 roles (Clerk test accounts, code 424242 — see lesson
`clerk-programmatic-test-signin`). Recapture every changed/new surface + keep unchanged ones:
distance-chip board, driver call/navigate/sticky, donor repeat-last + timeline + proof-back,
volunteer distributions map + rebalanced dashboard, admin bulk-select + users search + destination
toggle + status/stop history, invite dialog (name/phone/city), empty states, PWA nudge. Seed data
must be present so lists/maps/timelines render. Save to `docs/guide/assets/` with a manifest
(filename → what it shows) since the writer can't view images.

### Phase C — exhaustive rewrite (writer agent)
Rewrite `HANDBOOK.md` + `_handbook-template.html` from ACTION-INVENTORY-v3 + the manifest. Structure
per persona, and for EACH persona open with a **"What you can do" powers table** (capability →
one-line), then a subsection per action written full e2e: *where → which control → each field/step
→ what happens → what you see next*, with the right screenshot. Include an authz note where an
action is role-gated or ownership-checked (so staff/trainers understand the boundary). Keep the
layered voice (end-user how-to + a staff/trainer reference depth). Every inventory row present;
deliberately-omitted rows listed with reason. Corrected model throughout (drivers collect,
volunteers distribute).

### Phase D — build + republish (orchestrator)
`node docs/guide/build.mjs` (inline JPEGs, assert 0 unreplaced tokens) → WebFetch-verify the
published book renders + spot-check new sections → republish the Artifact to the SAME URL
(92886f67-c75a-46f4-899e-e285e846570f) → PR the `docs/handbook-v3` branch.

## Guards
- Screens captured AFTER deploy only (fire trigger). No pre-merge captures.
- Writer can't see images → always pass the manifest.
- One PR; gates green (docs-only, but run `pnpm test:run` once to confirm nothing else moved).
- i18n: handbook is EN-only prose; note each screen also exists in GU/HI.
