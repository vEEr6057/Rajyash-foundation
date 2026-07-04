import { describe, it, expect, vi, beforeEach } from "vitest";

const requireRole = vi.fn();
vi.mock("@/server/auth/session", () => ({
  requireRole: (...a: unknown[]) => requireRole(...a),
  AuthError: class AuthError extends Error {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

const create = vi.fn();
const update = vi.fn();
const del = vi.fn();
vi.mock("@/server/db/repositories/destinations", () => ({
  destinationsRepo: {
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import {
  createDestination,
  updateDestination,
  deleteDestination,
} from "./destinationActions";

const VALID = {
  name: "Satellite Zone",
  address: "Satellite, Ahmedabad",
  lat: 23.022,
  lng: 72.571,
};

beforeEach(() => {
  requireRole.mockReset().mockResolvedValue({ userId: "admin-1", role: "admin" });
  create.mockReset();
  update.mockReset();
  del.mockReset();
});

describe("createDestination", () => {
  it("blocks non-admins (FORBIDDEN) with no DB write", async () => {
    requireRole.mockRejectedValueOnce(new Error("no"));
    const res = await createDestination(VALID);
    expect(res.ok).toBe(false);
    expect(!res.ok && res.code).toBe("FORBIDDEN");
    expect(create).not.toHaveBeenCalled();
  });
  it("rejects invalid input (VALIDATION) with no DB write", async () => {
    const res = await createDestination({ ...VALID, name: "" });
    expect(!res.ok && res.code).toBe("VALIDATION");
    expect(create).not.toHaveBeenCalled();
  });
  it("creates on valid admin input", async () => {
    create.mockResolvedValue({ id: "d1" });
    const res = await createDestination(VALID);
    expect(res).toMatchObject({ ok: true, id: "d1" });
    expect(create).toHaveBeenCalledOnce();
  });
});

describe("updateDestination", () => {
  it("blocks non-admins (FORBIDDEN)", async () => {
    requireRole.mockRejectedValueOnce(new Error("no"));
    const res = await updateDestination("d1", VALID);
    expect(!res.ok && res.code).toBe("FORBIDDEN");
  });
  it("updates on valid input", async () => {
    update.mockResolvedValue({ id: "d1" });
    const res = await updateDestination("d1", VALID);
    expect(res.ok).toBe(true);
  });
  it("returns NOT_FOUND when the row is missing", async () => {
    update.mockResolvedValue(null);
    const res = await updateDestination("nope", VALID);
    expect(!res.ok && res.code).toBe("NOT_FOUND");
  });
});

describe("deleteDestination", () => {
  it("blocks non-admins (FORBIDDEN) with no DB write", async () => {
    requireRole.mockRejectedValueOnce(new Error("no"));
    const res = await deleteDestination("d1");
    expect(!res.ok && res.code).toBe("FORBIDDEN");
    expect(del).not.toHaveBeenCalled();
  });
  it("deletes on admin", async () => {
    del.mockResolvedValue(undefined);
    const res = await deleteDestination("d1");
    expect(res.ok).toBe(true);
    expect(del).toHaveBeenCalledWith("d1");
  });
  it("maps a FK violation to CONFLICT (used by past runs) instead of a generic error", async () => {
    del.mockRejectedValue(new Error('update or delete violates foreign key constraint "23503"'));
    const res = await deleteDestination("d1");
    expect(!res.ok && res.code).toBe("CONFLICT");
    expect(!res.ok && res.message).toMatch(/inactive/i);
  });
});
