import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  pushSubscriptions,
  type NewPushSubscription,
  type PushSubscriptionRow,
} from "@/server/db/schema";

export const pushSubsRepo = {
  /** Insert-or-update keyed by endpoint (the same browser re-subscribing). */
  async upsertByEndpoint(
    input: NewPushSubscription,
  ): Promise<PushSubscriptionRow> {
    const db = getDb();
    const rows = await db
      .insert(pushSubscriptions)
      .values(input)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId: input.userId, p256dh: input.p256dh, auth: input.auth },
      })
      .returning();
    return rows[0];
  },
  async listForUser(userId: string): Promise<PushSubscriptionRow[]> {
    const db = getDb();
    return db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  },
  /** Prune a dead endpoint (404/410 on send, server-side) — scoped by endpoint. */
  async deleteByEndpoint(endpoint: string): Promise<void> {
    const db = getDb();
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  },
  /** Owner-scoped delete for a user-initiated unsubscribe (no IDOR). */
  async deleteForUser(endpoint: string, userId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId),
        ),
      );
  },
};
