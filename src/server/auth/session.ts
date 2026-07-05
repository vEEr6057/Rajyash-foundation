import "server-only";
import { cookies } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { DEFAULT_CITY, type Role } from "@/config/constants";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { isValidLocale } from "@/i18n/request";
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
 * Lazily provisions the DB profile row for a user invited via inviteUser (admin
 * action). Invited users have onboardingComplete: true stamped at invite time, so
 * they skip /onboarding entirely (middleware) and NEVER call completeOnboarding —
 * nothing else would ever create their profile row. This runs on their first authed
 * request instead: it reads the name/phone/city the admin seeded into Clerk
 * publicMetadata (never trusts anything from the invitee) and upserts the profile.
 *
 * MUST be fail-open (mirrors the deactivate check above) — a provisioning error
 * must not 500 an authed request; role still comes from the session claim either way.
 * profilesRepo.upsert is idempotent (onConflict id), so a concurrent-request race
 * between two provisioning attempts is safe.
 */
async function ensureInvitedProfile(userId: string, role: Role): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.publicMetadata as {
      invitedName?: string;
      invitedPhone?: string | null;
      invitedCity?: string;
    };
    const email = user.primaryEmailAddress?.emailAddress ?? null;
    const name =
      meta.invitedName ||
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
      email?.split("@")[0] ||
      "User";
    const phone = meta.invitedPhone ?? user.primaryPhoneNumber?.phoneNumber ?? null;
    const city = meta.invitedCity || DEFAULT_CITY;
    const rawLocale = (await cookies()).get("NEXT_LOCALE")?.value;
    const locale = isValidLocale(rawLocale) ? rawLocale : "en";

    await profilesRepo.upsert({
      id: userId,
      name,
      email,
      phone,
      role,
      city,
      onboardingComplete: true,
      locale,
    });
  } catch (e) {
    logger.error("ensureInvitedProfile failed (fail-open)", {
      userId,
      err: e instanceof Error ? e.message : String(e),
    });
  }
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
    // Admin-invited users skip onboarding (onboardingComplete stamped at invite time),
    // so completeOnboarding never runs for them — provision their profile row here,
    // on first authed request, instead.
    if (
      !profile &&
      sessionClaims?.metadata?.onboardingComplete === true &&
      sessionClaims?.metadata?.role
    ) {
      await ensureInvitedProfile(userId, sessionClaims.metadata.role);
    }
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
