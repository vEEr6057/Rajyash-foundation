# Cheap-model QA-audit "blockers" are usually Playwright-interaction artifacts, not app bugs

**2026-07-04 · testing/MEDIUM/verified**

## Symptom
A Haiku E2E audit of live prod reported a BLOCKER ("donor form: 30s timeout clicking category
select — core workflow broken") and a HIGH ("volunteer board: no claim button — cannot claim").
Both sounded release-blocking.

## Reality (both false)
- **"Form timeout":** category is a plain native `<select name="category">`. The agent drove it like
  a custom popup combobox (click → wait for an options listbox that never appears) → 30s hang.
  `locator('select').selectOption()` succeeds instantly. Form fully works.
- **"No claim button":** the board is a card LIST; each card is a `<Link>` to the pickup detail page,
  where the "Claim this pickup" button lives. The agent never followed the card. Correct by design.

Third false alarm of the same session (also: CF free-tier throttle mis-read as an "admin outage";
a plain card list mislabeled a "kanban board").

## Rule
Never dispatch a fix (or tell the user something is broken) from a cheap-model audit's
BLOCKER/HIGH without reproducing it yourself first. Cheap models reliably trip on: native
`<select>` vs custom combobox, affordances one navigation away (card → detail), CF burst-throttle
503s, and static-UI naming. Verify repro with `browser_run_code_unsafe` (fresh context, real
`selectOption`/`getAttribute('href')` probing) before believing it. Their PASS results and
data-quality checks (NaN, counts, console MISSING_MESSAGE) are trustworthy; their INTERACTION
failures are not. See also [[cf-free-tier-burst-throttle-masquerades-as-outage]].
