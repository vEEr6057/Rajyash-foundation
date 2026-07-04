import "server-only";
import { env } from "@/config/env";

/**
 * Razorpay integration primitives (PAY-01/PAY-02). Deliberately NO Node SDK — we talk
 * to Razorpay over `fetch` so this runs unchanged on the Cloudflare Workers runtime, and
 * we verify webhooks with WebCrypto (mirrors src/server/notifications/push.ts). Every
 * function here is inert until PAYMENTS_ENABLED is on and real keys are present; callers
 * gate on the flag first.
 */

const ORDERS_ENDPOINT = "https://api.razorpay.com/v1/orders";

/** HMAC-SHA256(body) hex digest, keyed by `secret`, via WebCrypto (Workers-safe). */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time comparison of two hex strings. Length-independent early-out is safe
 * (a length mismatch is not secret), but the per-char loop must not short-circuit —
 * otherwise timing leaks how many leading bytes matched.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify a Razorpay webhook signature (PAY-02 step 2). `rawBody` MUST be the exact
 * bytes received (read via req.text() BEFORE any JSON parse) — re-serializing the
 * parsed JSON changes whitespace/ordering and breaks the HMAC. Returns false (never
 * throws) when the secret is unset or the signature is missing/malformed, so the caller
 * can uniformly answer 400.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = await hmacSha256Hex(secret, rawBody);
  return timingSafeEqualHex(expected, signatureHeader);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Create a Razorpay order (PAY-01) via the REST Orders API with Basic auth
 * (base64 of key_id:key_secret). Throws when keys are unset or Razorpay returns
 * non-2xx — the caller maps that to a generic failure Result, never leaking details.
 */
export async function createRazorpayOrder(input: {
  amount: number; // paise
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("razorpay keys not configured");
  }
  const auth = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(ORDERS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  if (!res.ok) {
    throw new Error(`razorpay orders ${res.status}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/**
 * Indian financial-year label (Apr 1 – Mar 31) for a receipt, e.g. "2026-27".
 * April onward belongs to the year that just started; Jan–Mar to the prior FY.
 */
export function financialYear(date = new Date()): string {
  const y = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 3 ? y : y - 1; // month is 0-indexed; 3 = April
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYY}`;
}

/**
 * Human-readable 80G receipt number, e.g. "RJ-FY2026-27-9F3AC1". The random suffix is
 * uniqueness insurance; the DB `receipt_number` UNIQUE constraint is the real guard.
 */
export function generateReceiptNumber(date = new Date()): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `RJ-FY${financialYear(date)}-${suffix}`;
}
