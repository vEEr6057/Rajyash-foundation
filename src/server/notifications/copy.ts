import "server-only";
import { ROUTES } from "@/config/constants";

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
    | "pickup/cancelled";
  pickupId: string;
  toStatus?: string;
}

/** Per-event title/body/url. Plain copy now; i18n is Phase 7 (out of scope). */
export function buildCopy(input: CopyInput): NotificationCopy {
  const url = ROUTES.pickup(input.pickupId);
  switch (input.eventName) {
    case "pickup/created":
      return {
        title: "New pickup nearby",
        body: "A donor just posted surplus food. Tap to claim it.",
        url,
      };
    case "pickup/claimed":
      return {
        title: "Your pickup was claimed",
        body: "A volunteer is on the way to collect your donation.",
        url,
      };
    case "pickup/status_changed": {
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
        url,
      };
    default:
      return { title: "Notification", body: "", url };
  }
}
