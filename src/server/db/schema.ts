import {
  pgTable,
  text,
  boolean,
  timestamp,
  pgEnum,
  integer,
  doublePrecision,
  index,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import {
  ROLES,
  FOOD_CATEGORIES,
  QUANTITY_UNITS,
  PICKUP_STATUSES,
} from "@/config/constants";

/** Role enum mirrors the app's ROLES constant (donor | volunteer | admin). */
export const roleEnum = pgEnum("role", ROLES);

// ── Partners (Phase 6, Admin) ────────────────────────────────────────
/** Partner organization types (D-06). Mirrored in PARTNER_TYPES (constants). */
export const partnerTypeEnum = pgEnum("partner_type", [
  "restaurant",
  "hall",
  "event_planner",
  "family",
  "other",
]);

/**
 * partners — a donor organization the foundation tracks (ADM-04 / D-06). A profile
 * (donor user) may be linked to one partner via profiles.partnerId. Contact fields are
 * nullable except name/type/city.
 */
export const partners = pgTable("partners", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  type: partnerTypeEnum("type").notNull(),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  address: text("address"),
  city: text("city").notNull().default("Ahmedabad"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;

/**
 * profiles — one row per Clerk user. Clerk owns auth truth; this mirrors the
 * role + onboarding state for Phase 2+ joins (pickups, donations, etc.).
 * PK is the Clerk userId (string), so no separate FK is needed.
 */
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(), // Clerk userId
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: roleEnum("role").notNull(),
  city: text("city").notNull().default("Ahmedabad"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  // Admin (Phase 6): optional link to a partner org (D-06) + soft-deactivate flag (D-05).
  partnerId: text("partner_id").references(() => partners.id), // nullable FK
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }), // null = active
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// ── Pickups (Phase 2) ────────────────────────────────────────────────
export const foodCategoryEnum = pgEnum("food_category", FOOD_CATEGORIES);
export const quantityUnitEnum = pgEnum("quantity_unit", QUANTITY_UNITS);
export const pickupStatusEnum = pgEnum("pickup_status", PICKUP_STATUSES);

/**
 * pickups — a surplus-food rescue request. donorId/volunteerId are Clerk userIds
 * (FK → profiles.id). Photo columns store Supabase Storage object paths, not URLs.
 */
export const pickups = pgTable(
  "pickups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    donorId: text("donor_id")
      .notNull()
      .references(() => profiles.id),
    volunteerId: text("volunteer_id").references(() => profiles.id),

    // What (D-01, D-02)
    category: foodCategoryEnum("category").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull(),
    quantityUnit: quantityUnitEnum("quantity_unit").notNull(),

    // When — pickup time window
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),

    // Where (D-05)
    address: text("address").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    // Bridge: the original pasted Google Maps link, when location came from one.
    googleMapsUrl: text("google_maps_url"),

    // Safety (DON-03) + photos (Storage object paths)
    safetyAttested: boolean("safety_attested").notNull().default(false),
    foodPhotoPath: text("food_photo_path"),
    proofPhotoPath: text("proof_photo_path"),

    // Lifecycle (D-08)
    status: pickupStatusEnum("status").notNull().default("requested"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pickups_status_idx").on(t.status),
    index("pickups_donor_idx").on(t.donorId),
    index("pickups_volunteer_idx").on(t.volunteerId),
  ],
);

export type Pickup = typeof pickups.$inferSelect;
export type NewPickup = typeof pickups.$inferInsert;

/**
 * status_events — append-only audit log of every pickup status transition (D-08).
 */
export const statusEvents = pgTable(
  "status_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pickupId: text("pickup_id")
      .notNull()
      .references(() => pickups.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(), // Clerk userId who caused the change
    fromStatus: pickupStatusEnum("from_status"),
    toStatus: pickupStatusEnum("to_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("status_events_pickup_idx").on(t.pickupId)],
);

export type StatusEvent = typeof statusEvents.$inferSelect;
export type NewStatusEvent = typeof statusEvents.$inferInsert;

// ── Location pings (Phase 3, Live Tracking) ──────────────────────────────────
/**
 * Ephemeral GPS breadcrumb trail for an ACTIVE pickup. The assigned volunteer's
 * browser pings ~every 30s while the pickup is en_route|picked_up; the donor/admin
 * subscribe via Supabase Realtime. Append-only (D-05) — purged on delivered/cancelled
 * (TRK-04/D-08). FK cascade is hygiene only; pickups are never row-deleted, so the
 * explicit purge in advancePickup/cancelPickup is what actually clears the trail.
 */
export const locationPings = pgTable(
  "location_pings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    pickupId: text("pickup_id")
      .notNull()
      .references(() => pickups.id, { onDelete: "cascade" }),
    volunteerId: text("volunteer_id")
      .notNull()
      .references(() => profiles.id),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    accuracy: doublePrecision("accuracy"), // metres; nullable (some fixes omit it)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Subscription filter + purge key (RESEARCH §C step 0).
    index("location_pings_pickup_idx").on(t.pickupId),
    // Latest-ping read for the polling fallback (newest first).
    index("location_pings_pickup_created_idx").on(t.pickupId, t.createdAt.desc()),
  ],
);

export type LocationPing = typeof locationPings.$inferSelect;
export type NewLocationPing = typeof locationPings.$inferInsert;

// ── Notifications (Phase 4) ──────────────────────────────────────────
/**
 * In-app notification feed item (NOT-01 / D-06). One row per (recipient, event,
 * in_app delivery). `data` carries client routing context; `pickupId` cascades so
 * a deleted pickup tidies its notifications (pickups are never row-deleted today).
 */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    type: text("type").notNull(), // event type, e.g. "pickup/claimed"
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data"),
    pickupId: text("pickup_id").references(() => pickups.id, {
      onDelete: "cascade",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    // Unread-bell count: WHERE user_id = ? AND read_at IS NULL, newest first.
    index("notifications_user_unread_idx").on(t.userId, t.readAt),
  ],
);
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/**
 * Web push subscription (NOT-02 / D-07). `endpoint` is UNIQUE — the same browser
 * re-subscribing upserts rather than duplicates; dead endpoints (404/410) are pruned
 * server-side on send.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Exactly-once ledger (NOT-05 / D-09). One row per (event, recipient, channel); the
 * UNIQUE constraint is the hard dedup guarantee. The dispatcher inserts
 * on-conflict-do-nothing BEFORE sending — a returned row means "fresh, send"; empty
 * means "already sent, skip". recipient_id is intentionally NOT a FK (keeps the claim
 * insert cheap + atomic and lets us record deliveries for any recipient string).
 */
export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id").notNull(), // `${pickupId}:created` | `${pickupId}:${toStatus}`
    recipientId: text("recipient_id").notNull(), // profiles.id (not FK'd by design)
    channel: text("channel").notNull(), // "in_app" | "web_push" | "email"
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("notif_delivery_unique").on(t.eventId, t.recipientId, t.channel),
  ],
);
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;
export type NewNotificationDelivery = typeof notificationDeliveries.$inferInsert;

// ── Destinations (Phase 8, Dispatch Foundations / DEST-01) ─────────────────
/**
 * destinations — saved drop-off zones or shelters the foundation delivers to
 * (DEST-01 / DEST-02). Coordinator picks one of these when building a run stop
 * or enters a free-text address (ad-hoc, handled in Phase 9 stops). lat/lng
 * power the MapView draggable pin in DestinationForm.
 */
export const destinations = pgTable("destinations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  area: text("area"), // neighbourhood / locality, nullable
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  city: text("city").notNull().default("Ahmedabad"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export type Destination = typeof destinations.$inferSelect;
export type NewDestination = typeof destinations.$inferInsert;
