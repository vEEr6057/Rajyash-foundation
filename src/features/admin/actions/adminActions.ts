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

/** ADM-02: assign a requested pickup to a chosen volunteer (mirrors claim + emit). */
export async function assignPickup(
  pickupId: string,
  volunteerId: string,
): Promise<Result> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    const assignable = await profilesRepo.listAssignableVolunteers();
    if (!assignable.some((v) => v.id === volunteerId)) {
      return fail("VALIDATION", "Choose an available volunteer.");
    }
    const row = await pickupsRepo.assignToVolunteer(pickupId, volunteerId);
    if (!row) return fail("CONFLICT", "Already claimed or assigned.");
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
    revalidatePath(ROUTES.adminPickups);
    revalidatePath(ROUTES.pickup(pickupId));
    return { ok: true };
  } catch (e) {
    logger.error("assignPickup failed", { pickupId, err: String(e) });
    return fail("SERVER_ERROR", "Could not assign the pickup.");
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
    // A linked donor (profiles.partnerId FK, no-action) blocks the delete — guide the admin.
    if (
      msg.includes("23503") ||
      msg.includes("foreign key") ||
      msg.includes("violates")
    ) {
      return fail("CONFLICT", "Unlink all donors from this partner first.");
    }
    logger.error("deletePartner failed", { id, err: msg });
    return fail("SERVER_ERROR", "Could not delete the partner.");
  }
}
