"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth/session";
import { destinationsRepo } from "@/server/db/repositories/destinations";
import { logger } from "@/lib/logger";
import { ROUTES } from "@/config/constants";
import { destinationSchema, type DestinationInput } from "../validations/destination";

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

/** DEST-01: create a saved drop-off destination (admin only). */
export async function createDestination(
  input: DestinationInput,
): Promise<Result<{ id: string }>> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = destinationSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const d = parsed.data;
  try {
    const row = await destinationsRepo.create({
      name: d.name,
      area: d.area || null,
      lat: d.lat,
      lng: d.lng,
      city: d.city || undefined,
      active: d.active ?? true,
    });
    revalidatePath(ROUTES.adminDestinations);
    return { ok: true, id: row.id };
  } catch (e) {
    logger.error("createDestination failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not create the destination.");
  }
}

/** DEST-01: edit a saved destination (admin only). */
export async function updateDestination(
  id: string,
  input: DestinationInput,
): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  const parsed = destinationSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const d = parsed.data;
  try {
    const row = await destinationsRepo.update(id, {
      name: d.name,
      area: d.area || null,
      lat: d.lat,
      lng: d.lng,
      city: d.city || undefined,
      active: d.active ?? true,
    });
    if (!row) return fail("NOT_FOUND", "Destination not found.");
    revalidatePath(ROUTES.adminDestinations);
    return { ok: true };
  } catch (e) {
    logger.error("updateDestination failed", { id, err: String(e) });
    return fail("SERVER_ERROR", "Could not update the destination.");
  }
}

/** DEST-01: delete a saved destination (admin only). */
export async function deleteDestination(id: string): Promise<Result> {
  try {
    await admin();
  } catch {
    return fail("FORBIDDEN", "Admins only.");
  }
  try {
    await destinationsRepo.delete(id);
    revalidatePath(ROUTES.adminDestinations);
    return { ok: true };
  } catch (e) {
    logger.error("deleteDestination failed", { id, err: String(e) });
    return fail("SERVER_ERROR", "Could not delete the destination.");
  }
}

/**
 * Geocode an address for the destination form (admin only). geocoding.ts is
 * `server-only`, so the client form reaches it through this action, never directly.
 */
export async function geocodeDestinationAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    await admin();
  } catch {
    return null;
  }
  const { geocodeAddress } = await import("@/lib/geocoding");
  const result = await geocodeAddress(address);
  if (!result) return null;
  return { lat: result.lat, lng: result.lng };
}
