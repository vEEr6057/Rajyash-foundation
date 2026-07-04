import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

const env = vi.hoisted(() => ({
  PAYMENTS_ENABLED: true as boolean,
  RAZORPAY_WEBHOOK_SECRET: "whsec_test" as string | undefined,
}));
vi.mock("@/config/env", () => ({ env }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const claim = vi.fn();
const markPaid = vi.fn();
const markFailed = vi.fn();
vi.mock("@/server/db/repositories/donations", () => ({
  donationsRepo: {
    claimWebhookEvent: (...a: unknown[]) => claim(...a),
    markPaid: (...a: unknown[]) => markPaid(...a),
    markFailed: (...a: unknown[]) => markFailed(...a),
  },
}));

const send = vi.fn();
vi.mock("@/server/inngest/client", () => ({ inngest: { send: (...a: unknown[]) => send(...a) } }));

import { POST } from "./route";

const CAPTURED = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
});
const sign = (body: string, secret = "whsec_test") =>
  createHmac("sha256", secret).update(body).digest("hex");

function req(body: string, headers: Record<string, string>) {
  return new Request("https://x/api/razorpay/webhook", { method: "POST", body, headers });
}

beforeEach(() => {
  env.PAYMENTS_ENABLED = true;
  env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
  claim.mockReset().mockResolvedValue(true);
  markPaid.mockReset().mockResolvedValue({ id: "don_1" });
  markFailed.mockReset().mockResolvedValue(undefined);
  send.mockReset().mockResolvedValue(undefined);
});

describe("razorpay webhook (PAY-02)", () => {
  it("404s while PAYMENTS_ENABLED is off — no body read, no side effects", async () => {
    env.PAYMENTS_ENABLED = false;
    const res = await POST(req(CAPTURED, { "x-razorpay-signature": sign(CAPTURED), "x-razorpay-event-id": "evt_1" }));
    expect(res.status).toBe(404);
    expect(claim).not.toHaveBeenCalled();
    expect(markPaid).not.toHaveBeenCalled();
  });

  it("400s on an invalid signature — no mutation", async () => {
    const res = await POST(req(CAPTURED, { "x-razorpay-signature": "deadbeef", "x-razorpay-event-id": "evt_1" }));
    expect(res.status).toBe(400);
    expect(claim).not.toHaveBeenCalled();
    expect(markPaid).not.toHaveBeenCalled();
  });

  it("marks paid + emits the receipt event on a valid payment.captured", async () => {
    const res = await POST(req(CAPTURED, { "x-razorpay-signature": sign(CAPTURED), "x-razorpay-event-id": "evt_1" }));
    expect(res.status).toBe(200);
    expect(markPaid).toHaveBeenCalledOnce();
    const [orderId, fields] = markPaid.mock.calls[0];
    expect(orderId).toBe("order_1");
    expect(fields.razorpayPaymentId).toBe("pay_1");
    expect(fields.receiptNumber).toMatch(/^RJ-FY/);
    expect(send).toHaveBeenCalledOnce();
  });

  it("is idempotent — a replayed event id is a dedup no-op with no second mutation", async () => {
    claim.mockResolvedValueOnce(false); // event already recorded
    const res = await POST(req(CAPTURED, { "x-razorpay-signature": sign(CAPTURED), "x-razorpay-event-id": "evt_1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ dedup: true });
    expect(markPaid).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("marks failed on payment.failed", async () => {
    const failed = JSON.stringify({
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_2", order_id: "order_2" } } },
    });
    const res = await POST(req(failed, { "x-razorpay-signature": sign(failed), "x-razorpay-event-id": "evt_2" }));
    expect(res.status).toBe(200);
    expect(markFailed).toHaveBeenCalledWith("order_2", "pay_2");
    expect(markPaid).not.toHaveBeenCalled();
  });
});
