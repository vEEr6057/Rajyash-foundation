import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Boot-time environment validation (D-06 / AUTH-06).
 * Imported in next.config.ts so the app refuses to build/start when a required
 * var is missing or malformed. Set SKIP_ENV_VALIDATION=1 only for lint/CI steps
 * that don't need real values.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1).startsWith("sk_"),
    // Supabase Storage (Phase 2) — service-role key, server-only. Used to issue
    // signed upload/download URLs. Real values are a deferred touchpoint.
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default("pickups"),
    // Notifications (Phase 4) — async jobs (Inngest), email (Resend), web push (VAPID).
    // All server-only; boot-validated so the app fails fast rather than silently
    // dropping notifications. Inngest keys already live in .env.local.
    INNGEST_EVENT_KEY: z.string().min(1),
    INNGEST_SIGNING_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    // Email sender. Defaults to Resend's free test sender (only delivers to your own
    // Resend-account email). To go live, set this to a verified-domain address, e.g.
    // "Rajyash Food Rescue <rescue@notify.rajyashgroup.com>" — no code change/redeploy needed.
    RESEND_FROM: z
      .string()
      .min(1)
      .default("Rajyash Food Rescue <onboarding@resend.dev>"),
    VAPID_PUBLIC_KEY: z.string().min(1),
    VAPID_PRIVATE_KEY: z.string().min(1),
    VAPID_SUBJECT: z.string().min(1), // e.g. "mailto:rajyashfoundation@rajyashgroup.com"
    // ── Payments / Razorpay donation scaffold (Phase 5, PAY-01..04) ────────────
    // Master switch. The ENTIRE payments surface (the /donate page, the
    // createDonationOrder action, the webhook route) is dark until this is truthy.
    // Explicit-truthy parse (NOT z.coerce.boolean — that treats the string "false" as
    // TRUE, an unsafe footgun for a payment kill-switch): enables ONLY on "1" or "true".
    // UNSET / "false" / "0" / "" / anything-else all → false. To LIGHT IT UP set
    // PAYMENTS_ENABLED=1 (see docs/backend/RAZORPAY-SCAFFOLD-SPEC.md go-live steps).
    PAYMENTS_ENABLED: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true"),
    // Razorpay credentials are OPTIONAL — only read when PAYMENTS_ENABLED is on, so
    // the app boots fine with them unset (KYC not cleared, no live keys yet).
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    // ── Kill switches (production-discipline §3) ────────────────────────────────
    // Default ON (opposite of PAYMENTS_ENABLED, which is dark-by-default): unset or
    // anything except an explicit "0"/"false" keeps the feature running. Flip via
    // `wrangler secret put` — applies to the live Worker without a redeploy.
    // NOTIFICATIONS_ENABLED=0 → the dispatch layer no-ops (all channels, one choke point).
    NOTIFICATIONS_ENABLED: z
      .string()
      .optional()
      .transform((v) => !(v === "0" || v === "false")),
    // INTAKE_ENABLED=0 → new pickup requests are paused; existing ones keep flowing.
    INTAKE_ENABLED: z
      .string()
      .optional()
      .transform((v) => !(v === "0" || v === "false")),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).startsWith("pk_"),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().startsWith("/"),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().startsWith("/"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().startsWith("/"),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().startsWith("/"),
    // Supabase browser client for Live Tracking (Phase 3). PUBLIC by design: the
    // anon/publishable key grants nothing on its own — RLS + a valid Clerk token
    // gate every read. Same project URL as the server-only SUPABASE_URL.
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // VAPID *public* key (Phase 4) — safe in the browser; it's the applicationServerKey
    // the service worker's pushManager.subscribe() needs. Private key stays server-only.
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
    // Cloudflare Web Analytics beacon token (B5) — OPTIONAL. Cookieless, free. When
    // unset the beacon is not rendered. Owner creates the Web Analytics site in the
    // CF dashboard and sets this as a build-time var in the GitHub Action.
    NEXT_PUBLIC_CF_BEACON_TOKEN: z.string().optional(),
    // Payments (Phase 5) — client mirror of the master switch: gates the donate
    // CTA/link and the /donate entry point in the browser. Same explicit-truthy parse
    // as the server PAYMENTS_ENABLED (enables ONLY on "1"/"true"; "false"/"0"/unset →
    // false). Keep the two in lock-step.
    NEXT_PUBLIC_PAYMENTS_ENABLED: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true"),
    // Razorpay *public* key id — safe in the browser (the Checkout widget needs it).
    // OPTIONAL: only read when the flag is on; the secret + webhook secret stay server-only.
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
  },
  // Next.js inlines NEXT_PUBLIC_* at build time, so they must be listed explicitly.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
      process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_CF_BEACON_TOKEN: process.env.NEXT_PUBLIC_CF_BEACON_TOKEN,
    NEXT_PUBLIC_PAYMENTS_ENABLED: process.env.NEXT_PUBLIC_PAYMENTS_ENABLED,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
