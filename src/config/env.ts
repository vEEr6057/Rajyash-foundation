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
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
