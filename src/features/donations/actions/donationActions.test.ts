import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable env stub (vi.hoisted — the mock factory is hoisted above const decls).
const env = vi.hoisted(() => ({
  PAYMENTS_ENABLED: true as boolean,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_key" as string | undefined,
}));
vi.mock("@/config/env", () => ({ env }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => null }),
}));

// Turnstile gate — default PASS so the amount/flag tests exercise their own paths; one
// test flips it to false to prove the gate blocks minting.
const verifyHuman = vi.fn().mockResolvedValue(true);
vi.mock("@/server/payments/turnstile", () => ({
  verifyTurnstile: (...a: unknown[]) => verifyHuman(...a),
}));

const createOrder = vi.fn();
vi.mock("@/server/payments/razorpay", () => ({
  createRazorpayOrder: (...a: unknown[]) => createOrder(...a),
}));

const createRow = vi.fn();
vi.mock("@/server/db/repositories/donations", () => ({
  donationsRepo: { create: (...a: unknown[]) => createRow(...a) },
}));

import { createDonationOrder } from "./donationActions";

beforeEach(() => {
  env.PAYMENTS_ENABLED = true;
  env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_key";
  verifyHuman.mockReset().mockResolvedValue(true);
  createOrder.mockReset().mockResolvedValue({ id: "order_1", amount: 50000, currency: "INR" });
  createRow.mockReset().mockResolvedValue({ id: "don_1" });
});

describe("createDonationOrder — flag gating (PAY-01)", () => {
  it("is inert when PAYMENTS_ENABLED is off (DISABLED, no order, no row)", async () => {
    env.PAYMENTS_ENABLED = false;
    const res = await createDonationOrder({ amount: 50000 });
    expect(!res.ok && res.code).toBe("DISABLED");
    expect(createOrder).not.toHaveBeenCalled();
    expect(createRow).not.toHaveBeenCalled();
  });
});

describe("createDonationOrder — amount validation", () => {
  it("rejects below the ₹10 minimum (999 paise)", async () => {
    const res = await createDonationOrder({ amount: 999 });
    expect(!res.ok && res.code).toBe("VALIDATION");
    expect(createOrder).not.toHaveBeenCalled();
  });
  it("rejects a non-integer amount", async () => {
    const res = await createDonationOrder({ amount: 1000.5 });
    expect(!res.ok && res.code).toBe("VALIDATION");
    expect(createOrder).not.toHaveBeenCalled();
  });
  it("rejects above the ceiling", async () => {
    const res = await createDonationOrder({ amount: 10_000_001 });
    expect(!res.ok && res.code).toBe("VALIDATION");
    expect(createOrder).not.toHaveBeenCalled();
  });
});

describe("createDonationOrder — Turnstile abuse gate (MED-1)", () => {
  it("refuses to mint when the bot-check fails (TURNSTILE, no order, no row)", async () => {
    verifyHuman.mockResolvedValue(false);
    const res = await createDonationOrder({ amount: 50000 }, "bad-token");
    expect(!res.ok && res.code).toBe("TURNSTILE");
    expect(createOrder).not.toHaveBeenCalled();
    expect(createRow).not.toHaveBeenCalled();
  });
});

describe("createDonationOrder — the client callback never confirms a payment", () => {
  it("writes ONLY status:'created' (never 'paid') and returns order id + keyId", async () => {
    const res = await createDonationOrder({ amount: 50000, name: "Asha", email: "a@b.com" });
    expect(res).toMatchObject({ ok: true, orderId: "order_1", amount: 50000, keyId: "rzp_test_key" });
    expect(createRow).toHaveBeenCalledOnce();
    const row = createRow.mock.calls[0][0];
    expect(row.status).toBe("created");
    expect(row).not.toHaveProperty("razorpayPaymentId");
  });
});
