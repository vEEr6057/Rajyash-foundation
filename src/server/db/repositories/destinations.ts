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

  /**
   * All destinations, newest first. The admin destinations LIST page wants
   * every row (active + inactive, badge distinguishes them); any picker/select
   * feeding a NEW stop/run wants `activeOnly: true` so a deactivated drop point
   * can't be chosen again (UX-15) — the deactivate guidance in
   * deleteDestination's conflict message only holds if pickers actually honour it.
   */
  async list({ activeOnly = false }: { activeOnly?: boolean } = {}): Promise<Destination[]> {
    const db = getDb();
    const q = db.select().from(destinations);
    return activeOnly
      ? q.where(eq(destinations.active, true)).orderBy(desc(destinations.createdAt))
      : q.orderBy(desc(destinations.createdAt));
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
