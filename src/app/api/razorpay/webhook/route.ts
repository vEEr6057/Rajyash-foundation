import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { verifyWebhookSignature, generateReceiptNumber } from "@/server/payments/razorpay";
import { donationsRepo } from "@/server/db/repositories/donations";
import { inngest } from "@/server/inngest/client";
import { logger } from "@/lib/logger";
import { NOTIFICATION_EVENTS } from "@/config/constants";

/**
 * Razorpay webhook (PAY-02) — the ONLY writer of a 'paid' donation. Webhook-first,
 * HMAC-verified, ATOMICALLY idempotent. The client callback is cosmetic; truth lands here.
 *
 * force-dynamic: must run per-request (raw body + signature); never cached/prerendered.
 * The route is added to isPublicRoute in middleware (Razorpay authenticates via the
 * HMAC signature, not a Clerk session). Dark until PAYMENTS_ENABLED → 404 while off.
 *
 * Idempotency is atomic: the dedup claim and the donation mutation commit-or-rollback
 * together inside donationsRepo.recordCapture/recordFailed. A transient DB failure during
 * the mutation rolls back the claim, so a Razorpay re-delivery re-processes instead of
 * being deduped into a lost payment. The Inngest receipt event is emitted OUTSIDE the
 * transaction, only after it commits with outcome 'paid'.
 */
export const dynamic = "force-dynamic";

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
}
interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
  };
}

export async function POST(req: Request) {
  // Flag gate: while dark, the endpoint does not exist.
  if (!env.PAYMENTS_ENABLED) {
    return new NextResponse("Not found", { status: 404 });
  }

  // 1. RAW body FIRST — the HMAC is over the exact received bytes. Parsing then
  //    re-serializing would change whitespace/key order and break verification.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  // 2. Verify signature. Invalid → 400, no side effects.
  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    logger.warn("razorpay webhook bad sig");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Signature is valid → the body is trustworthy to parse.
  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(rawBody) as RazorpayWebhookBody;
  } catch {
    logger.warn("razorpay webhook: signed body was not JSON");
    return new NextResponse("Bad request", { status: 400 });
  }

  // 3. Branch on event type FIRST. Only the mutating events (captured/failed) claim the
  //    webhook_events id — an unknown event is a no-op and must NOT consume a claim (a
  //    replayed no-op is still a no-op).
  const event = body.event;
  const payment = body.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  if (event === "payment.captured") {
    const eventId = req.headers.get("x-razorpay-event-id");
    if (!eventId) {
      logger.warn("razorpay webhook: missing event id");
      return new NextResponse("Bad request", { status: 400 });
    }
    if (!orderId || !paymentId) {
      // Signed but malformed captured payload — cannot process; log and 200 (retries
      // won't change the payload). Manual reconciliation via the Razorpay dashboard.
      logger.warn("razorpay webhook: captured payload missing ids", { eventId });
      return NextResponse.json({ ok: true });
    }
    try {
      const receiptNumber = generateReceiptNumber();
      const result = await donationsRepo.recordCapture(eventId, orderId, {
        razorpayPaymentId: paymentId,
        receiptNumber,
      });
      if (result.outcome === "dedup") {
        return NextResponse.json({ ok: true, dedup: true });
      }
      if (result.outcome === "not_found") {
        logger.warn("razorpay webhook: captured order not found", { orderId });
        return NextResponse.json({ ok: true });
      }
      // outcome === 'paid' — the claim + mutation are committed. Emit the receipt event
      // OUTSIDE the transaction, best-effort: a send hiccup must not fail the webhook
      // (the payment is recorded; Razorpay must not retry over an email blip).
      try {
        await inngest.send({
          name: NOTIFICATION_EVENTS.donationCaptured,
          data: { donationId: result.donation.id, eventId },
        });
      } catch (e) {
        logger.error("inngest emit donation/captured failed", {
          donationId: result.donation.id,
          err: String(e),
        });
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      // The transaction rolled back (claim + mutation both undone) — 500 so Razorpay
      // retries and the re-delivery re-processes cleanly.
      logger.error("razorpay webhook: recordCapture failed", { eventId, err: String(e) });
      return new NextResponse("Server error", { status: 500 });
    }
  }

  if (event === "payment.failed") {
    const eventId = req.headers.get("x-razorpay-event-id");
    if (!eventId) {
      logger.warn("razorpay webhook: missing event id");
      return new NextResponse("Bad request", { status: 400 });
    }
    if (!orderId) {
      logger.warn("razorpay webhook: failed payload missing order id", { eventId });
      return NextResponse.json({ ok: true });
    }
    try {
      const result = await donationsRepo.recordFailed(eventId, orderId, paymentId ?? null);
      if (result.outcome === "dedup") {
        return NextResponse.json({ ok: true, dedup: true });
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      logger.error("razorpay webhook: recordFailed failed", { eventId, err: String(e) });
      return new NextResponse("Server error", { status: 500 });
    }
  }

  // Unknown event → 200 no-op, no claim consumed.
  return NextResponse.json({ ok: true });
}
