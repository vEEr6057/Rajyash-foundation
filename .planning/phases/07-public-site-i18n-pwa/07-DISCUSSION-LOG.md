# Phase 7: Public Site + i18n + PWA — Discussion Log

**Date:** 2026-06-27
*Human-reference audit log. Not consumed by downstream agents (see 07-CONTEXT.md for locked decisions).*

## Areas discussed (batched, 4 decisions)

### 1. Landing page design source
- Options: build from locked tokens · **design in claude.ai/design + import**.
- **Selected:** design in claude.ai/design + import.
- Note: user requested the claude.ai/design prompt immediately → will design in parallel. Build
  proceeds on scaffold + everything else; imported design slots in. Falls back to token-based
  baseline if export not ready at build time.

### 2. i18n locale routing (next-intl)
- Options: **cookie, no URL prefix** · URL-prefixed /en /gu /hi.
- **Selected:** cookie, no URL prefix ("without i18n routing" mode). Composes with Clerk
  middleware, no route refactor. URL-prefixed locales noted as v2 (SEO).

### 3. Gujarati + Hindi translation sourcing (zero budget)
- Options: **machine-draft now, flag for review** · EN catalog now/GU+HI stubbed · user provides professional.
- **Selected:** machine-draft GU/HI now (Claude generates), `review-pending` marker for foundation
  review. Covers all UI (public + portal + admin).

### 4. PWA depth
- Options: minimal manifest + install · **full offline precache**.
- **Selected:** full offline precache via Serwist. Flagged opennext/Cloudflare build risk +
  contingency (fall back to minimal + extend existing push SW, document) per the blocker rule.

## Deferred / noted
- Design-import touchpoint; Serwist fallback; URL-prefixed-locale SEO (v2); PUB-05 blog (v2);
  monetary donation (Phase 5 parked) → donate CTA = placeholder; human polish of machine GU/HI.

## Claude's discretion
- Message-catalog layout, volunteer-signup wiring, counter cache TTL, Serwist config, icons.
