import "server-only";
import type { NotificationChannelKey } from "@/config/constants";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { buildCopy } from "@/server/notifications/copy";
import type {
  NotificationMessage,
  Recipient,
} from "@/server/notifications/types";

export interface ResolvedRecipient {
  recipientId: string;
  channels: NotificationChannelKey[];
}

/** Minimal pickup shape the matrix needs (decoupled from the full Pickup row). */
export interface RecipientPickup {
  donorId: string;
}

export interface ResolveInput {
  eventName:
    | "pickup/created"
    | "pickup/claimed"
    | "pickup/status_changed"
    | "pickup/cancelled";
  pickup: RecipientPickup;
  /** For pickup/status_changed: the target status (en_route|picked_up|delivered). */
  toStatus?: string;
  /** For pickup/created: ids of all active volunteers. */
  volunteerIds?: string[];
}

/**
 * D-05 recipient + channel matrix (NOT-01..03). Pure — no DB. The Inngest function
 * fetches the pickup + volunteer ids in a step, then calls this (RESEARCH §A/§D).
 */
export function resolveRecipients(input: ResolveInput): ResolvedRecipient[] {
  switch (input.eventName) {
    case "pickup/created":
      // All active volunteers, city-wide (user-locked, no geo-filter). In-app + push.
      return (input.volunteerIds ?? []).map((id) => ({
        recipientId: id,
        channels: ["in_app", "web_push"],
      }));
    case "pickup/claimed":
      return [
        {
          recipientId: input.pickup.donorId,
          channels: ["in_app", "web_push", "email"],
        },
      ];
    case "pickup/status_changed": {
      const channels: NotificationChannelKey[] =
        input.toStatus === "delivered"
          ? ["in_app", "web_push", "email"] // email on delivered
          : ["in_app", "web_push"]; // en_route / picked_up
      return [{ recipientId: input.pickup.donorId, channels }];
    }
    case "pickup/cancelled":
      // Pre-claim cancel — no volunteer involved. Donor in-app only.
      return [{ recipientId: input.pickup.donorId, channels: ["in_app"] }];
    default:
      return [];
  }
}

export interface RecipientPlan {
  to: Recipient; // { userId, email }
  channels: ResolvedRecipient["channels"];
  msg: NotificationMessage;
}

/**
 * Async wrapper run inside an Inngest step (RESEARCH §A): reads the pickup (+ volunteer
 * ids for created), maps via the pure matrix, resolves each recipient's email, and
 * attaches the per-event copy. Returns [] if the pickup is gone (defensive).
 */
export async function planRecipients(event: {
  name:
    | "pickup/created"
    | "pickup/claimed"
    | "pickup/status_changed"
    | "pickup/cancelled";
  data: { pickupId: string; toStatus?: string };
}): Promise<RecipientPlan[]> {
  const pickup = await pickupsRepo.getById(event.data.pickupId);
  if (!pickup) return [];

  const volunteerIds =
    event.name === "pickup/created"
      ? await profilesRepo.listVolunteerIds()
      : undefined;
  const resolved = resolveRecipients({
    eventName: event.name,
    pickup: { donorId: pickup.donorId },
    toStatus: event.data.toStatus,
    volunteerIds,
  });
  const copy = buildCopy({
    eventName: event.name,
    pickupId: pickup.id,
    toStatus: event.data.toStatus,
  });
  const msg: NotificationMessage = {
    type: event.name,
    ...copy,
    pickupId: pickup.id,
  };

  // Resolve emails only for recipients that actually use the email channel.
  const plans: RecipientPlan[] = [];
  for (const r of resolved) {
    const needsEmail = r.channels.includes("email");
    const profile = needsEmail
      ? await profilesRepo.getById(r.recipientId)
      : null;
    plans.push({
      to: { userId: r.recipientId, email: profile?.email ?? null },
      channels: r.channels,
      msg,
    });
  }
  return plans;
}
