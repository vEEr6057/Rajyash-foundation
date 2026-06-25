import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { ROLES } from "@/config/constants";

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
