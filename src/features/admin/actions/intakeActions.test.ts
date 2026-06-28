import { describe, it, expect, vi, beforeEach } from "vitest";

const requireRole = vi.fn();
vi.mock("@/server/auth/session", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  AuthError: class AuthError extends Error {},
}));

const create = vi.fn();
const verify = vi.fn();
const unverify = vi.fn();
vi.mock("@/server/db/repositories/pickups", () => ({
  pickupsRepo: {
    create: (...a: unknown[]) => create(...a),
    verify: (...a: unknown[]) => verify(...a),
    unverify: (...a: unknown[]) => unverify(...a),
  },
}));

const getById = vi.fn();
vi.mock("@/server/db/repositories/partners", () => ({
  partnersRepo: { getById: (...a: unknown[]) => getById(...a) },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import { logSurplus, verifyPickup, unverifyPickup } from "./intakeActions";

const VALID_INPUT = {
  category: "cooked_meal" as const,
  quantity: 50,
  quantityUnit: "servings" as const,
  windowStart: new Date("2026-07-01T08:00:00Z"),
  windowEnd: new Date("2026-07-01T10:00:00Z"),
  address: "123 Main St, Ahmedabad",
  lat: 23.02,
  lng: 72.57,
  safetyAttested: true as const,
};

beforeEach(() => {
  requireRole.mockResolvedValue({ userId: "admin-1", role: "admin" });
  getById.mockResolvedValue({ id: "p1", name: "ABC Restaurant" });
  create.mockResolvedValue({ id: "pickup-1" });
  verify.mockResolvedValue({ id: "pickup-1", verifiedAt: new Date() });
  unverify.mockResolvedValue({ id: "pickup-1", verifiedAt: null });
});

describe("logSurplus (INT-02)", () => {
  it("returns FORBIDDEN for non-admin", async () => {
    requireRole.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const r = await logSurplus("p1", VALID_INPUT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns VALIDATION when partnerId is empty string", async () => {
    const r = await logSurplus("", VALID_INPUT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
  });

  it("returns VALIDATION when partner not found in DB", async () => {
    getById.mockResolvedValueOnce(null);
    const r = await logSurplus("unknown-partner", VALID_INPUT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("VALIDATION");
  });

  it("creates pickup with partnerId and donorId=adminId on happy path", async () => {
    const r = await logSurplus("p1", VALID_INPUT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.id).toBe("pickup-1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: "p1", donorId: "admin-1", safetyAttested: true }),
    );
  });
});

describe("verifyPickup (INT-03)", () => {
  it("returns FORBIDDEN for non-admin", async () => {
    requireRole.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const r = await verifyPickup("pickup-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
  });

  it("sets verifiedAt on happy path", async () => {
    const r = await verifyPickup("pickup-1");
    expect(r.ok).toBe(true);
    expect(verify).toHaveBeenCalledWith("pickup-1", "admin-1");
  });

  it("returns NOT_FOUND when repo returns null", async () => {
    verify.mockResolvedValueOnce(null);
    const r = await verifyPickup("missing");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });
});

describe("unverifyPickup (INT-03)", () => {
  it("returns FORBIDDEN for non-admin", async () => {
    requireRole.mockRejectedValueOnce(new Error("FORBIDDEN"));
    const r = await unverifyPickup("pickup-1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FORBIDDEN");
  });

  it("clears verifiedAt on happy path", async () => {
    const r = await unverifyPickup("pickup-1");
    expect(r.ok).toBe(true);
    expect(unverify).toHaveBeenCalledWith("pickup-1");
  });
});
