"use server";

import { revalidatePath } from "next/cache";
import { requireRole, AuthError } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { statusEventsRepo } from "@/server/db/repositories/statusEvents";
import { createSignedUpload } from "@/lib/storage";
import { geocodeAddress } from "@/lib/geocoding";
import { logger } from "@/lib/logger";
import { ROUTES, type PickupStatus } from "@/config/constants";
import {
  pickupFormSchema,
  type PickupFormInput,
} from "@/features/pickups/validations/pickup";
import {
  canTransition,
  nextStatus,
  isDeliveringTransition,
} from "@/features/pickups/lib/statusMachine";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };

function fail<T = unknown>(code: string, message: string): Result<T> {
  return { ok: false, code, message };
}

async function donor() {
  return requireRole(["donor"]);
}
async function volunteer() {
  return requireRole(["volunteer"]);
}

function revalidatePickups(id?: string) {
  revalidatePath(ROUTES.donorPickups);
  revalidatePath(ROUTES.volunteerBoard);
  revalidatePath(ROUTES.volunteerBoardMap);
  if (id) revalidatePath(ROUTES.pickup(id));
}

/** Geocode an address for the create form (auth required). */
export async function geocodePickupAddress(
  address: string,
): Promise<Result<{ lat: number; lng: number; displayName: string }>> {
  try {
    await requireRole(["donor", "volunteer", "admin"]);
  } catch {
    return fail("UNAUTHORIZED", "Sign in first.");
  }
  const r = await geocodeAddress(address);
  if (!r) return fail("NOT_FOUND", "Couldn't find that address — drag the pin instead.");
  return { ok: true, ...r };
}

/** Mint a signed upload URL for a food (donor) or proof (volunteer) photo. */
export async function requestPhotoUpload(
  kind: "food" | "proof",
): Promise<Result<{ path: string; signedUrl: string; token: string }>> {
  try {
    const { userId } = await requireRole(["donor", "volunteer", "admin"]);
    const path = `${kind}/${userId}/${crypto.randomUUID()}.jpg`;
    const up = await createSignedUpload(path);
    return { ok: true, ...up };
  } catch (e) {
    if (e instanceof AuthError) return fail("UNAUTHORIZED", "Sign in first.");
    logger.error("requestPhotoUpload failed", { err: String(e) });
    return fail("SERVER_ERROR", "Upload could not be prepared.");
  }
}

/** DON-01..03: create a pickup request. */
export async function createPickup(
  input: PickupFormInput,
): Promise<Result<{ id: string }>> {
  let userId: string;
  try {
    ({ userId } = await donor());
  } catch {
    return fail("FORBIDDEN", "Only donors can post pickups.");
  }
  const parsed = pickupFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const d = parsed.data;
  try {
    const row = await pickupsRepo.create({
      donorId: userId,
      category: d.category,
      description: d.description || null,
      quantity: d.quantity,
      quantityUnit: d.quantityUnit,
      windowStart: d.windowStart,
      windowEnd: d.windowEnd,
      address: d.address,
      lat: d.lat,
      lng: d.lng,
      safetyAttested: true,
      foodPhotoPath: d.foodPhotoPath || null,
      status: "requested",
    });
    revalidatePickups(row.id);
    return { ok: true, id: row.id };
  } catch (e) {
    logger.error("createPickup failed", { userId, err: String(e) });
    return fail("SERVER_ERROR", "Could not create the request.");
  }
}

/** DON-05: edit while still requested (owner only). */
export async function updatePickup(
  id: string,
  input: PickupFormInput,
): Promise<Result> {
  let userId: string;
  try {
    ({ userId } = await donor());
  } catch {
    return fail("FORBIDDEN", "Only donors can edit pickups.");
  }
  const parsed = pickupFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const d = parsed.data;
  const row = await pickupsRepo.updateIfRequested(id, userId, {
    category: d.category,
    description: d.description || null,
    quantity: d.quantity,
    quantityUnit: d.quantityUnit,
    windowStart: d.windowStart,
    windowEnd: d.windowEnd,
    address: d.address,
    lat: d.lat,
    lng: d.lng,
    foodPhotoPath: d.foodPhotoPath || null,
  });
  if (!row) return fail("CONFLICT", "Can't edit — it's already claimed or not yours.");
  revalidatePickups(id);
  return { ok: true };
}

