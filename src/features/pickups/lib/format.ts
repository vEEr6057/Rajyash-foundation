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

export function formatWindow(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    const timeFmt = new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${fmt.format(start)} – ${timeFmt.format(end)}`;
  }
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/** Format a Date for a <input type="datetime-local"> value (local time). */
export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
