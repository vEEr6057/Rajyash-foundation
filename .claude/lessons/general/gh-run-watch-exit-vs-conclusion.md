# gh run watch piped → exit code lies; confirm the run conclusion

**Date:** 2026-06-28 · **Severity:** MEDIUM · **Status:** verified · **Topic:** general (CI / deploy-on-merge)

## Symptom
Reported a Cloudflare deploy as "succeeded" and even Playwright-"verified" it — but the live
site kept serving the *previous* build (a green re-palette stayed orange). The CSS asset on the
live Worker still had the old hex; the GitHub Actions run was actually **`completed/failure`**.

## Root cause (two compounding)
1. **Exit-code mis-read.** `gh run watch <id> --exit-status | tail -n N; echo "rc: $?"` reports
   **`tail`'s** exit (always 0), NOT the workflow's. The watch's own non-zero exit is swallowed by
   the pipe. So a failed deploy looked green.
2. **A constant-pinned test blocked the deploy.** The merge-only CI is `validate (typecheck+lint+
   **test**) → build → deploy`. `src/app/manifest.test.ts` hard-asserted `theme_color === '#C04E12'`;
   a token change to green flipped `manifest.ts` → that test failed → **CI failed → deploy step never
   ran** → live stayed on the prior build. (This is exactly the "test that retypes a constant" the
   testing rules say not to write — and it silently gated a release.)

## Fix / protocol
- **Never trust a piped `gh run watch` exit.** Confirm the real result:
  `gh run view <id> --json status,conclusion -q '"\(.status)/\(.conclusion)"'` → expect `completed/success`.
- **When live output looks stale, verify the deployed asset, not the page render.** Bypasses CDN +
  browser + Playwright cache in one shot:
  `css=$(curl -fsSL "$URL/?cb=$RANDOM" | grep -oE '/_next/static/css/[^"]+\.css'); curl -fsSL "$URL$css" | grep -oiE 'newhex|oldhex'`
  New hex present + old absent = it truly shipped. (A new content hash in the CSS filename also
  confirms a fresh build.)
- **Run the full `pnpm test:run` locally before merging any change that edits a value another test
  pins** (theme colors, manifest, constants) — don't lean on "CI will catch it" when CI-fail = no deploy.