/** DON-05: cancel while still requested (owner only). */
export async function cancelPickup(id: string): Promise<Result> {
  let userId: string;
  try {
    ({ userId } = await donor());
  } catch {
    return fail("FORBIDDEN", "Only donors can cancel pickups.");
  }
  const row = await pickupsRepo.cancelIfRequested(id, userId);
  if (!row) return fail("CONFLICT", "Can't cancel — already claimed or not yours.");
  revalidatePickups(id);
  return { ok: true };
}

/** DON-06: quick-repost a previous request as a fresh one. */
export async function repostPickup(id: string): Promise<Result<{ id: string }>> {
  let userId: string;
  try {
    ({ userId } = await donor());
  } catch {
    return fail("FORBIDDEN", "Only donors can repost pickups.");
  }
  const src = await pickupsRepo.getById(id);
  if (!src || src.donorId !== userId) return fail("NOT_FOUND", "Request not found.");
  const row = await pickupsRepo.create({
    donorId: userId,
    category: src.category,
    description: src.description,
    quantity: src.quantity,
    quantityUnit: src.quantityUnit,
    windowStart: src.windowStart,
    windowEnd: src.windowEnd,
    address: src.address,
    lat: src.lat,
    lng: src.lng,
    safetyAttested: src.safetyAttested,
    status: "requested",
  });
  revalidatePickups(row.id);
  return { ok: true, id: row.id };
}

/** VOL-03: atomic claim. */
export async function claimPickup(id: string): Promise<Result> {
  let userId: string;
  try {
    ({ userId } = await volunteer());
  } catch {
    return fail("FORBIDDEN", "Only volunteers can claim pickups.");
  }
  const row = await pickupsRepo.claimIfAvailable(id, userId);
  if (!row) return fail("TAKEN", "Just taken by another volunteer.");
  await statusEventsRepo.record({
    pickupId: id,
    actorId: userId,
    fromStatus: "requested",
    toStatus: "accepted",
  });
  revalidatePickups(id);
  return { ok: true };
}

/** VOL-04: advance to the next status (assigned volunteer only, server-validated). */
export async function advancePickup(id: string): Promise<Result<{ status: PickupStatus }>> {
  let userId: string;
  try {
    ({ userId } = await volunteer());
  } catch {
    return fail("FORBIDDEN", "Only volunteers can update pickups.");
  }
  const pickup = await pickupsRepo.getById(id);
  if (!pickup) return fail("NOT_FOUND", "Pickup not found.");
  if (pickup.volunteerId !== userId) return fail("FORBIDDEN", "Not your pickup.");

  const from = pickup.status;
  const to = nextStatus(from);
  if (!to || !canTransition(from, to)) {
    return fail("CONFLICT", "No further status to advance to.");
  }
  if (isDeliveringTransition(from, to) && !pickup.proofPhotoPath) {
    return fail("PROOF_REQUIRED", "Add a proof-of-delivery photo first.");
  }
  const extra = to === "delivered" ? { deliveredAt: new Date() } : {};
  const row = await pickupsRepo.advance(id, userId, from, to, extra);
  if (!row) return fail("CONFLICT", "Status changed — please refresh.");
  await statusEventsRepo.record({
    pickupId: id,
    actorId: userId,
    fromStatus: from,
    toStatus: to,
  });
  revalidatePickups(id);
  return { ok: true, status: to };
}

/** VOL-05: attach the proof-of-delivery photo (assigned volunteer only). */
export async function setProofPhoto(id: string, path: string): Promise<Result> {
  let userId: string;
  try {
    ({ userId } = await volunteer());
  } catch {
    return fail("FORBIDDEN", "Only volunteers can upload proof.");
  }
  if (!path) return fail("VALIDATION", "Missing photo.");
  const row = await pickupsRepo.setProofPhoto(id, userId, path);
  if (!row) return fail("FORBIDDEN", "Not your pickup.");
  revalidatePickups(id);
  return { ok: true };
}
