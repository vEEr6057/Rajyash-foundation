---
id: clerk-redirect-env-vars-deprecated
topic: auth
severity: low
status: verified
tags: [clerk, redirect, env, sign-up, onboarding, nextjs]
related-files: [src/app/sign-up/[[...sign-up]]/page.tsx, src/app/sign-in/[[...sign-in]]/page.tsx]
created: 2026-06-26
verified-by: Playwright E2E — fresh signup landed on /onboarding after the fix
---

## Symptom
After sign-up, Clerk redirected to `/` instead of the configured `/onboarding`, even though
`NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding` was set. (App still worked — the middleware
onboarding-gate funnelled the user to /onboarding — but with an extra hop.)

## Root cause
Clerk (v6/v7) **deprecated** the `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` / `_AFTER_SIGN_UP_URL`
env var names. They're ignored now; Clerk falls back to `/`. The current names are
`NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` / `_SIGN_UP_FORCE_REDIRECT_URL` (or the
`_FALLBACK_REDIRECT_URL` variants).

## Verified fix
Set the redirect explicitly on the components (env-name-independent, unambiguous):
```tsx
<SignUp forceRedirectUrl="/onboarding" signInUrl="/sign-in" />
<SignIn forceRedirectUrl="/portal/dashboard" signUpUrl="/sign-up" />
```
(Or rename the env vars to the FORCE_REDIRECT_URL form — but the prop is clearest.)

## Tripwire
Don't trust `AFTER_SIGN_*_URL` env names with Clerk v6+. Prefer `forceRedirectUrl` props.
Tags: clerk-redirect, after-sign-up, force-redirect.
