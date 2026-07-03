import "server-only";
import { ROUTES, type RunSlot } from "@/config/constants";

export interface NotificationCopy {
  title: string;
  body: string;
  url: string;
}

export interface CopyInput {
  eventName:
    | "pickup/created"
    | "pickup/claimed"
    | "pickup/status_changed"
    | "pickup/cancelled"
    | "run/assigned"
    | "run/completed";
  pickupId?: string;
  toStatus?: string;
  // Run context (B3): the driver-facing run/assigned + admin-facing run/completed copy.
  runId?: string;
  slot?: RunSlot;
  runDate?: Date | string;
}

const SLOT_LABEL: Record<RunSlot, string> = { morning: "Morning", night: "Night" };

/** "Morning · 4 Jul 2026" style run descriptor for the notification body. */
function runWhen(slot: RunSlot | undefined, runDate: Date | string | undefined): string {
  const label = SLOT_LABEL[slot ?? "morning"];
  if (!runDate) return `${label} run`;
  const date = typeof runDate === "string" ? new Date(runDate) : runDate;
  if (Number.isNaN(date.getTime())) return `${label} run`;
  const when = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${label} run · ${when}`;
}

/** Per-event title/body/url. Plain copy now; i18n is Phase 7 (out of scope). */
export function buildCopy(input: CopyInput): NotificationCopy {
  switch (input.eventName) {
    case "pickup/created":
      return {
        title: "New pickup nearby",
        body: "A donor just posted surplus food. Tap to claim it.",
        url: ROUTES.pickup(input.pickupId ?? ""),
      };
    case "pickup/claimed":
      return {
        title: "Your pickup was claimed",
        body: "A volunteer is on the way to collect your donation.",
        url: ROUTES.pickup(input.pickupId ?? ""),
      };
    case "pickup/status_changed": {
      const url = ROUTES.pickup(input.pickupId ?? "");
      const map: Record<string, NotificationCopy> = {
        en_route: {
          title: "Volunteer en route",
          body: "Your volunteer is heading to the pickup.",
          url,
        },
        picked_up: {
          title: "Food picked up",
          body: "Your donation has been collected and is on its way.",
          url,
        },
        delivered: {
          title: "Delivered — thank you!",
          body: "Your donation reached people in need.",
          url,
        },
      };
      return (
        map[input.toStatus ?? ""] ?? {
          title: "Pickup updated",
          body: "Your pickup status changed.",
          url,
        }
      );
    }
    case "pickup/cancelled":
      return {
        title: "Pickup cancelled",
        body: "Your pickup request was cancelled.",
        url: ROUTES.pickup(input.pickupId ?? ""),
      };
    case "run/assigned":
      return {
        title: "You're assigned to a run",
        body: `${runWhen(input.slot, input.runDate)}. Tap to see your stops.`,
        url: ROUTES.driverRun,
      };
    case "run/completed":
      return {
        title: "Run completed",
        body: `${runWhen(input.slot, input.runDate)} — all stops done.`,
        url: ROUTES.adminRun(input.runId ?? ""),
      };
    default:
      return { title: "Notification", body: "", url: ROUTES.home };
  }
}
