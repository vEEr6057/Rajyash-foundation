# Deploying

Live: **https://rajyash-food-rescue.shahveerkeaten.workers.dev** (Cloudflare Workers, via `@opennextjs/cloudflare`).

## ⚠️ The build MUST run on Linux

A **Windows** opennext build leaves Next's middleware require unpatched, so the deployed Worker
returns `500 — Dynamic require of "/.next/server/middleware-manifest.json"`. Always build on Linux
(GitHub Actions or WSL). Details: `.claude/lessons/general/opennext-windows-build-middleware-500.md`.

## Recommended: GitHub Actions (free, automatic)

`.github/workflows/deploy.yml` builds on `ubuntu-latest` and deploys on every push to `main`
(and via "Run workflow"). Free + unlimited on this public repo.

**One-time setup — add repo secrets** (GitHub → repo → Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create → template **"Edit Cloudflare Workers"** (scope it to this account). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from `.env.local` (`pk_...`) |
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from `.env.local` |

These `NEXT_PUBLIC_*` are inlined into the client bundle at build time (public by design). The
account ID + non-secret route paths are hard-coded in the workflow.

## Runtime secrets (set once, persist across deploys)

Server-only env vars are **Worker secrets**, not in the bundle. They're already set; to change/re-add:

```bash
echo "<value>" | npx wrangler secret put DATABASE_URL
# also: DIRECT_URL, CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET,
#       INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY, RESEND_API_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
```
`wrangler deploy` preserves existing secrets. (RESEND_API_KEY is still a placeholder — email won't
send until a real key + verified domain.)

## Local deploy (Windows + WSL)

For a one-off manual deploy without CI:

```bash
pnpm deploy:wsl     # builds in WSL (Linux), copies .open-next back, deploys via Windows wrangler
```

Needs: WSL Ubuntu (node 20+), `npx wrangler login` done on Windows, populated `.env.local`.
Do **not** run `pnpm run deploy` on Windows directly — it rebuilds on Windows and 500s.

## Custom domain (later)

`*.workers.dev` is the free subdomain. To use a real domain: add it to Cloudflare, then Worker →
Settings → Domains & Routes → Add Custom Domain. The account `workers.dev` subdomain
(`shahveerkeaten`) is changed in the dashboard: Workers & Pages → Account details → Subdomain.
