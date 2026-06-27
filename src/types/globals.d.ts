import type { Role } from "@/config/constants";

/**
 * Clerk custom session-claim shape. The Clerk Dashboard must project
 * publicMetadata into the JWT via a custom session claim:
 *   { "metadata": "{{user.public_metadata}}" }
 * (manual setup — see 01-07-PLAN.md). Read in middleware/server actions as
 * `sessionClaims?.metadata?.role`.
 */
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: Role;
      onboardingComplete?: boolean;
    };
  }
}

export {};
