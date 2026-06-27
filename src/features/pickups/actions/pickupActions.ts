"use server";

import { revalidatePath } from "next/cache";
import { requireRole, AuthError, getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { pingsRepo } from "@/server/db/repositories/pings";
import { inngest } from "@/server/inngest/client";
import { buildEventId } from "@/server/notifications/events";
import { NOTIFICATION_EVENTS } from "@/config/constants";
import { statusEventsRepo } from "@/server/db/repositories/statusEvents";
import { createSignedUpload } from "@/lib/storage";
import { geocodeAddress, resolveShortMapsUrl } from "@/lib/geocoding";
import {
  parseLatLngFromGoogleMapsUrl,
  isGoogleMapsUrl,
  isShortGoogleMapsUrl,
} from "@/lib/maps-link";
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

/**
 * DON-01 (bridge): resolve a pasted Google Maps link OR a typed address to a
 * lat/lng for the confirm-pin. Order: direct URL parse → short-link redirect +
 * parse → Nominatim geocode. Keeps the ORIGINAL pasted link (not the expanded
 * one) so the stored link stays human-friendly. Auth-gated like geocodePickupAddress.
 */
export async function resolvePickupLocation(
  input: string,
): Promise<
  Result<{ lat: number; lng: number; displayName: string; googleMapsUrl: string | null }>
> {
  try {
    await requireRole(["donor", "volunteer", "admin"]);
  } catch {
    return fail("UNAUTHORIZED", "Sign in first.");
  }
  const raw = input.trim();
  if (!raw) return fail("VALIDATION", "Enter an address or Google Maps link.");

  if (isGoogleMapsUrl(raw)) {
    let coords = parseLatLngFromGoogleMapsUrl(raw);
    if (!coords && isShortGoogleMapsUrl(raw)) {
      const resolved = await resolveShortMapsUrl(raw);
      if (resolved) coords = parseLatLngFromGoogleMapsUrl(resolved);
    }
    if (coords) {
      return {
        ok: true,
        lat: coords.lat,
        lng: coords.lng,
        displayName: "Pinned from Google Maps",
        googleMapsUrl: raw,
      };
    }
    return fail(
      "NOT_FOUND",
      "Couldn't read coordinates from that link — type the address or drag the pin.",
    );
  }

  const r = await geocodeAddress(raw);
  if (!r) return fail("NOT_FOUND", "Couldn't find that address — drag the pin instead.");
  return { ok: true, lat: r.lat, lng: r.lng, displayName: r.displayName, googleMapsUrl: null };
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
    // NOT-01/02: alert volunteers a new pickup is up (after-commit, best-effort).
    try {
      await inngest.send({
        name: NOTIFICATION_EVENTS.pickupCreated,
        data: { pickupId: row.id, eventId: buildEventId("created", row.id) },
      });
    } catch (e) {
      logger.error("inngest emit pickup/created failed", {
        pickupId: row.id,
        err: String(e),
      });
    }
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
  // TRK-04 / D-08: cancellation ends tracking — purge any trail (no-op if none).
  await pingsRepo.purgeForPickup(id);
  // NOT-01: tell the donor their pickup was cancelled (after-commit, best-effort).
  try {
    await inngest.send({
      name: NOTIFICATION_EVENTS.pickupCancelled,
      data: { pickupId: id, eventId: buildEventId("cancelled", id) },
    });
  } catch (e) {
    logger.error("inngest emit pickup/cancelled failed", {
      pickupId: id,
      err: String(e),
    });
  }
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
  // NOT-01/02: a reposted pickup is newly available — alert volunteers (best-effort).
  try {
    await inngest.send({
      name: NOTIFICATION_EVENTS.pickupCreated,
      data: { pickupId: row.id, eventId: buildEventId("created", row.id) },
    });
  } catch (e) {
    logger.error("inngest emit pickup/created (repost) failed", {
      pickupId: row.id,
      err: String(e),
    });
  }
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
  // NOT-01/02/03: tell the donor their pickup was claimed (after-commit, best-effort).
  try {
    await inngest.send({
      name: NOTIFICATION_EVENTS.pickupClaimed,
      data: { pickupId: id, eventId: buildEventId("claimed", id) },
    });
  } catch (e) {
    logger.error("inngest emit pickup/claimed failed", {
      pickupId: id,
      err: String(e),
    });
  }
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
  // TRK-04 / D-08: delivery ends tracking — purge the location trail immediately.
  if (to === "delivered") {
    await pingsRepo.purgeForPickup(id);
  }
  // NOT-01/02/03: notify the donor of the status change (after-commit, best-effort).
  try {
    await inngest.send({
      name: NOTIFICATION_EVENTS.pickupStatusChanged,
      data: { pickupId: id, eventId: buildEventId(to, id), toStatus: to },
    });
  } catch (e) {
    logger.error("inngest emit pickup/status_changed failed", {
      pickupId: id,
      toStatus: to,
      err: String(e),
    });
  }
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

// ── Live tracking (Phase 3) ──────────────────────────────────────────

/**
 * TRK-01 / D-05: record one GPS ping. The volunteer's browser is read/subscribe
 * only — it NEVER writes with the anon key; every ping comes through here so the
 * write reuses the same guards as the rest of the rescue loop (no IDOR):
 *   1) volunteer role, 2) assigned volunteer of THIS pickup, 3) status active.
 * Coordinates are range-validated (V5) before the insert.
 */
export async function recordPing(
  pickupId: string,
  lat: number,
  lng: number,
  accuracy?: number,
): Promise<Result> {
  let userId: string;
  try {
    ({ userId } = await volunteer());
  } catch {
    return fail("FORBIDDEN", "Only volunteers can share location.");
  }

  // V5 — reject impossible coordinates before touching the DB. Number.isFinite
  // also rejects NaN/Infinity (which are typeof "number" and would slip past < / >).
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0))
  ) {
    return fail("VALIDATION", "Invalid coordinates.");
  }

  const pickup = await pickupsRepo.getById(pickupId);
  if (!pickup) return fail("NOT_FOUND", "Pickup not found.");
  if (pickup.volunteerId !== userId) return fail("FORBIDDEN", "Not your pickup.");
  if (pickup.status !== "en_route" && pickup.status !== "picked_up") {
    // Tracking only runs while active — signal the caller to stop pinging.
    return fail("INACTIVE", "Tracking is only active during pickup.");
  }

  await pingsRepo.insert({
    pickupId,
    volunteerId: userId,
    lat,
    lng,
    accuracy: accuracy ?? null,
  });
  // No revalidatePath — the viewer reads via Realtime/polling, not a server render.
  return { ok: true };
}

/**
 * TRK-02/03 polling fallback (D-06): newest ping for a pickup. Read is gated to
 * the pickup's donor or an admin (no IDOR) — mirrors the SELECT RLS that gates the
 * browser subscription, enforced again here server-side for the polling path.
 */
export async function getLatestPing(
  pickupId: string,
): Promise<
  Result<{
    ping: {
      lat: number;
      lng: number;
      accuracy: number | null;
      createdAt: string;
    } | null;
  }>
> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");

  const pickup = await pickupsRepo.getById(pickupId);
  if (!pickup) return fail("NOT_FOUND", "Pickup not found.");

  const isDonorOwner = pickup.donorId === session.userId;
  const isAdmin = session.role === "admin";
  if (!isDonorOwner && !isAdmin) return fail("FORBIDDEN", "Not allowed.");

  const latest = await pingsRepo.latestForPickup(pickupId);
  return {
    ok: true,
    ping: latest
      ? {
          lat: latest.lat,
          lng: latest.lng,
          accuracy: latest.accuracy,
          createdAt: latest.createdAt.toISOString(), // serialisable for the client
        }
      : null,
  };
}
