"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { requireRole } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { partnersRepo } from "@/server/db/repositories/partners";
import { statusEventsRepo } from "@/server/db/repositories/statusEvents";
import { inngest } from "@/server/inngest/client";
import { buildEventId } from "@/server/notifications/events";
import { logger } from "@/lib/logger";
import {
  ROLES,
  ROUTES,
  NOTIFICATION_EVENTS,
  DEFAULT_CITY,
  type Role,
} from "@/config/constants";
import { partnerSchema, type PartnerInput } from "../validations/partner";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };
function fail<T = unknown>(code: string, message: string): Result<T> {
  return { ok: false, code, message };
}

/** Every admin action's first line (AUTH-05 — middleware is defense-in-depth only). */
async function admin() {
  return requireRole(["admin"]);
}

/**
 * Core atomic assignment step shared by assignPickup (single) and
 * assignPickupsBulk (UX-12) — the SAME per-pickup conditional update
 * (pickupsRepo.assignToVolunteer's WHERE status='requested' guard, zero rows
 * = already taken) + statusEvents recording + best-effort notification.
 * Extracted so bulk assign never becomes a blanket UPDATE — every pickup's
 * outcome is independent, driven through this one path.
 */
async function assignOne(
  pickupId: string,
  driverId: string,
  adminId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const row = await pickupsRepo.assignToVolunteer(pickupId, driverId);
  if (!row) return { ok: false, reason: "Already claimed or assigned." };
  await statusEventsRepo.record({
    pickupId,
    actorId: adminId,
    fromStatus: "requested",
    toStatus: "accepted",
  });
  try {
    await inngest.send({
      name: NOTIFICATION_EVENTS.pickupClaimed,
      data: { pickupId, eventId: buildEventId("claimed", pickupId) },
    });
  } catch (e) {
    logger.error("inngest emit pickup/claimed (admin assign) failed", {
      pickupId,
      err: String(e),
    });
  }
  return { ok: true };
}

/**
 * ADM-02: assign a requested pickup to a chosen DRIVER (mirrors claim + emit).
 * dispatch-model-v2 made the driver the collector role — the picker sources
 * listAssignableDrivers, not volunteers (a volunteer assignee could never
 * advance the pickup afterward: claimPickup/advancePickup/recordPing all gate
 * on role === "driver"). pickupsRepo.assignToVolunteer and the
 * pickup.volunteerId column are unchanged — that column already holds the
 * assigned COLLECTOR's id (a driver, post dispatch-model-v2).
 */
export async function assignPickup(
  pickupId: string,
  driverId: string,
): Promise<Result> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    const assignable = await profilesRepo.listAssignableDrivers();
    if (!assignable.some((d) => d.id === driverId)) {
      return fail("VALIDATION", "Choose an available driver.");
    }
    const res = await assignOne(pickupId, driverId, adminId);
    if (!res.ok) return fail("CONFLICT", res.reason);
    revalidatePath(ROUTES.adminPickups);
    revalidatePath(ROUTES.pickup(pickupId));
    return { ok: true };
  } catch (e) {
    logger.error("assignPickup failed", { pickupId, err: String(e) });
    return fail("SERVER_ERROR", "Could not assign the pickup.");
  }
}

/** Hard cap on a single bulk-assign call — the picker only ever selects rows off one admin page. */
const BULK_ASSIGN_MAX = 100;

/**
 * UX-12: bulk variant of assignPickup — ONE driver validation up front, then
 * each pickup runs through the SAME atomic per-row path as assignPickup
 * (assignOne): its own conditional update + statusEvent + notification.
 * A pickup claimed/assigned by someone else in the meantime fails alone
 * (CONFLICT, isolated in `failed`) — it never aborts the rest of the batch,
 * and there is never a single blanket UPDATE across the selection. Runs
 * sequentially (not Promise.all) to keep load on the pooled DB connection
 * predictable (same reasoning as UX-11's serial-vs-parallel note).
 */
export async function assignPickupsBulk(
  pickupIds: string[],
  driverId: string,
): Promise<
  Result<{ assigned: string[]; failed: { id: string; reason: string }[] }>
> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  if (pickupIds.length === 0) {
    return fail("VALIDATION", "Select at least one pickup.");
  }
  if (pickupIds.length > BULK_ASSIGN_MAX) {
    return fail("VALIDATION", "Select fewer pickups and try again.");
  }
  try {
    const assignable = await profilesRepo.listAssignableDrivers();
    if (!assignable.some((d) => d.id === driverId)) {
      return fail("VALIDATION", "Choose an available driver.");
    }
    const assigned: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of pickupIds) {
      try {
        const res = await assignOne(id, driverId, adminId);
        if (res.ok) assigned.push(id);
        else failed.push({ id, reason: res.reason });
      } catch (e) {
        logger.error("assignPickupsBulk: per-pickup assign failed", {
          id,
          err: String(e),
        });
        failed.push({ id, reason: "Could not assign this pickup." });
      }
    }
    revalidatePath(ROUTES.adminPickups);
    for (const id of assigned) revalidatePath(ROUTES.pickup(id));
    return { ok: true, assigned, failed };
  } catch (e) {
    logger.error("assignPickupsBulk failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not assign the pickups.");
  }
}

/** ADM-03: change a user's role (Clerk = source of truth, mirror to DB). */
export async function setUserRole(
  targetUserId: string,
  role: Role,
): Promise<Result> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  if (adminId === targetUserId)
    return fail("FORBIDDEN", "You can't change your own admin access.");
  if (!ROLES.includes(role)) return fail("VALIDATION", "Invalid role.");
  try {
    // Last-admin guard: block demoting the last active admin to a non-admin role.
    if (role !== "admin") {
      const target = await profilesRepo.getById(targetUserId);
      if (target?.role === "admin") {
        const activeAdmins = await profilesRepo.countActiveAdmins();
        if (activeAdmins <= 1) {
          return fail(
            "CONFLICT",
            "Cannot demote the last active admin. Promote another admin first.",
          );
        }
      }
    }
    // DB mirror FIRST (local, fails fast), then Clerk. If Clerk throws after the DB
    // write the admin gets an error + can retry — no silent role drift (review HIGH-02).
    await profilesRepo.setRole(targetUserId, role);
    const client = await clerkClient();
    await client.users.updateUserMetadata(targetUserId, {
      publicMetadata: { role },
    });
    // The target's session claim lags until their next token refresh (Pitfall P1).
    revalidatePath(ROUTES.adminUsers);
    return { ok: true };
  } catch (e) {
    logger.error("setUserRole failed", { targetUserId, err: String(e) });
    return fail("SERVER_ERROR", "Could not change the role.");
  }
}

const INVITE_PHONE_RE = /^(\+91)?[6-9]\d{9}$/;

/**
 * Invite a new user of ANY role (donor/volunteer/driver/admin — this is the ONE
 * place an admin may be assigned; onboarding never offers it). The admin supplies
 * name + optional phone/city up front. The invitation's publicMetadata carries
 * onboardingComplete: true, so the invited user SKIPS onboarding entirely — on
 * their first sign-in, getSession()'s ensureInvitedProfile lazily provisions their
 * DB profile row from this metadata (see src/server/auth/session.ts). Role stays
 * server-authoritative: it's the admin's validated pick, never anything from the
 * invitee.
 */
export async function inviteUser(
  email: string,
  role: Role,
  name: string,
  phone?: string,
  city?: string,
): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return fail("VALIDATION", "Enter a valid email address.");
  }
  if (!ROLES.includes(role)) return fail("VALIDATION", "Invalid role.");
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    return fail("VALIDATION", "Enter a name between 2 and 80 characters.");
  }
  const trimmedPhone = phone?.trim() ?? "";
  if (trimmedPhone.length > 0 && !INVITE_PHONE_RE.test(trimmedPhone)) {
    return fail("VALIDATION", "Enter a valid 10-digit Indian mobile number.");
  }
  const trimmedCity = city?.trim() || DEFAULT_CITY;
  try {
    const client = await clerkClient();
    // onboardingComplete: true is what makes middleware skip /onboarding for this
    // user entirely. The seeded name/phone/city ride along so ensureInvitedProfile
    // can provision the DB profile on first authed request — no onboarding form.
    await client.invitations.createInvitation({
      emailAddress: trimmed,
      publicMetadata: {
        role,
        onboardingComplete: true,
        invitedName: trimmedName,
        invitedPhone: trimmedPhone.length > 0 ? trimmedPhone : null,
        invitedCity: trimmedCity,
      },
      ignoreExisting: true,
    });
    return { ok: true };
  } catch (e) {
    logger.error("inviteUser failed", { email: trimmed, role, err: String(e) });
    return fail("SERVER_ERROR", "Could not send the invitation.");
  }
}

