/**
 * App-wide constants: roles, routes, query keys.
 */

// Roles (D-01). `admin` is assigned manually via Clerk metadata, never self-selected.
export const ROLES = ["donor", "volunteer", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Roles a user may choose at onboarding (admin excluded — manual elevation only).
export const SELECTABLE_ROLES = ["donor", "volunteer"] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];

export const DEFAULT_CITY = "Ahmedabad";

export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  onboarding: "/onboarding",
  portalDashboard: "/portal/dashboard",
  adminDashboard: "/admin/dashboard",
  adminPickups: "/admin/pickups",
  adminUsers: "/admin/users",
  adminPartners: "/admin/partners",
  adminReports: "/admin/reports",
  donorPickups: "/portal/pickups",
  newPickup: "/portal/pickups/new",
  pickup: (id: string) => `/portal/pickups/${id}`,
  editPickup: (id: string) => `/portal/pickups/${id}/edit`,
  volunteerBoard: "/portal/board",
  volunteerBoardMap: "/portal/board/map",
  // Public site (Phase 7 — D-04: volunteer CTA reuses Clerk sign-up with role prefill)
  becomeVolunteer: "/sign-up?role=volunteer",
} as const;

// ── Pickups (Phase 2) ────────────────────────────────────────────────
// Food categories (D-01) + quantity units (D-02).
export const FOOD_CATEGORIES = [
  "cooked_meal",
  "raw_produce",
  "packaged",
  "bakery",
  "other",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  cooked_meal: "Cooked meal",
  raw_produce: "Raw produce",
  packaged: "Packaged",
  bakery: "Bakery",
  other: "Other",
};

export const QUANTITY_UNITS = ["servings", "kg"] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];

// Pickup status machine (D-08).
export const PICKUP_STATUSES = [
  "requested",
  "accepted",
  "en_route",
  "picked_up",
  "delivered",
  "cancelled",
] as const;
export type PickupStatus = (typeof PICKUP_STATUSES)[number];

export const PICKUP_STATUS_LABELS: Record<PickupStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  en_route: "En route",
  picked_up: "Picked up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Maps a status to its design-token pill key (tokens: --st-<key>-bg/-fg/-dot).
export const PICKUP_STATUS_PILL: Record<PickupStatus, string> = {
  requested: "requested",
  accepted: "accepted",
  en_route: "enroute",
  picked_up: "pickedup",
  delivered: "delivered",
  cancelled: "cancelled",
};

// Allowed forward transitions (D-08). Empty = terminal. Cancellation handled
// separately (donor only, requested → cancelled).
export const VALID_TRANSITIONS: Record<PickupStatus, readonly PickupStatus[]> = {
  requested: ["accepted", "cancelled"],
  accepted: ["en_route"],
  en_route: ["picked_up"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: [],
};

// Statuses a volunteer advances through (accepted → … → delivered).
export const VOLUNTEER_ADVANCE_FROM = [
  "accepted",
  "en_route",
  "picked_up",
] as const;

// TanStack Query keys (centralized — frontend-practices §5).
export const QUERY_KEYS = {
  profile: ["profile"] as const,
  pickups: ["pickups"] as const,
  pickup: (id: string) => ["pickups", id] as const,
  board: ["pickups", "board"] as const,
  myPickups: ["pickups", "mine"] as const,
  pings: (id: string) => ["pings", id] as const,
  notifications: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  partners: ["partners"] as const,
  adminPickups: (filters: Record<string, string | undefined>) =>
    ["admin", "pickups", filters] as const,
} as const;

// ── Live tracking (Phase 3) ──────────────────────────────────────────
// Volunteer GPS write cadence — one ping per ~30s (D-04, RESEARCH §D throttle).
export const PING_INTERVAL_MS = 30_000;
// Polling fallback when Realtime is down — latest-ping read every 10s (D-06).
export const POLL_INTERVAL_MS = 10_000;
// Stale threshold — newest ping older than this dims the marker + shows the
// "location may be outdated" badge (~3 missed pings, D-07).
export const STALE_THRESHOLD_MS = 90_000;

// ── Notifications (Phase 4) ──────────────────────────────────────────
// Inngest event names (D-03) — emitted from the pickup actions, consumed by the
// fan-out function. The single source of truth for the event strings.
export const NOTIFICATION_EVENTS = {
  pickupCreated: "pickup/created",
  pickupClaimed: "pickup/claimed",
  pickupStatusChanged: "pickup/status_changed",
  pickupCancelled: "pickup/cancelled",
} as const;

// Channel keys (NOT-04 registry keys + notification_deliveries.channel values).
export const NOTIFICATION_CHANNELS = ["in_app", "web_push", "email"] as const;
export type NotificationChannelKey = (typeof NOTIFICATION_CHANNELS)[number];

// ── Admin / Partners (Phase 6) ───────────────────────────────────────
// Partner org types (D-06). Mirrors partnerTypeEnum in schema.ts — keep in sync.
export const PARTNER_TYPES = [
  "restaurant",
  "hall",
  "event_planner",
  "family",
  "other",
] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  restaurant: "Restaurant",
  hall: "Banquet hall",
  event_planner: "Event planner",
  family: "Family",
  other: "Other",
};
