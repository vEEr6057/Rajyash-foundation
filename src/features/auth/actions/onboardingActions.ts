"use server";

import { cookies } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { requireUser, AuthError } from "@/server/auth/session";
import { profilesRepo } from "@/server/db/repositories/profiles";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/features/auth/validations/onboarding";
import { isValidLocale } from "@/i18n/request";
import { logger } from "@/lib/logger";

export type OnboardingResult =
  | { ok: true }
  | { ok: false; code: "UNAUTHORIZED" | "VALIDATION_ERROR" | "SERVER_ERROR"; message: string };

/**
 * completeOnboarding (D-05, AUTH-05).
 * Re-verifies the session inside the action (never trusts the client/middleware),
 * validates input, sets the role + onboardingComplete flag in Clerk metadata, and
 * mirrors the profile into the DB. The client must call user.reload() afterwards so
 * the new JWT claim takes effect.
 */
export async function completeOnboarding(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  let userId: string;
  try {
    ({ userId } = await requireUser());
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, code: "UNAUTHORIZED", message: "You must be signed in." };
    }
    throw e;
  }

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, code: "VALIDATION_ERROR", message: first };
  }
  const { role, name, city, phone: phoneInput } = parsed.data;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress ?? null;
    // v1: phone comes from the onboarding form (unverified). Fall back to any
    // Clerk-held number if present (e.g. future phone-OTP in v2).
    const phone =
      (phoneInput && phoneInput.length > 0 ? phoneInput : null) ??
      user.primaryPhoneNumber?.phoneNumber ??
      null;

    // Never let onboarding DEMOTE an admin. Admins are backend-seeded with
    // onboardingComplete=true so they normally never reach this action, but if one ever
    // does (e.g. the flag wasn't stamped), preserve their admin role instead of
    // overwriting it with the form's donor/volunteer/driver selection.
    const isExistingAdmin = user.publicMetadata?.role === "admin";
    const finalRole = isExistingAdmin ? "admin" : role;

    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: finalRole, onboardingComplete: true },
    });

    // B3: stamp the current UI locale onto the profile so notifications localize.
    const rawLocale = (await cookies()).get("NEXT_LOCALE")?.value;
    const locale = isValidLocale(rawLocale) ? rawLocale : "en";

    await profilesRepo.upsert({
      id: userId,
      name,
      email,
      phone,
      role: finalRole,
      city,
      onboardingComplete: true,
      locale,
    });

    return { ok: true };
  } catch (err) {
    logger.error("completeOnboarding failed", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Please try again.",
    };
  }
}
