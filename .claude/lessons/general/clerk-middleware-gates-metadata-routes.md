# Clerk middleware auth-gates /robots.txt & /sitemap.xml

**2026-07-03 · general/MEDIUM/verified**

## Symptom
Shipped `src/app/robots.ts` + `sitemap.ts` (Next metadata routes). `curl /robots.txt`
returned the **app HTML shell** (sign-in page chunks), not the robots text. Same for
`/sitemap.xml`. Silent — the files "exist" and 200, so it looks fine until you read the body.

## Root cause
`clerkMiddleware`'s `config.matcher` excludes common asset extensions
(`css|js|jpe?g|png|svg|webmanifest|…`) but **NOT `.txt` or `.xml`**. So `/robots.txt` and
`/sitemap.xml` run through the middleware, aren't in `isPublicRoute`, hit the
`!userId → redirectToSignIn()` branch, and get served the auth page instead of the
generated metadata file.

## Fix
Add the metadata routes to the public-route allowlist:
```ts
const isPublicRoute = createRouteMatcher([
  "/", "/sign-in(.*)", "/sign-up(.*)", "/staff(.*)",
  "/robots.txt", "/sitemap.xml",   // ← SEO metadata routes, must not be auth-gated
  "/api/inngest(.*)",
]);
```
(Alternatively add `txt|xml` to the matcher's excluded-extension group, but the allowlist
is clearer and keeps security headers applied via `secure()`.)

## Verify
`curl -sSL <site>/robots.txt` must return `User-Agent: *…Sitemap: …`, NOT `<!DOCTYPE html>`.
Same for `/sitemap.xml` (must be `<?xml …>`).

## Applies to
Any Next App-Router app using `clerkMiddleware` (or any middleware with an extension-based
matcher) that also ships `robots.ts`/`sitemap.ts`/other non-image metadata routes.
