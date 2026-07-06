# Security Policy

Food Porter handles donor, volunteer, and recipient personal data, plus online donations.
We take reports seriously and act on them quickly.

## Reporting a vulnerability

**Please do NOT open a public GitHub issue for security problems.**

Email **rajyashfoundation@rajyashgroup.com** with subject line `SECURITY: <short summary>`.
Include: what you found, where (URL/endpoint/file), steps to reproduce, and impact as you
understand it. You'll get an acknowledgement within 72 hours.

If the report involves donation/payment flows, please also avoid testing with real money —
describe the issue instead of exploiting it.

## Scope

- This repository and the deployed app (rajyashfoundation.com and its `*.workers.dev` preview).
- Out of scope: third-party platforms themselves (Clerk, Supabase, Razorpay, Cloudflare),
  volumetric denial-of-service, and social engineering of foundation staff.

## What to expect

- Acknowledgement ≤ 72 hours; assessment and fix timeline communicated after triage.
- HIGH-severity findings block releases per our internal policy.
- We're a small NGO with no bug-bounty budget — but we will credit reporters in the release
  notes if wanted.
