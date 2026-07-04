import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { verifyWebhookSignature, generateReceiptNumber } from "@/server/payments/razorpay";
import { donationsRepo } from "@/server/db/repositories/donations";
import { inngest } from "@/server/inngest/client";
import { logger } from "@/lib/logger";
import { NOTIFICATION_EVENTS } from "@/config/constants";

/**
 * Razorpay webhook (PAY-02) — the ONLY writer of a 'paid' donation. Webhook-first,
 * HMAC-verified, idempotent. The client callback is cosmetic; truth lands here.
 *
 * force-dynamic: must run per-request (raw body + signature); never cached/prerendered.
 * The route is added to isPublicRoute in middleware (Razorpay authenticates via the
 * HMAC signature, not a Clerk session). Dark until PAYMENTS_ENABLED → 404 while off.
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

  // 3. Idempotency: claim the event id BEFORE any mutation. A replay is a no-op.
  const eventId = req.headers.get("x-razorpay-event-id");
  if (!eventId) {
    logger.warn("razorpay webhook: missing event id");
    return new NextResponse("Bad request", { status: 400 });
  }
  let fresh: boolean;
  try {
    fresh = await donationsRepo.claimWebhookEvent(eventId);
  } catch (e) {
    // A DB error here means we cannot guarantee exactly-once — return 500 so Razorpay
    // retries later rather than dropping the event silently.
    logger.error("razorpay webhook: claim failed", { eventId, err: String(e) });
    return new NextResponse("Server error", { status: 500 });
  }
  if (!fresh) {
    return NextResponse.json({ ok: true, dedup: true });
  }

  // 4. Handle the event. Always 200 on a validly-signed + idempotent-handled event so
  //    Razorpay stops retrying.
  const event = body.event;
  const payment = body.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  try {
    if (event === "payment.captured" && orderId && paymentId) {
      const receiptNumber = generateReceiptNumber();
      const donation = await donationsRepo.markPaid(orderId, {
        razorpayPaymentId: paymentId,
        receiptNumber,
      });
      if (donation) {
        // Best-effort receipt email — a send hiccup must not fail the webhook (the
        // payment is already recorded; Razorpay must not retry over an email blip).
        try {
          await inngest.send({
            name: NOTIFICATION_EVENTS.donationCaptured,
            data: { donationId: donation.id, eventId },
          });
        } catch (e) {
          logger.error("inngest emit donation/captured failed", {
            donationId: donation.id,
            err: String(e),
          });
        }
      } else {
        logger.warn("razorpay webhook: captured order not found", { orderId });
      }
    } else if (event === "payment.failed" && orderId) {
      await donationsRepo.markFailed(orderId, paymentId ?? null);
    }
    // Any other event → no-op (still 200).
  } catch (e) {
    logger.error("razorpay webhook: handler failed", { event, err: String(e) });
    return new NextResponse("Server error", { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
