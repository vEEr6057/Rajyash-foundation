/**
 * App-wide constants: roles, routes, query keys.
 */

// Roles (D-01). `admin` is assigned manually via Clerk metadata, never self-selected.
// `driver` (v2 dispatch) = paid rickshaw driver who works coordinator-assigned runs.
export const ROLES = ["donor", "volunteer", "driver", "admin"] as const;
export type Role = (typeof ROLES)[number];

// Roles a user may choose at onboarding (admin excluded — manual elevation only).
export const SELECTABLE_ROLES = ["donor", "volunteer", "driver"] as const;
export type SelectableRole = (typeof SELECTABLE_ROLES)[number];

export const DEFAULT_CITY = "Ahmedabad";

// Rows per page for admin data tables (server-side pagination).
export const ADMIN_PAGE_SIZE = 20;

export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  staffSignIn: "/staff",
  onboarding: "/onboarding",
  portalDashboard: "/portal/dashboard",
  adminDashboard: "/admin/dashboard",
  adminPickups: "/admin/pickups",
  adminUsers: "/admin/users",
  adminPartners: "/admin/partners",
  adminReports: "/admin/reports",
  // ── Intake (Phase 11 / INT-02) ─────────────────────────────────
  adminSurplusNew: "/admin/surplus/new",
  // ── Destinations (Phase 8 / DEST-01) ───────────────────────────
  adminDestinations: "/admin/destinations",
  // ── Runs & Dispatch (Phase 9 / RUN-01..08) ─────────────────────
  adminRuns: "/admin/runs",
  adminRun: (id: string) => `/admin/runs/${id}`,
  driverRun: "/portal/run",
  donorPickups: "/portal/pickups",
  newPickup: "/portal/pickups/new",
  pickup: (id: string) => `/portal/pickups/${id}`,
  editPickup: (id: string) => `/portal/pickups/${id}/edit`,
  volunteerBoard: "/portal/board",
  volunteerBoardMap: "/portal/board/map",
  // Public site (Phase 7 — D-04: volunteer CTA reuses Clerk sign-up with role prefill)
  becomeVolunteer: "/sign-up?role=volunteer",
  privacy: "/privacy",
  // Payments (Phase 5 / PAY-03) — public donate page, rendered only when the flag is on.
  donate: "/donate",
} as const;

// ── Payments / Razorpay (Phase 5, PAY-01..04) ────────────────────────
// 80G tax-exemption registration number printed on donation receipts. INTENTIONALLY
// EMPTY — never invent a real number. The owner fills this in as a go-live step; the
// receipt email hides the 80G line while it is blank.
// TODO(owner): set the Foundation's real 80G registration number before enabling receipts.
export const NGO_80G_NUMBER = "";
// Legal name printed on receipts (single source; safe to ship — public info).
export const NGO_LEGAL_NAME = "Rajyash Foundation";
// Donation amount bounds (paise). Min ₹10 (1000 paise); ceiling ₹1,00,000 (10,000,000
// paise) — a sane upper guard so a fat-fingered / hostile amount is rejected server-side.
export const DONATION_MIN_PAISE = 1000;
export const DONATION_MAX_PAISE = 10_000_000;

// Official Rajyash Foundation social profiles. Single source of truth — referenced
// by both the public footer (visible icon links) and the homepage ORG_JSONLD `sameAs`
// array, so the two never drift.
export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/RajyashFoundation",
  instagram: "https://www.instagram.com/rajyashfoundation",
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
  // ── Destinations (Phase 8 / DEST-01) ───────────────────────────
  destinations: ["destinations"] as const,
  // ── Runs & Dispatch (Phase 9) ──────────────────────────────────
  runs: ["runs"] as const,
  run: (id: string) => ["runs", id] as const,
  myRun: ["runs", "mine"] as const,
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
  // Runs & dispatch (B3): driver learns of an assignment; admins learn of completion.
  runAssigned: "run/assigned",
  runCompleted: "run/completed",
  // Payments (Phase 5 / PAY-04): a webhook-verified capture fires the receipt email.
  donationCaptured: "donation/captured",
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

// ── Runs & Dispatch (Phase 9 / RUN-01..08) ──────────────────────────
export const RUN_STATUSES = ["planned", "active", "completed", "cancelled"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const RUN_SLOTS = ["morning", "night"] as const;
export type RunSlot = (typeof RUN_SLOTS)[number];
// i18n key (in the `admin` namespace) for each slot's display label — routed
// through next-intl so labels localize. Single source: admin.runs.slotMorning/Night.
export const RUN_SLOT_LABEL_KEYS: Record<RunSlot, string> = {
  morning: "runs.slotMorning",
  night: "runs.slotNight",
};

export const STOP_KINDS = ["pickup", "drop"] as const;
export type StopKind = (typeof STOP_KINDS)[number];

export const STOP_STATUSES = ["pending", "done", "skipped"] as const;
export type StopStatus = (typeof STOP_STATUSES)[number];
export const STOP_STATUS_LABELS: Record<StopStatus, string> = {
  pending: "Pending",
  done: "Done",
  skipped: "Skipped",
};

/** Valid run-level transitions (coordinator or auto-complete). */
export const VALID_RUN_TRANSITIONS: Record<RunStatus, readonly RunStatus[]> = {
  planned: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Valid stop-level transitions. */
export const VALID_STOP_TRANSITIONS: Record<StopStatus, readonly StopStatus[]> = {
  pending: ["done", "skipped"],
  done: [],
  skipped: [],
};
