import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { partners, type NewPartner, type Partner } from "@/server/db/schema";

/** Thin data-access for partner orgs (ADM-04 / D-06). */
export const partnersRepo = {
  async create(input: NewPartner): Promise<Partner> {
    const db = getDb();
    const rows = await db.insert(partners).values(input).returning();
    return rows[0];
  },

  async getById(id: string): Promise<Partner | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async list(): Promise<Partner[]> {
    const db = getDb();
    return db.select().from(partners).orderBy(desc(partners.createdAt));
  },

  async update(id: string, fields: Partial<NewPartner>): Promise<Partner | null> {
    const db = getDb();
    const rows = await db
      .update(partners)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(partners).where(eq(partners.id, id));
  },
};
