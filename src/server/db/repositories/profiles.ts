import "server-only";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { profiles, type NewProfile, type Profile } from "@/server/db/schema";
import type { Role } from "@/config/constants";

/** Thin data-access layer for profiles (no business logic — that lives in services). */
export const profilesRepo = {
  async getById(id: string): Promise<Profile | null> {
    const db = getDb();
    const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return rows[0] ?? null;
  },

  /** Ids of active, onboarded volunteers (D-05 "new pickup" fan-out target). */
  async listVolunteerIds(): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, "volunteer"),
          eq(profiles.onboardingComplete, true),
        ),
      );
    return rows.map((r) => r.id);
  },

  /** Insert-or-update a profile keyed by Clerk userId. */
  async upsert(input: NewProfile): Promise<Profile> {
    const db = getDb();
    const rows = await db
      .insert(profiles)
      .values(input)
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          role: input.role,
          city: input.city,
          onboardingComplete: input.onboardingComplete,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  },

  // ── Admin (Phase 6) ──────────────────────────────────────────────
  /** ADM-03: full user list for the admin table, newest first. */
  async listAll(): Promise<Profile[]> {
    const db = getDb();
    return db.select().from(profiles).orderBy(desc(profiles.createdAt));
  },

  /**
   * Active (non-deactivated) profiles of a single role, newest first. Lets a
   * single-role screen skip pulling the whole profiles table just to filter it
   * client-side (e.g. the runs pages, which only ever need drivers).
   */
  async listByRole(role: Role): Promise<Profile[]> {
    const db = getDb();
    return db
      .select()
      .from(profiles)
      .where(and(eq(profiles.role, role), isNull(profiles.deactivatedAt)))
      .orderBy(desc(profiles.createdAt));
  },

  /** ADM-02 assign-target source: onboarded, NON-deactivated volunteers + names. */
  async listAssignableVolunteers(): Promise<{ id: string; name: string }[]> {
    const db = getDb();
    return db
      .select({ id: profiles.id, name: profiles.name })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, "volunteer"),
          eq(profiles.onboardingComplete, true),
          isNull(profiles.deactivatedAt),
        ),
      )
      .orderBy(desc(profiles.createdAt));
  },

  /** ADM-03: mirror the Clerk role write to the app DB (Clerk owns the session claim). */
  async setRole(id: string, role: Role): Promise<Profile | null> {
    const db = getDb();
    const rows = await db
      .update(profiles)
      .set({ role, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return rows[0] ?? null;
  },

  /** ADM-03: soft-deactivate (reversible). The getSession block reads this column. */
  async deactivate(id: string): Promise<Profile | null> {
    const db = getDb();
    const rows = await db
      .update(profiles)
      .set({ deactivatedAt: sql`now()`, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return rows[0] ?? null;
  },

  /** ADM-03: reactivate — clear the soft-deactivate flag. */
  async reactivate(id: string): Promise<Profile | null> {
    const db = getDb();
    const rows = await db
      .update(profiles)
      .set({ deactivatedAt: null, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return rows[0] ?? null;
  },

  /** ADM-04: link (or unlink) a donor to a partner org. */
  async setPartner(id: string, partnerId: string | null): Promise<Profile | null> {
    const db = getDb();
    const rows = await db
      .update(profiles)
      .set({ partnerId, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return rows[0] ?? null;
  },

  /** Last-admin guard: count active (non-deactivated) admin profiles. */
  async countActiveAdmins(): Promise<number> {
    const db = getDb();
    const rows = await db
      .select({ n: count() })
      .from(profiles)
      .where(and(eq(profiles.role, "admin"), isNull(profiles.deactivatedAt)));
    return rows[0]?.n ?? 0;
  },
};
