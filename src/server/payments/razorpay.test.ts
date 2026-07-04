import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";

// env is imported transitively — stub it so the module loads and we control the secret.
vi.mock("@/config/env", () => ({
  env: {
    RAZORPAY_WEBHOOK_SECRET: "whsec_test",
    RAZORPAY_KEY_ID: "rzp_test_key",
    RAZORPAY_KEY_SECRET: "rzp_test_secret",
  },
}));

import {
  verifyWebhookSignature,
  createRazorpayOrder,
  generateReceiptNumber,
  financialYear,
} from "./razorpay";

/** Independent oracle: Razorpay signs the raw body with HMAC-SHA256 hex. */
function sign(body: string, secret = "whsec_test"): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

const RAW = JSON.stringify({ event: "payment.captured", payload: { x: 1 } });

describe("verifyWebhookSignature (PAY-02 HMAC)", () => {
  it("accepts a correctly-signed body", async () => {
    await expect(verifyWebhookSignature(RAW, sign(RAW))).resolves.toBe(true);
  });

  it("rejects a tampered body (same signature, changed bytes)", async () => {
    const good = sign(RAW);
    await expect(verifyWebhookSignature(RAW + " ", good)).resolves.toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const good = sign(RAW);
    const bad = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
    await expect(verifyWebhookSignature(RAW, bad)).resolves.toBe(false);
  });

  it("rejects a signature signed with the wrong secret", async () => {
    await expect(
      verifyWebhookSignature(RAW, sign(RAW, "attacker_secret")),
    ).resolves.toBe(false);
  });

  it("rejects a missing signature header", async () => {
    await expect(verifyWebhookSignature(RAW, null)).resolves.toBe(false);
  });
});

describe("createRazorpayOrder (PAY-01 orders API via fetch)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("POSTs to the orders API with Basic auth and returns the order", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ id: "order_1", amount: 5000, currency: "INR", status: "created" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const order = await createRazorpayOrder({ amount: 5000 });
    expect(order.id).toBe("order_1");

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect((opts.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    expect(JSON.parse(opts.body as string)).toMatchObject({ amount: 5000, currency: "INR" });
  });

  it("throws on a non-2xx from Razorpay", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(createRazorpayOrder({ amount: 5000 })).rejects.toThrow();
  });
});

describe("receipt numbering", () => {
  it("computes the Indian financial year (Apr–Mar)", () => {
    expect(financialYear(new Date("2026-04-01T00:00:00Z"))).toBe("2026-27");
    expect(financialYear(new Date("2026-01-15T00:00:00Z"))).toBe("2025-26");
    expect(financialYear(new Date("2026-12-31T00:00:00Z"))).toBe("2026-27");
  });

  it("formats a receipt number as RJ-FY<year>-<short>", () => {
    const r = generateReceiptNumber(new Date("2026-07-01T00:00:00Z"));
    expect(r).toMatch(/^RJ-FY2026-27-[0-9A-F]{6}$/);
  });
});
