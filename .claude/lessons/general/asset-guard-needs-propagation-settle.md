# Post-deploy asset guard needs a propagation settle + 404-retry

**Tags:** general, ci, cloudflare, deploy

**Severity:** MEDIUM · **Status:** verified (2026-07-05)

## Symptom
The post-deploy "Verify client assets are live" step (UX-19, added to catch dead client bundles)
**failed on a healthy deploy**. It fetched the homepage, extracted
`/_next/static/chunks/webpack-<hashA>.js`, curl'd it → **404**, and failed the workflow. But the
live site was fine minutes later: homepage 200, chunk `webpack-<hashB>.js` → 200. Different hash.

## Root cause
Cloudflare's edge does not serve the new bundle the instant `wrangler deploy` returns. There's a
brief propagation window where the freshly-activated worker already returns HTML referencing
new-hash chunks whose static assets the queried edge hasn't finished serving → a single immediate
check 404s on a perfectly good deploy. Two compounding traps:
1. `curl --retry N` does **not** retry HTTP 4xx (only connection/transport errors), so `--retry 3`
   gave no protection against the 404.
2. Chunk hashes change between builds, so retrying the SAME url is wrong — you must re-derive the
   chunk from fresh HTML each attempt.

## Fix
Loop: re-fetch HTML → re-extract the chunk → curl it; on failure `sleep 15` and retry (~6 attempts
/ ~90s budget) before declaring the bundle dead. Genuinely-dead bundles still fail (all attempts
404); propagation-lag deploys pass on a later attempt.

## Guard for next time
Any post-deploy HTTP check against Cloudflare (or any CDN) must include a settle delay + retry that
re-derives cache-busted URLs each attempt — never a single immediate curl. A one-shot check right
after `wrangler deploy` will flake on edge propagation. Related: `curl-smoke-check-misses-dead-client-js`
(why the check exists), `gh-run-watch-exit-vs-conclusion` (verify deploy conclusion via --json).
