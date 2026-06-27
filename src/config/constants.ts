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
  donorPickups: "/portal/pickups",
  newPickup: "/portal/pickups/new",
  pickup: (id: string) => `/portal/pickups/${id}`,
  editPickup: (id: string) => `/portal/pickups/${id}/edit`,
  volunteerBoard: "/portal/board",
  volunteerBoardMap: "/portal/board/map",
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
} as const;
