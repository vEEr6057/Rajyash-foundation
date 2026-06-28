import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  destinations,
  type NewDestination,
  type Destination,
} from "@/server/db/schema";

/** Thin data-access for saved drop-off destinations (DEST-01). */
export const destinationsRepo = {
  async create(input: NewDestination): Promise<Destination> {
    const db = getDb();
    const rows = await db.insert(destinations).values(input).returning();
    return rows[0];
  },

  async getById(id: string): Promise<Destination | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async list(): Promise<Destination[]> {
    const db = getDb();
    return db.select().from(destinations).orderBy(desc(destinations.createdAt));
  },

  async update(
    id: string,
    fields: Partial<NewDestination>,
  ): Promise<Destination | null> {
    const db = getDb();
    const rows = await db
      .update(destinations)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(destinations.id, id))
      .returning();
    return rows[0] ?? null;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(destinations).where(eq(destinations.id, id));
  },
};
