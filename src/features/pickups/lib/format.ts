import {
  FOOD_CATEGORY_LABELS,
  PICKUP_STATUS_LABELS,
  type FoodCategory,
  type PickupStatus,
  type QuantityUnit,
} from "@/config/constants";

export function formatCategory(c: FoodCategory): string {
  return FOOD_CATEGORY_LABELS[c];
}

export function formatStatus(s: PickupStatus): string {
  return PICKUP_STATUS_LABELS[s];
}

export function formatQuantity(qty: number, unit: QuantityUnit): string {
  return `${qty} ${unit}`;
}

// Single-city app — all pickup times are Ahmedabad local (IST). Pin the zone so dates
// render in IST regardless of the runtime tz (Cloudflare Workers run in UTC, which
// otherwise shifted every window 5h30 early — see E2E-AUDIT 🟠 2).
export const APP_TIME_ZONE = "Asia/Kolkata";

export function formatWindow(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  // Compare day boundaries IN IST, not the runtime tz.
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const sameDay = dayKey(start) === dayKey(end);
  if (sameDay) {
    const timeFmt = new Intl.DateTimeFormat("en-IN", {
      timeZone: APP_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${fmt.format(start)} – ${timeFmt.format(end)}`;
  }
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Format a Date as an IST wall-clock value for a <input type="datetime-local">. */
export function toDatetimeLocal(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  // en-CA hour can be "24" at midnight in some engines — normalize to "00".
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}
