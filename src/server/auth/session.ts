import "server-only";
import { auth } from "@clerk/nextjs/server";
import type { Role } from "@/config/constants";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { logger } from "@/lib/logger";

export class AuthError extends Error {
  constructor(public code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

export interface SessionInfo {
  userId: string;
  role: Role | undefined;
  onboardingComplete: boolean;
}

/**
 * Reads the current Clerk session + projected metadata claims.
 * Returns null when unauthenticated. Pure read — does not throw.
 */
export async function getSession(): Promise<SessionInfo | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  // D-05: a soft-deactivated user is treated as signed-out (immediate, per-request —
  // does not wait on Clerk's token refresh). banUser (admin action) revokes the token too.
  try {
    const profile = await profilesRepo.getById(userId);
    if (profile?.deactivatedAt) return null;
  } catch (e) {
    // Fail OPEN on a DB blip — a transient error must not 500 every authed request.
    // Soft-deactivate is best-effort here; banUser still revokes the token Clerk-side.
    logger.error("getSession profile read failed", { userId, err: String(e) });
  }
  return {
    userId,
    role: sessionClaims?.metadata?.role,
    onboardingComplete: sessionClaims?.metadata?.onboardingComplete ?? false,
  };
}

/**
 * Server-action / route guard (AUTH-04, AUTH-05). MUST be the first line of any
 * server action or protected server component that needs a role — never trust
 * middleware alone (defence in depth; middleware can be bypassed — CVE-2025-29927).
 *
 * @throws AuthError('UNAUTHORIZED') when not signed in.
 * @throws AuthError('FORBIDDEN') when the session role is not in `allowedRoles`.
 */
export async function requireRole(
  allowedRoles: readonly Role[],
): Promise<{ userId: string; role: Role }> {
  const session = await getSession();
  if (!session) throw new AuthError("UNAUTHORIZED");
  if (!session.role || !allowedRoles.includes(session.role)) {
    throw new AuthError("FORBIDDEN");
  }
  return { userId: session.userId, role: session.role };
}

/** Require an authenticated user (any/no role) — e.g. the onboarding action. */
export async function requireUser(): Promise<{ userId: string }> {
  const session = await getSession();
  if (!session) throw new AuthError("UNAUTHORIZED");
  return { userId: session.userId };
}
