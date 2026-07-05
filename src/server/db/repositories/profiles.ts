import "server-only";
import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { profiles, type NewProfile, type Profile } from "@/server/db/schema";
import type { Role } from "@/config/constants";

/** UX-13: admin users list filter. Both optional; and() drops undefined natively. */
export interface AdminUserFilters {
  q?: string; // matches name OR email, case-insensitive contains
  role?: Role;
}

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

  /** Ids of active (non-deactivated) admins — run/completed fan-out target (B3). */
  async listAdminIds(): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.role, "admin"), isNull(profiles.deactivatedAt)));
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
          // Stamp locale only when the caller supplied one — never clobber an
          // existing preference back to the column default (B3).
          ...(input.locale !== undefined ? { locale: input.locale } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  },

  /** B3: best-effort write of the user's preferred locale (from setLocale). */
  async setLocale(id: string, locale: string): Promise<void> {
    const db = getDb();
    await db
      .update(profiles)
      .set({ locale, updatedAt: new Date() })
      .where(eq(profiles.id, id));
  },

  // ── Admin (Phase 6) ──────────────────────────────────────────────
  /**
   * ADM-03 / UX-13: full user list for the admin table, newest first.
   * `q` matches name OR email (case-insensitive contains); `role` narrows to one
   * role. Both optional and combine with AND. Server-side (not client-filtered)
   * so the filtered set is shareable/reload-safe via URL searchParams.
   */
  async listAll(filter: AdminUserFilters = {}): Promise<Profile[]> {
    const db = getDb();
    const conditions = [
      filter.role ? eq(profiles.role, filter.role) : undefined,
      filter.q
        ? or(
            ilike(profiles.name, `%${filter.q}%`),
            ilike(profiles.email, `%${filter.q}%`),
          )
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const base = db.select().from(profiles);
    return conditions.length > 0
      ? base.where(and(...conditions)).orderBy(desc(profiles.createdAt))
      : base.orderBy(desc(profiles.createdAt));
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

  /**
   * ADM-02 assign-target source: onboarded, NON-deactivated drivers + names.
   * dispatch-model-v2 made the DRIVER the collector role, so the admin
   * manual-assign picker sources this (a volunteer assignee could never
   * advance the pickup afterward — claimPickup/advancePickup/recordPing all
   * gate on role === "driver").
   */
  async listAssignableDrivers(): Promise<{ id: string; name: string }[]> {
    const db = getDb();
    return db
      .select({ id: profiles.id, name: profiles.name })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, "driver"),
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
