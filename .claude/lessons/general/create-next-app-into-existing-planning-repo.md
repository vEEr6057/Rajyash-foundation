---
id: create-next-app-into-existing-planning-repo
topic: general
severity: medium
status: verified
tags: [scaffold, create-next-app, nextjs, greenfield, tooling]
related-files: [package.json, next.config.ts]
created: 2026-06-25
verified-by: scaffold succeeded + full build green
---

## Symptom
`create-next-app . ` (scaffold in place) fails in a repo that already has GSD `.planning/`,
`.claude/`, `tokens/`, `CLAUDE.md` etc. — create-next-app refuses to run because those dirs
aren't on its allowed-conflict whitelist (only `.git`, `.gitignore`, `README.md`, `docs`,
`LICENSE`, a few others are tolerated). Moving them aside with `mv` to another Desktop/temp
folder also hit Windows `Permission denied` on a dir full of files.

## Root cause
1. create-next-app conflict guard blocks non-whitelisted entries.
2. Bulk `mv` of a directory with many open/locked files across paths fails on Windows.

## Verified fix
Scaffold into a SEPARATE temp dir, then copy the generated files into the repo:
```bash
cd ..  && npx create-next-app@15 rj-scaffold --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*" --no-turbopack --use-pnpm --yes
cp -r rj-scaffold/src rj-scaffold/public <repo>/
cp rj-scaffold/{package.json,pnpm-lock.yaml,tsconfig.json,next.config.ts,next-env.d.ts,postcss.config.mjs,eslint.config.mjs} <repo>/
# keep your own .gitignore/README; then `pnpm install` in the repo root.
```
Temp-dir name cannot start with `_` (npm naming rule → "name cannot start with an underscore").

## Tripwire
- `create-next-app@latest` now installs **Next 16**. Pin `create-next-app@15` if your research/
  adapter (e.g. @opennextjs/cloudflare, Clerk) was validated on 15.
- After copying, merge `.gitignore` (add `.open-next/`, `.dev.vars`, keep `.env*` ignored but
  `!.env.example`). Tags: scaffold, windows-mv-permission, nextjs-version-drift.
