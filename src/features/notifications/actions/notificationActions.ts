"use server";

import { getSession } from "@/server/auth/session";
import { notificationsRepo } from "@/server/db/repositories/notifications";
import { pushSubsRepo } from "@/server/db/repositories/pushSubs";
import { logger } from "@/lib/logger";
import {
  pushSubscriptionSchema,
  type PushSubscriptionInput,
} from "../validations/pushSubscription";
import type { Notification } from "@/server/db/schema";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };
function fail<T = unknown>(code: string, message: string): Result<T> {
  return { ok: false, code, message };
}

/** NOT-01: the current user's notification feed (newest first). */
export async function listNotifications(): Promise<
  Result<{ items: Notification[] }>
> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  const items = await notificationsRepo.listForUser(session.userId);
  return { ok: true, items };
}

/** NOT-01: unread count for the bell badge. */
export async function getUnreadCount(): Promise<Result<{ count: number }>> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  const count = await notificationsRepo.unreadCount(session.userId);
  return { ok: true, count };
}

/** NOT-01: mark one notification read — scoped to the owner (no IDOR). */
export async function markNotificationRead(id: string): Promise<Result> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  if (!id) return fail("VALIDATION", "Missing id.");
  await notificationsRepo.markRead(id, session.userId); // WHERE id = ? AND user_id = ?
  return { ok: true };
}

/** NOT-01: mark all the current user's notifications read. */
export async function markAllNotificationsRead(): Promise<Result> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  await notificationsRepo.markAllRead(session.userId);
  return { ok: true };
}

/** NOT-02 persistence (consumed by the push client). Owner-scoped + validated (V5). */
export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<Result> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid subscription",
    );
  try {
    await pushSubsRepo.upsertByEndpoint({
      userId: session.userId,
      ...parsed.data,
    });
    return { ok: true };
  } catch (e) {
    logger.error("savePushSubscription failed", {
      userId: session.userId,
      err: String(e),
    });
    return fail("SERVER_ERROR", "Could not save the subscription.");
  }
}

/** NOT-02: remove a subscription on unsubscribe (owner-initiated). */
export async function deletePushSubscription(
  endpoint: string,
): Promise<Result> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in first.");
  if (!endpoint) return fail("VALIDATION", "Missing endpoint.");
  await pushSubsRepo.deleteForUser(endpoint, session.userId); // owner-scoped (no IDOR)
  return { ok: true };
}
