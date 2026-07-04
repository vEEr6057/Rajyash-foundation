"use server";

import { env } from "@/config/env";
import { createRazorpayOrder } from "@/server/payments/razorpay";
import { donationsRepo } from "@/server/db/repositories/donations";
import { logger } from "@/lib/logger";
import {
  donationOrderSchema,
  type DonationOrderInput,
} from "../validations/donation";

type Result<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };
function fail<T = unknown>(code: string, message: string): Result<T> {
  return { ok: false, code, message };
}

/**
 * PAY-01: mint a Razorpay order for a donation. Webhook-first design — this ONLY
 * records an intent (donations row, status:'created') and returns the order id/keyId
 * the browser Checkout widget needs. It NEVER marks a donation paid; the sole writer
 * of status:'paid' is the HMAC-verified webhook. That separation is the security
 * property: a forged/replayed client callback cannot manufacture a paid donation.
 *
 * Fully gated on PAYMENTS_ENABLED — returns { ok:false, code:"DISABLED" } while dark.
 */
export async function createDonationOrder(
  input: DonationOrderInput,
): Promise<Result<{ orderId: string; amount: number; keyId: string }>> {
  if (!env.PAYMENTS_ENABLED) {
    return fail("DISABLED", "Donations are not enabled yet.");
  }
  const keyId = env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    logger.error("createDonationOrder: PAYMENTS_ENABLED but key id missing");
    return fail("SERVER_ERROR", "Donations are temporarily unavailable.");
  }

  const parsed = donationOrderSchema.safeParse(input);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { amount, name, email } = parsed.data;

  try {
    const order = await createRazorpayOrder({ amount });
    await donationsRepo.create({
      razorpayOrderId: order.id,
      amount,
      currency: "INR",
      status: "created", // only the webhook ever flips this to 'paid'
      donorName: name || null,
      donorEmail: email || null,
    });
    return { ok: true, orderId: order.id, amount, keyId };
  } catch (e) {
    logger.error("createDonationOrder failed", { err: String(e) });
    return fail("SERVER_ERROR", "Could not start the donation. Please try again.");
  }
}
