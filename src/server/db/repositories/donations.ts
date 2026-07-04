import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  donations,
  webhookEvents,
  type Donation,
  type NewDonation,
} from "@/server/db/schema";

/** Outcome of an atomic webhook-capture record. */
export type CaptureOutcome =
  | { outcome: "dedup" } // event already processed — no-op
  | { outcome: "not_found" } // signed capture for an order we don't have
  | { outcome: "paid"; donation: Donation };

/** Outcome of an atomic webhook-failure record. */
export type FailedOutcome = { outcome: "dedup" } | { outcome: "recorded" };

/** Data-access for the Razorpay donation scaffold (PAY-01/PAY-02). */
export const donationsRepo = {
  /** Insert a freshly-created order row (status:'created'). Never sets 'paid'. */
  async create(input: NewDonation): Promise<Donation> {
    const db = getDb();
    const rows = await db.insert(donations).values(input).returning();
    return rows[0];
  },

  async getById(id: string): Promise<Donation | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(donations)
      .where(eq(donations.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  /**
   * Atomic idempotent capture (PAY-02). The webhook_events claim and the donation
   * mutation commit-or-rollback TOGETHER in one transaction. Critical correctness: if
   * the UPDATE throws (transient DB error), the claim is rolled back too — so a Razorpay
   * re-delivery re-processes rather than being deduped into a LOST payment. A committed
   * claim only ever coexists with a committed status change.
   *
   *  - 0 rows from the claim insert ⇒ replay ⇒ { outcome: 'dedup' } (no mutation).
   *  - claim inserted, 0 rows updated ⇒ { outcome: 'not_found' } (unknown order; a retry
   *    won't help, so the claim is allowed to commit and the caller logs it).
   *  - claim inserted + row updated ⇒ { outcome: 'paid', donation }.
   */
  async recordCapture(
    eventId: string,
    razorpayOrderId: string,
    fields: { razorpayPaymentId: string; receiptNumber: string },
  ): Promise<CaptureOutcome> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const claimed = await tx
        .insert(webhookEvents)
        .values({ eventId })
        .onConflictDoNothing()
        .returning({ eventId: webhookEvents.eventId });
      if (claimed.length === 0) return { outcome: "dedup" };

      const rows = await tx
        .update(donations)
        .set({
          status: "paid",
          razorpayPaymentId: fields.razorpayPaymentId,
          receiptNumber: fields.receiptNumber,
          updatedAt: new Date(),
        })
        .where(eq(donations.razorpayOrderId, razorpayOrderId))
        .returning();
      if (rows.length === 0) return { outcome: "not_found" };
      return { outcome: "paid", donation: rows[0] };
    });
  },

  /**
   * Atomic idempotent failure record (PAY-02) — claim + markFailed in one transaction,
   * same rollback-on-throw guarantee as recordCapture. A missing order row is not an
   * error for a failed payment (nothing to mark); the claim still commits.
   */
  async recordFailed(
    eventId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string | null,
  ): Promise<FailedOutcome> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const claimed = await tx
        .insert(webhookEvents)
        .values({ eventId })
        .onConflictDoNothing()
        .returning({ eventId: webhookEvents.eventId });
      if (claimed.length === 0) return { outcome: "dedup" };

      await tx
        .update(donations)
        .set({
          status: "failed",
          razorpayPaymentId: razorpayPaymentId ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(donations.razorpayOrderId, razorpayOrderId));
      return { outcome: "recorded" };
    });
  },
};
