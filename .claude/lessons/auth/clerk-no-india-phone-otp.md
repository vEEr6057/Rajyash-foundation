---
id: clerk-no-india-phone-otp
topic: auth
severity: high
status: verified
tags: [clerk, otp, sms, india, dlt, phone-auth, free-tier]
related-files: [src/features/auth/validations/onboarding.ts, .planning/REQUIREMENTS.md]
created: 2026-06-26
verified-by: live Clerk signup returned the error; web research confirmed
---

## Symptom
Clerk phone/SMS OTP signup with an Indian (+91) number errors:
> "Phone numbers from this country (India) are currently not supported. For more information, please contact support."

The Phase-1 research had assumed Clerk handles India phone OTP "through its own infrastructure,
avoiding DLT." **That assumption is wrong** — Clerk does not deliver OTP SMS to Indian numbers.

## Root cause
India SMS is heavily regulated (TRAI DLT). Clerk's bundled SMS does not support Indian numbers.
More broadly: **no truly free production SMS OTP exists for India** — every provider charges per SMS,
and most require DLT registration (7–14 day lead). Firebase Phone Auth charges per SMS too (free tier =
10/day, test numbers only) and has poor DND delivery in India.

## Verified fix / decision
For a zero-budget v1: **drop phone OTP, use email + Google OAuth** (both free, work in India, no SMS,
no DND issues — Google login has huge India reach). Collect phone as an OPTIONAL, UNVERIFIED field at
onboarding. Clerk auth UI follows the dashboard config — disable Phone, enable Email + Google in the
Clerk dashboard; no app-code change needed for the auth screens (we use Clerk prebuilt components).

## Tripwire / when you DO add phone OTP later
Use **Fast2SMS** (sends OTP **without DLT registration**, ₹0.11–0.35/SMS) or **2Factor** as a Clerk
**custom SMS provider** — instant setup, no 7–14 day DLT wait. Do NOT default to MSG91 for *auth* OTP
(it needs DLT); keep MSG91 for the later status-notification SMS where templates are pre-registered.
Tags: india-sms, no-free-otp, fast2sms-no-dlt, google-oauth-fallback.