/** ADM-03: soft-deactivate (getSession blocks immediately) + best-effort Clerk ban. */
export async function deactivateUser(targetUserId: string): Promise<Result> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  if (adminId === targetUserId)
    return fail("FORBIDDEN", "You can't deactivate your own account.");
  try {
    // Last-admin guard: block deactivating the last active admin.
    const target = await profilesRepo.getById(targetUserId);
    if (target?.role === "admin") {
      const activeAdmins = await profilesRepo.countActiveAdmins();
      if (activeAdmins <= 1) {
        return fail(
          "CONFLICT",
          "Cannot deactivate the last active admin. Promote another admin first.",
        );
      }
    }
    await profilesRepo.deactivate(targetUserId);
    try {
      const client = await clerkClient();
      await client.users.banUser(targetUserId); // revokes sessions now; soft flag is the guarantee
    } catch (e) {
      logger.error("banUser failed (soft-deactivate still applied)", {
        targetUserId,
        err: String(e),
      });
    }
    revalidatePath(ROUTES.adminUsers);
    return { ok: true };
  } catch (e) {
    logger.error("deactivateUser failed", { targetUserId, err: String(e) });
    return fail("SERVER_ERROR", "Could not deactivate the user.");
  }
}

/** ADM-03: reactivate — clear the soft flag + best-effort unban. */
export async function reactivateUser(targetUserId: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    await profilesRepo.reactivate(targetUserId);
    try {
      const client = await clerkClient();
      await client.users.unbanUser(targetUserId);
    } catch (e) {
      logger.error("unbanUser failed (reactivation still applied)", {
        targetUserId,
        err: String(e),
      });
    }
    revalidatePath(ROUTES.adminUsers);
    return { ok: true };
  } catch (e) {
    logger.error("reactivateUser failed", { targetUserId, err: String(e) });
    return fail("SERVER_ERROR", "Could not reactivate the user.");
  }
}

/** ADM-04: link (or unlink) a donor user to a partner org. */
export async function setUserPartner(
  targetUserId: string,
  partnerId: string | null,
): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    await profilesRepo.setPartner(targetUserId, partnerId);
    revalidatePath(ROUTES.adminUsers);
    revalidatePath(ROUTES.adminPartners);
    return { ok: true };
  } catch (e) {
    logger.error("setUserPartner failed", { targetUserId, err: String(e) });
    return fail("SERVER_ERROR", "Could not link the partner.");
  }
}

function partnerFields(d: PartnerInput) {
  return {
    name: d.name,
    type: d.type,
    contactName: d.contactName || null,
    contactPhone: d.contactPhone || null,
    contactEmail: d.contactEmail || null,
    address: d.address || null,
    city: d.city || undefined, // undefined -> schema default "Ahmedabad"
  };
}

/** ADM-04: create a partner org. */
export async function createPartner(
  input: PartnerInput,
): Promise<Result<{ id: string }>> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = partnerSchema.safeParse(input);
  if (!parsed.success)
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const row = await partnersRepo.create(partnerFields(parsed.data));
    revalidatePath(ROUTES.adminPartners);
    return { ok: true, id: row.id };
  } catch (e) {
    logger.error("createPartner failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not create the partner.");
  }
}

/** ADM-04: edit a partner org. */
export async function updatePartner(
  id: string,
  input: PartnerInput,
): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = partnerSchema.safeParse(input);
  if (!parsed.success)
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  try {
    const row = await partnersRepo.update(id, partnerFields(parsed.data));
    if (!row) return fail("NOT_FOUND", "Partner not found.");
    revalidatePath(ROUTES.adminPartners);
    return { ok: true };
  } catch (e) {
    logger.error("updatePartner failed", { id, err: String(e) });
    return fail("SERVER_ERROR", "Could not update the partner.");
  }
}

/** ADM-04: delete a partner org. */
export async function deletePartner(id: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    await partnersRepo.delete(id);
    revalidatePath(ROUTES.adminPartners);
    return { ok: true };
  } catch (e) {
    const msg = String(e);
    // A linked donor (profiles.partnerId FK) OR a past run stop (run_stops.partnerId FK),
    // both no-action, blocks the delete — guide the admin.
    if (
      msg.includes("23503") ||
      msg.includes("foreign key") ||
      msg.includes("violates")
    ) {
      return fail(
        "CONFLICT",
        "This partner is linked to donors or past run stops — remove those links first.",
      );
    }
    logger.error("deletePartner failed", { id, err: msg });
    return fail("SERVER_ERROR", "Could not delete the partner.");
  }
}
