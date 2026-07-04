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

/**
 * Compose a localized "quantity + unit" string (e.g. "40 servings", "40 સર્વિંગ").
 * The unit label is resolved through the `common` translator so it renders in the
 * active locale — `t` is a next-intl translator scoped to the `common` namespace
 * (from `useTranslations("common")` or `getTranslations("common")`). DB value is
 * unchanged; this is display-only.
 */
export function formatQuantity(
  qty: number,
  unit: QuantityUnit,
  t: (key: string) => string,
): string {
  return `${qty} ${t(`quantityUnit.${unit}`)}`;
}

// Single-city app — all pickup times are Ahmedabad local (IST). Pin the zone so dates
// render in IST regardless of the runtime tz (Cloudflare Workers run in UTC, which
// otherwise shifted every window 5h30 early — see E2E-AUDIT 🟠 2).
export const APP_TIME_ZONE = "Asia/Kolkata";

// Map a next-intl locale → a BCP-47 tag Intl understands, so month names localize
// (e.g. "जुल" / "જુલાઈ" instead of "Jul") while the region stays India (12h clock,
// numerals). Full-ICU is required at runtime for the Indic names to differ — asserted
// by format.test.ts.
const INTL_LOCALE: Record<string, string> = {
  en: "en-IN",
  gu: "gu-IN",
  hi: "hi-IN",
};

/** Resolve a next-intl locale ("en" | "gu" | "hi") to its Intl tag; defaults to en-IN. */
export function intlLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? "en-IN";
}

export function formatWindow(start: Date, end: Date, locale = "en"): string {
  const tag = intlLocale(locale);
  const fmt = new Intl.DateTimeFormat(tag, {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  // Compare day boundaries IN IST, not the runtime tz. dayKey stays en-CA — it's a
  // machine comparison key, never shown to the user.
  const dayKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const sameDay = dayKey(start) === dayKey(end);
  if (sameDay) {
    const timeFmt = new Intl.DateTimeFormat(tag, {
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
