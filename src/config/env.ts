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
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
