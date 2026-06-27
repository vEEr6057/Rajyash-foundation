---
name: food-rescue-lessons
description: Self-improving lesson capture/recall for the Rajyash Food Rescue web app
---

## Trigger
Activate at the start of any Food Rescue task, after any signal-fire (build/test/lint failure → fix → pass),
or before correction-prone actions: forms (RHF+Zod), service/mock parity, adapter/mapper edits, auth/OTP flow,
payment (Razorpay/UPI) integration, map/live-tracking code, notification fan-out (email/SMS/WhatsApp/push), DB
schema/migration.

## What this does
Self-improving knowledge base of mistakes + verified fixes, scoped to this repo. Storage is **project-local**:
`.claude/lessons/` (travels with git, shareable with the team). Adapted from the kaka `cricmax-lessons` system.

## Procedure

### Recall (entry)
1. Read `.claude/lessons/INDEX.md` (top 50 lines) on first activation per session.
2. Grep INDEX for tag matches before high-risk actions.
3. Read the matching lesson file(s) under `.claude/lessons/<topic>/`.
4. Surface verified fixes inline before writing code.

### Capture (deliberate — with judgment, not automatic)
Capture only when the bar is met: a NON-obvious fix that cost real debugging time (gotcha, silent failure,
non-intuitive root cause). Self-detection triggers:
- Build/test/lint failure → followup edit → pass.
- Tool/runtime error → different approach succeeded.
- Same file edited 3+ times within 5 turns.
- A search returned empty when it shouldn't have.

Skip if (anti-spam): whitespace/typo/import-only edit; known flaky retry; edit reverts to original; a
near-identical lesson exists (≥70% overlap) → update that instead. NEVER capture a convention restatement.

Caps: 20 lessons/session (overflow → `INDEX-pending.md`); 200 lines in INDEX (oldest → `INDEX-archive.md`).

### Lesson file format → `.claude/lessons/<topic>/<id>.md`
```yaml
---
id: <kebab-case-short-id>
topic: <frontend|forms|auth|payments|maps-tracking|notifications|db|testing|general>
severity: <high|medium|low>
status: <auto-recorded|verified|tentative|superseded|false-positive>
tags: [<list>]
related-files: [<paths>]
created: YYYY-MM-DD
verified-by: <how-confirmed>
---

## Symptom
## Root cause
## Verified fix
## Tripwire
```
Then append one line to `INDEX.md` (newest first):
```
- [YYYY-MM-DD topic/SEVERITY/status] short-id — one-line summary → <topic>/<id>.md
```

### Status lifecycle
`auto-recorded` → `verified` (test/build/lint pass after fix, or no regression next session) →
`superseded` (newer verified lesson contradicts) / `false-positive` (fix doesn't apply on recurrence).

### Maintenance
INDEX pruned to 200 lines; `superseded`/`false-positive` lessons stay on disk, drop from INDEX. If ≥3 new
lessons captured in a session, print a one-line summary in the final response (informational).

## Relationship to other config
- Invariants/conventions live in `CLAUDE.md` + `.claude/rules/*.md` (NOT here) — injected by `.claude/hooks/prompt-context.sh`.
- This skill is the recall/capture engine; the hook does keyword-triggered surfacing automatically.
