---
id: stale-next-after-opennext-build
topic: general
severity: medium
status: verified
tags: [nextjs, dev-server, opennext, cloudflare, build-cache, vendor-chunks]
related-files: [package.json]
created: 2026-06-26
verified-by: rm -rf .next fixed it
---

## Symptom
`pnpm dev` throws at runtime:
> Cannot find module './vendor-chunks/@clerk+nextjs@7.5.8_...js'
> Require stack: .next/server/webpack-runtime.js → .next/server/app/.../page.js

Next.js 15 (Webpack). Happens right after running a production build.

## Root cause
`pnpm run deploy` (= `opennextjs-cloudflare build` → `next build`) writes a **production** `.next/`.
Then `pnpm dev` reuses that same `.next/` and its webpack chunk manifest references vendor chunks
that the dev compiler hasn't produced (or named differently) → module-not-found. Dev and prod share
the `.next` dir and their chunk layouts don't match.

## Verified fix
```bash
rm -rf .next   # stop the dev server first if it's holding the dir
pnpm dev
```

## Tripwire
After ANY `pnpm run deploy` (or `opennextjs-cloudflare build` / `next build`), clear `.next` before
`pnpm dev`. Don't interleave deploy and dev without the wipe. (Also `.open-next` can get held by a
leftover `workerd.exe` on Windows — kill it before re-deploying.) Tags: next-dev, stale-cache, opennext-windows.

## Addendum (2026-07-07): the service-worker variant
The Serwist SW registered during a `pnpm start` prod-build session PERSISTS in the browser for
localhost and precaches that build's chunk URLs. The user's next `pnpm dev` then 404s every
precached chunk → `bad-precaching-response` + ChunkLoadError → "Application error: client-side
exception" that looks like an auth/Clerk failure. Fix: DevTools → Application → Clear site data
(unregisters SW), plus `rm -rf .next`. And: an agent that runs `pnpm start` for E2E must KILL
that server before handing localhost back — the user's dev workflow inherits the port AND the
poisoned SW otherwise (bit us: user "why cant i login via clerk on local?").
