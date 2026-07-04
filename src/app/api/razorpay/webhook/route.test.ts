import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

const env = vi.hoisted(() => ({
  PAYMENTS_ENABLED: true as boolean,
  RAZORPAY_WEBHOOK_SECRET: "whsec_test" as string | undefined,
}));
vi.mock("@/config/env", () => ({ env }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const recordCapture = vi.fn();
const recordFailed = vi.fn();
vi.mock("@/server/db/repositories/donations", () => ({
  donationsRepo: {
    recordCapture: (...a: unknown[]) => recordCapture(...a),
    recordFailed: (...a: unknown[]) => recordFailed(...a),
  },
}));

const send = vi.fn();
vi.mock("@/server/inngest/client", () => ({ inngest: { send: (...a: unknown[]) => send(...a) } }));

import { POST } from "./route";

const CAPTURED = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
});
const FAILED = JSON.stringify({
  event: "payment.failed",
  payload: { payment: { entity: { id: "pay_2", order_id: "order_2" } } },
});
const UNKNOWN = JSON.stringify({ event: "payment.authorized", payload: {} });

const sign = (body: string, secret = "whsec_test") =>
  createHmac("sha256", secret).update(body).digest("hex");

function req(body: string, headers: Record<string, string>) {
  return new Request("https://x/api/razorpay/webhook", { method: "POST", body, headers });
}
const hdr = (body: string, evt = "evt_1") => ({
  "x-razorpay-signature": sign(body),
  "x-razorpay-event-id": evt,
});

beforeEach(() => {
  env.PAYMENTS_ENABLED = true;
  env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
  recordCapture.mockReset().mockResolvedValue({ outcome: "paid", donation: { id: "don_1" } });
  recordFailed.mockReset().mockResolvedValue({ outcome: "recorded" });
  send.mockReset().mockResolvedValue(undefined);
});

describe("razorpay webhook (PAY-02)", () => {
  it("404s while PAYMENTS_ENABLED is off — no body read, no side effects", async () => {
    env.PAYMENTS_ENABLED = false;
    const res = await POST(req(CAPTURED, hdr(CAPTURED)));
    expect(res.status).toBe(404);
    expect(recordCapture).not.toHaveBeenCalled();
  });

  it("400s on an invalid signature — no mutation", async () => {
    const res = await POST(
      req(CAPTURED, { "x-razorpay-signature": "deadbeef", "x-razorpay-event-id": "evt_1" }),
    );
    expect(res.status).toBe(400);
    expect(recordCapture).not.toHaveBeenCalled();
  });

  it("400s when x-razorpay-event-id is missing on a captured event", async () => {
    const res = await POST(req(CAPTURED, { "x-razorpay-signature": sign(CAPTURED) }));
    expect(res.status).toBe(400);
    expect(recordCapture).not.toHaveBeenCalled();
  });

  it("records the capture + emits the receipt event on a valid payment.captured", async () => {
    const res = await POST(req(CAPTURED, hdr(CAPTURED)));
    expect(res.status).toBe(200);
    expect(recordCapture).toHaveBeenCalledOnce();
    const [eventId, orderId, fields] = recordCapture.mock.calls[0];
    expect(eventId).toBe("evt_1");
    expect(orderId).toBe("order_1");
    expect(fields.razorpayPaymentId).toBe("pay_1");
    expect(fields.receiptNumber).toMatch(/^RJ-FY/);
    expect(send).toHaveBeenCalledOnce();
  });

  it("is idempotent — a dedup outcome is a 200 no-op with no receipt email", async () => {
    recordCapture.mockResolvedValueOnce({ outcome: "dedup" });
    const res = await POST(req(CAPTURED, hdr(CAPTURED)));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ dedup: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("logs + 200 (no receipt) when the captured order is not found", async () => {
    recordCapture.mockResolvedValueOnce({ outcome: "not_found" });
    const res = await POST(req(CAPTURED, hdr(CAPTURED)));
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("500s when recordCapture throws (tx rolled back) so Razorpay retries", async () => {
    recordCapture.mockRejectedValueOnce(new Error("transient db error"));
    const res = await POST(req(CAPTURED, hdr(CAPTURED)));
    expect(res.status).toBe(500);
    expect(send).not.toHaveBeenCalled();
  });

  it("a failed delivery that 500s re-processes cleanly on the retry (no dedup swallow)", async () => {
    // 1st delivery: the atomic record throws → 500, nothing emitted.
    recordCapture.mockRejectedValueOnce(new Error("transient db error"));
    const first = await POST(req(CAPTURED, hdr(CAPTURED)));
    expect(first.status).toBe(500);
    expect(send).not.toHaveBeenCalled();
    // Razorpay re-delivers the SAME event id: because the earlier claim rolled back,
    // recordCapture now succeeds and the receipt is emitted (not deduped away).
    recordCapture.mockResolvedValueOnce({ outcome: "paid", donation: { id: "don_1" } });
    const retry = await POST(req(CAPTURED, hdr(CAPTURED)));
    expect(retry.status).toBe(200);
    expect(recordCapture).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledOnce();
  });

  it("records failed on payment.failed", async () => {
    const res = await POST(req(FAILED, hdr(FAILED, "evt_2")));
    expect(res.status).toBe(200);
    expect(recordFailed).toHaveBeenCalledWith("evt_2", "order_2", "pay_2");
    expect(recordCapture).not.toHaveBeenCalled();
  });

  it("no-ops an unknown event WITHOUT claiming (200, no repo call)", async () => {
    const res = await POST(req(UNKNOWN, hdr(UNKNOWN, "evt_9")));
    expect(res.status).toBe(200);
    expect(recordCapture).not.toHaveBeenCalled();
    expect(recordFailed).not.toHaveBeenCalled();
  });
});
