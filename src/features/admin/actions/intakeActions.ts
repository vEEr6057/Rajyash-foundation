"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { partnersRepo } from "@/server/db/repositories/partners";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/config/constants";
import {
  pickupFormSchema,
  type PickupFormInput,
} from "@/features/pickups";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };
function fail<T = unknown>(code: string, message: string): Result<T> {
  return { ok: false, code, message };
}
async function admin() {
  return requireRole(["admin"]);
}

/**
 * INT-02: coordinator logs surplus on behalf of a restaurant partner.
 * donorId = the admin's own userId (the "logger"); partnerId = the chosen partner.
 * safetyAttested is set to true by the coordinator on behalf of the restaurant.
 */
export async function logSurplus(
  partnerId: string,
  input: PickupFormInput,
): Promise<Result<{ id: string }>> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  if (!partnerId) return fail("VALIDATION", "Choose a partner restaurant.");
  const partner = await partnersRepo.getById(partnerId);
  if (!partner) return fail("VALIDATION", "Partner not found.");

  const parsed = pickupFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const d = parsed.data;
  try {
    const row = await pickupsRepo.create({
      donorId: adminId, // coordinator is the "logger"
      partnerId,
      category: d.category,
      description: d.description || null,
      quantity: d.quantity,
      quantityUnit: d.quantityUnit,
      windowStart: d.windowStart,
      windowEnd: d.windowEnd,
      address: d.address,
      lat: d.lat,
      lng: d.lng,
      safetyAttested: true, // coordinator attests on restaurant's behalf
      foodPhotoPath: d.foodPhotoPath || null,
      googleMapsUrl: d.googleMapsUrl || null,
      status: "requested",
    });
    revalidatePath(ROUTES.adminPickups);
    return { ok: true, id: row.id };
  } catch (e) {
    logger.error("logSurplus failed", { adminId, partnerId, err: String(e) });
    return fail("SERVER_ERROR", "Could not log the surplus.");
  }
}

/**
 * INT-03: coordinator marks a pickup as verified (optional, never blocks a run).
 */
export async function verifyPickup(id: string): Promise<Result> {
  let adminId: string;
  try {
    ({ userId: adminId } = await admin());
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    const row = await pickupsRepo.verify(id, adminId);
    if (!row) return fail("NOT_FOUND", "Pickup not found.");
    revalidatePath(ROUTES.pickup(id));
    revalidatePath(ROUTES.adminPickups);
    return { ok: true };
  } catch (e) {
    logger.error("verifyPickup failed", { id, err: String(e) });
    return fail("SERVER_ERROR", "Could not verify the pickup.");
  }
}

/**
 * INT-03: coordinator clears the verified flag.
 */
export async function unverifyPickup(id: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    const row = await pickupsRepo.unverify(id);
    if (!row) return fail("NOT_FOUND", "Pickup not found.");
    revalidatePath(ROUTES.pickup(id));
    revalidatePath(ROUTES.adminPickups);
    return { ok: true };
  } catch (e) {
    logger.error("unverifyPickup failed", { id, err: String(e) });
    return fail("SERVER_ERROR", "Could not unverify the pickup.");
  }
}
