import "server-only";
import type { NotificationChannelKey } from "@/config/constants";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { runsRepo } from "@/server/db/repositories/runs";
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

  // B3: always fetch the profile — copy is now recipient-locale, and email needs it too.
  // One query per recipient (≤ ~20/event), same cost as the old email-only path.
  const plans: RecipientPlan[] = [];
  for (const r of resolved) {
    const profile = await profilesRepo.getById(r.recipientId);
    const copy = buildCopy(
      event.name,
      { pickupId: pickup.id, toStatus: event.data.toStatus },
      profile?.locale ?? "en",
    );
    plans.push({
      to: { userId: r.recipientId, email: profile?.email ?? null },
      channels: r.channels,
      msg: { type: event.name, ...copy, pickupId: pickup.id },
    });
  }
  return plans;
}

// ── Runs & dispatch (B3) ─────────────────────────────────────────────
export type RunEventName = "run/assigned" | "run/completed";

export interface ResolveRunInput {
  eventName: RunEventName;
  /** run/assigned target (the newly assigned driver). */
  driverId?: string | null;
  /** run/completed targets (all active admins). */
  adminIds?: string[];
}

/**
 * Run recipient + channel matrix (B3). Pure — no DB. A driver hears about their
 * assignment on all three channels (~2 runs/day keeps email quota-safe); admins get
 * a completion note in-app only.
 */
export function resolveRunRecipients(input: ResolveRunInput): ResolvedRecipient[] {
  switch (input.eventName) {
    case "run/assigned":
      return input.driverId
        ? [
            {
              recipientId: input.driverId,
              channels: ["in_app", "web_push", "email"],
            },
          ]
        : [];
    case "run/completed":
      return (input.adminIds ?? []).map((id) => ({
        recipientId: id,
        channels: ["in_app"],
      }));
    default:
      return [];
  }
}

/**
 * Async wrapper (sibling of planRecipients) run inside an Inngest step: reads the run
 * for its slot/date copy context, maps via the pure run matrix, and attaches per-event
 * copy. Returns [] if the run is gone (defensive). driverId comes from the event (the
 * assignment being notified) — falls back to the run's current driver.
 */
export async function planRunRecipients(event: {
  name: RunEventName;
  data: { runId: string; driverId?: string };
}): Promise<RecipientPlan[]> {
  const run = await runsRepo.getById(event.data.runId);
  if (!run) return [];

  const resolved =
    event.name === "run/assigned"
      ? resolveRunRecipients({
          eventName: "run/assigned",
          driverId: event.data.driverId ?? run.driverId,
        })
      : resolveRunRecipients({
          eventName: "run/completed",
          adminIds: await profilesRepo.listAdminIds(),
        });

  const plans: RecipientPlan[] = [];
  for (const r of resolved) {
    const profile = await profilesRepo.getById(r.recipientId);
    const copy = buildCopy(
      event.name,
      { runId: run.id, slot: run.slot, runDate: run.runDate },
      profile?.locale ?? "en",
    );
    plans.push({
      to: { userId: r.recipientId, email: profile?.email ?? null },
      channels: r.channels,
      msg: { type: event.name, ...copy },
    });
  }
  return plans;
}
