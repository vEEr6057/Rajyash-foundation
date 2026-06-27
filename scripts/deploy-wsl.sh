#!/usr/bin/env bash
#
# Local deploy for Windows machines, via WSL.
#
# The opennext build MUST run on Linux — a Windows build leaves Next's middleware require
# unpatched and the live Worker 500s ("Dynamic require of middleware-manifest.json").
# See .claude/lessons/general/opennext-windows-build-middleware-500.md.
#
# This script (run from Git Bash on Windows):
#   1. builds the .open-next bundle inside WSL (Linux),
#   2. copies it back to this repo,
#   3. deploys it with the Windows wrangler (which holds your Cloudflare OAuth login).
#
# Prereqs: WSL Ubuntu with node 20+, a Cloudflare-logged-in Windows wrangler (`npx wrangler login`),
# and a populated .env.local (the build inlines NEXT_PUBLIC_* + reads it).
#
# Prefer the GitHub Actions workflow (.github/workflows/deploy.yml) for normal deploys; use this for
# one-off local pushes.

set -euo pipefail

GITBASH_ROOT="$(cd "$(dirname "$0")/.." && pwd)" # e.g. /c/Users/you/Desktop/Rajyash-Foundation
WSL_ROOT="/mnt${GITBASH_ROOT}"                   # Git Bash gives /c/... -> WSL /mnt/c/...
PNPM_VER="10.33.2"

echo "==> repo (WSL path): ${WSL_ROOT}"
echo "==> building the bundle inside WSL (Linux)..."

wsl.exe bash <<WSLSCRIPT
set -euo pipefail
cd "${WSL_ROOT}"
test -f .env.local || { echo "ERROR: .env.local is required (build inlines NEXT_PUBLIC_* + validates env)"; exit 1; }
rm -rf ~/rajyash && mkdir -p ~/rajyash
git archive HEAD | tar -x -C ~/rajyash
cp .env.local ~/rajyash/
cd ~/rajyash
corepack prepare "pnpm@${PNPM_VER}" --activate
pnpm install --frozen-lockfile
pnpm exec opennextjs-cloudflare build
rm -rf "${WSL_ROOT}/.open-next"
cp -r ~/rajyash/.open-next "${WSL_ROOT}/.open-next"
echo "WSL build OK"
WSLSCRIPT

echo "==> deploying the Linux-built bundle from Windows wrangler..."
# wrangler deploy (NOT `pnpm run deploy`, which would rebuild on Windows and re-break it)
npx wrangler deploy

echo "==> done. https://rajyash-food-rescue.shahveerkeaten.workers.dev"
