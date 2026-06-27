import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  notifications,
  type NewNotification,
  type Notification,
} from "@/server/db/schema";

export const notificationsRepo = {
  async insert(input: NewNotification): Promise<Notification> {
    const db = getDb();
    const rows = await db.insert(notifications).values(input).returning();
    return rows[0];
  },
  /** Recent feed for a user, newest first (scoped by the caller — no IDOR). */
  async listForUser(userId: string, limit = 30): Promise<Notification[]> {
    const db = getDb();
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  },
  /** Unread count for the bell badge. */
  async unreadCount(userId: string): Promise<number> {
    const db = getDb();
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return rows[0]?.n ?? 0;
  },
  /** Mark one as read — scoped to the owner (no IDOR). */
  async markRead(id: string, userId: string): Promise<void> {
    const db = getDb();
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  },
  /** Mark all unread as read for a user. */
  async markAllRead(userId: string): Promise<void> {
    const db = getDb();
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  },
};
