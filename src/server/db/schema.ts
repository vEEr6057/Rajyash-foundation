import {
  pgTable,
  text,
  boolean,
  timestamp,
  pgEnum,
  integer,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core";
import {
  ROLES,
  FOOD_CATEGORIES,
  QUANTITY_UNITS,
  PICKUP_STATUSES,
} from "@/config/constants";

/** Role enum mirrors the app's ROLES constant (donor | volunteer | admin). */
export const roleEnum = pgEnum("role", ROLES);

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
