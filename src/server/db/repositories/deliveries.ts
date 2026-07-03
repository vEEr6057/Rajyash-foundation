import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { notificationDeliveries } from "@/server/db/schema";
import type { ChannelKey } from "@/server/notifications/types";

export const deliveriesRepo = {
  /**
   * Idempotent claim (NOT-05). INSERT ... ON CONFLICT (event_id, recipient_id, channel)
   * DO NOTHING RETURNING id. A returned row => fresh (go send); empty => already
   * delivered (skip). The UNIQUE constraint is the authoritative dedup.
   */
  async claim(
    eventId: string,
    recipientId: string,
    channel: ChannelKey,
  ): Promise<boolean> {
    const db = getDb();
    const rows = await db
      .insert(notificationDeliveries)
      .values({ eventId, recipientId, channel })
      .onConflictDoNothing({
        target: [
          notificationDeliveries.eventId,
          notificationDeliveries.recipientId,
          notificationDeliveries.channel,
        ],
      })
      .returning({ id: notificationDeliveries.id });
    return rows.length > 0;
  },

  /**
   * Release a claim (NOT-05). Called when a send THROWS so the Inngest step retry can
   * re-claim + re-send — otherwise the claim row would persist for a delivery that never
   * happened, and the retry would skip it (a silently lost notification).
   */
  async release(
    eventId: string,
    recipientId: string,
    channel: ChannelKey,
  ): Promise<void> {
    const db = getDb();
    await db
      .delete(notificationDeliveries)
      .where(
        and(
          eq(notificationDeliveries.eventId, eventId),
          eq(notificationDeliveries.recipientId, recipientId),
          eq(notificationDeliveries.channel, channel),
        ),
      );
  },

  /**
   * B3 hygiene sweep: delete dedup-claim rows older than `cutoff` (the dedup window is
   * far longer than the retry window, so old claims are safe to drop). Returns the count.
   */
  async purgeOlderThan(cutoff: Date): Promise<number> {
    const db = getDb();
    const rows = await db
      .delete(notificationDeliveries)
      .where(lt(notificationDeliveries.createdAt, cutoff))
      .returning({ id: notificationDeliveries.id });
    return rows.length;
  },
};
