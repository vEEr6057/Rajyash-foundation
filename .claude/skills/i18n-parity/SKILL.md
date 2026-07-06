---
name: i18n-parity
description: Use when any change touches src/i18n/messages/, adds/renames/removes UI strings, or before claiming done on a feature with user-facing text — and whenever GU/HI text looks garbled (mojibake, â€, Ã, replacement chars).
---

# i18n parity — EN/GU/HI

## Overview
EN is the reference locale; GU and HI must carry the same key sets. Drift is silent (next-intl
falls back or crashes at runtime, not build time), and UTF-8 mojibake has shipped twice
(fixed in PR #114 with explicit charset). One script checks both.

## When to Use
- After adding/renaming/removing any message key or messages file.
- Before "done" on any feature with user-facing text.
- After any change near encoding (HTML emit, email templates, static file generation).
- NOT for: code-only changes with zero string edits.

## Procedure
1. Run the checker (from repo root):
   ```bash
   node .claude/skills/i18n-parity/check.mjs
   ```
   Exit 0 = parity OK. Exit 1 = act on every `MISSING`/`EXTRA`/`MOJIBAKE` line before proceeding.
2. `MISSING <locale>/<file>: <key>` → add the key with a real translation. If you cannot write
   native GU/HI, translate best-effort AND add `"_review": "pending"` to the enclosing block —
   never leave the key absent, never paste the EN string without the marker.
3. `EXTRA` → key exists in GU/HI but not EN: either the EN rename missed the other locales
   (rename them too) or it's dead — delete it.
4. `MOJIBAKE` → do NOT hand-fix the visible character only; find the encoding fault upstream
   (file written without UTF-8? HTML emitted without `<meta charset>`? PowerShell `Out-File`
   without `-Encoding utf8`?). The visible artifact is a symptom.
5. `INFO <locale>: N _review:pending` is informational — report the count in your summary if it
   grew; those strings await native-speaker review.

## Conventions the checker encodes
- Keys starting with `_` (`_review`, `_meta`) are translator metadata, ignored for parity.
- Mojibake canary = U+FFFD or any Latin-1-supplement letter (À–ÿ): legitimate EN/GU/HI content
  never contains those (em-dash, ₹, Gujarati/Devanagari blocks all pass).

## Common Mistakes
| Mistake | Fix |
|---|---|
| Adding a key to EN only, "translations later" | Add all 3 now; mark GU/HI `_review: pending` |
| Fixing mojibake by retyping the character | Fix the encoding path; artifact returns otherwise |
| Renaming a key in EN + component, forgetting GU/HI | Checker flags as MISSING+EXTRA pair — rename, don't add/delete blindly |
