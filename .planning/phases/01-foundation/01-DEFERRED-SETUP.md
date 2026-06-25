# Phase 1 — Deferred Setup (do when you're back)

Everything here needs real accounts/credentials, which we deliberately deferred. The code is
complete and builds; these steps make it actually run + deploy. Order matters.

## 0. Fix git push (blocker)
Local git + `gh` CLI are authed as **`veersh16`**, but the repo is **`vEEr6057/Rajyash-foundation`** → push 403.
Pick one:
- Add `veersh16` as a collaborator on the repo (quickest), **or**
- Re-auth the CLI as `vEEr6057`: `gh auth login` (and/or update the git credential manager).

Then:
```bash
git push -u origin feature/phase-1-foundation
gh pr create --fill   # or open the PR in the browser
```

## 1. Supabase (database) — free tier
1. Create a project at supabase.com (region close to India, e.g. ap-south-1).
2. Get two connection strings (Project Settings → Database):
   - **Pooler** (port 6543, "Transaction") → `DATABASE_URL`
   - **Direct** (port 5432) → `DIRECT_URL`
3. Put both in `.env.local` (and later in Cloudflare Worker env / `.dev.vars`).
4. Push the schema: `pnpm db:push`  (creates the `profiles` table + `role` enum).
   - Migration SQL already generated at `src/server/db/migrations/0000_*.sql`.

## 2. Clerk (auth) — free tier (10k MAU)
1. Create an application at clerk.com. Enable **Email** and **Phone (SMS OTP)** sign-in.
2. Copy keys → `.env.local`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…`
   - `CLERK_SECRET_KEY=sk_test_…`
3. **Custom session claim (REQUIRED)** — Dashboard → Sessions → Edit the session token, add:
   ```json
   { "metadata": "{{user.public_metadata}}" }
   ```
   Without this, `sessionClaims.metadata.role` is empty and RBAC/onboarding gating won't work.
4. To make yourself **admin**: in the Clerk dashboard, edit your user's **public metadata**:
   ```json
   { "role": "admin", "onboardingComplete": true }
   ```
   (Admin is never self-selectable in the app — manual elevation only, by design.)

## 3. Run locally
```bash
# fill .env.local with the real values above, then:
pnpm dev            # http://localhost:3000
```
Sanity E2E (the 5 Phase-1 success criteria):
1. Sign up with email → session persists across refresh.
2. Sign up / sign in with phone OTP.
3. Pick donor/volunteer at onboarding → land on /portal/dashboard.
4. Visit /admin/dashboard as a non-admin → redirected (admin gets 403 via middleware for hard routes).
5. Remove a required var from `.env.local` → `pnpm build` refuses to start.

## 4. Cloudflare (deploy) — free tier, commercial-OK
1. Create a Cloudflare account; `npx wrangler login`.
2. Set Worker secrets (don't commit): `npx wrangler secret put DATABASE_URL` (+ DIRECT_URL, CLERK_SECRET_KEY).
   Public vars (`NEXT_PUBLIC_*`) are inlined at build — set them in the build env.
3. Deploy: `pnpm deploy`  (= `opennextjs-cloudflare build && … deploy`). Free `*.workers.dev` subdomain.
4. Local CF preview: copy `.dev.vars.example` → `.dev.vars`, fill, then `pnpm preview`.

## 5. Razorpay NGO KYC (long lead — start ASAP, no code needed in Phase 1)
Submit the foundation's 12A/80G/PAN/bank docs to Razorpay. 3–5 business days. Blocks Phase 5 (payments).

---
### Also worth chasing in parallel (from the readiness audit)
- Foundation logo + real content (mission copy, accurate impact numbers) + photos.
- Gujarati/Hindi translations (real translator, not machine) — i18n is v1, lands Phase 7.
- Legal: FSSAI obligations + a privacy policy + terms (needed before public launch & Razorpay).
