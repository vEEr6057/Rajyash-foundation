---
id: opennext-windows-build-middleware-500
topic: general
severity: high
status: verified
tags: [deploy, opennext, cloudflare, windows, wsl, middleware, clerk, 500]
related-files: [next.config.ts, wrangler.jsonc, package.json]
created: 2026-06-27
verified-by: Phase 7 deploy — Windows build 500'd; identical WSL (Linux) build deployed clean
---

## Symptom
`pnpm run deploy` (`@opennextjs/cloudflare` build+deploy) from **Windows** uploads fine, but every
route on the live Worker returns **HTTP 500 "Internal Server Error"**. `wrangler tail` shows:
```
⨯ Error: Dynamic require of "/.next/server/middleware-manifest.json" is not supported
```

## Root cause (cost ~2h + ~8 wasted deploys to find)
`@opennextjs/cloudflare` 1.20.0 bundles the `@opennextjs/aws` 4.0.2 core, which **patches Next's
compiled `next-server`** (the "Applying code patches" build step) to turn its dynamic
`require(manifestVar)` calls into static, bundle-safe imports. **That patcher does not apply
correctly on a Windows build** — it leaves the `middleware-manifest.json` require dynamic, esbuild
shims it to throw, and next-server crashes at runtime on the first request (any route, because the
server function reads the middleware manifest at init). A Next middleware file existing (e.g. Clerk's
`clerkMiddleware`) is what makes that code path run.

## What is NOT the cause (all ruled out — don't chase these)
Missing Worker secrets, the stray `~/package-lock.json` workspace-root warning, `outputFileTracingRoot`,
Serwist (`withSerwist`), next-intl, the opennext patch version (1.20.0→1.20.1 = same aws-core 4.0.2),
or a Next patch (15.5.19→15.5.18). Version pairing is correct (opennext peer `next >=15.5.18 <16`).
The Windows build *succeeds* and produces all 24 routes — only the bundle's middleware require is wrong.

## Fix (verified) — build on Linux, deploy from anywhere
Build the opennext bundle on Linux (WSL Ubuntu works), then deploy:
```bash
# in WSL (one-time per deploy):
cd /mnt/c/.../Rajyash-Foundation
mkdir -p ~/rajyash && git archive HEAD | tar -x -C ~/rajyash   # clean tree, native FS (fast)
cp .env.local ~/rajyash/                                        # build inlines NEXT_PUBLIC_* + validates env
cd ~/rajyash && corepack prepare pnpm@10.33.2 --activate && pnpm install
pnpm exec opennextjs-cloudflare build                          # "Applying code patches" must run
cp -r ~/rajyash/.open-next /mnt/c/.../Rajyash-Foundation/.open-next
# back on Windows (holds the wrangler OAuth):
npx wrangler deploy            # uploads the Linux-built .open-next — do NOT `pnpm run deploy` (rebuilds on Windows)
```
Worker secrets are set independently (`wrangler secret put`), persist across deploys, and are NOT in
the bundle — runtime env validation (`src/config/env.ts`) needs all server vars set as Worker secrets
or it 500s separately (set INNGEST_*, RESEND_API_KEY, VAPID_* — these were missing initially).

## Permanent fix
Move deploys to **Linux CI** — GitHub Actions (ubuntu, `pnpm run deploy` with `CLOUDFLARE_API_TOKEN`)
or Cloudflare Workers Builds (connect the repo; CF builds on Linux). Never build the prod bundle on Windows.

## Tripwire
opennext + Cloudflare + Windows = `Dynamic require of middleware-manifest` 500. Build the bundle on
Linux/WSL (the aws-core patcher needs it), then `wrangler deploy`. Don't waste time on secrets/config —
it's the build OS.
