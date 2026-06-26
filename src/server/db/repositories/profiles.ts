import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { profiles, type NewProfile, type Profile } from "@/server/db/schema";

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
};
