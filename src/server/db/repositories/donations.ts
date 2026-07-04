import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import {
  donations,
  webhookEvents,
  type Donation,
  type NewDonation,
} from "@/server/db/schema";

/** Data-access for the Razorpay donation scaffold (PAY-01/PAY-02). */
export const donationsRepo = {
  /** Insert a freshly-created order row (status:'created'). Never sets 'paid'. */
  async create(input: NewDonation): Promise<Donation> {
    const db = getDb();
    const rows = await db.insert(donations).values(input).returning();
    return rows[0];
  },

  async getByOrderId(razorpayOrderId: string): Promise<Donation | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(donations)
      .where(eq(donations.razorpayOrderId, razorpayOrderId))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Flip a row to paid at capture — sets paymentId + receipt (webhook only). */
  async markPaid(
    razorpayOrderId: string,
    fields: { razorpayPaymentId: string; receiptNumber: string },
  ): Promise<Donation | null> {
    const db = getDb();
    const rows = await db
      .update(donations)
      .set({
        status: "paid",
        razorpayPaymentId: fields.razorpayPaymentId,
        receiptNumber: fields.receiptNumber,
        updatedAt: new Date(),
      })
      .where(eq(donations.razorpayOrderId, razorpayOrderId))
      .returning();
    return rows[0] ?? null;
  },

  async markFailed(
    razorpayOrderId: string,
    razorpayPaymentId: string | null,
  ): Promise<void> {
    const db = getDb();
    await db
      .update(donations)
      .set({
        status: "failed",
        razorpayPaymentId: razorpayPaymentId ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(donations.razorpayOrderId, razorpayOrderId));
  },

  /**
   * Idempotency claim (PAY-02 step 3). INSERT the event id ON CONFLICT DO NOTHING;
   * returns true when THIS call inserted the row (fresh — proceed) and false when the
   * event was already recorded (replay — skip all side effects).
   */
  async claimWebhookEvent(eventId: string): Promise<boolean> {
    const db = getDb();
    const rows = await db
      .insert(webhookEvents)
      .values({ eventId })
      .onConflictDoNothing()
      .returning({ eventId: webhookEvents.eventId });
    return rows.length > 0;
  },
};
