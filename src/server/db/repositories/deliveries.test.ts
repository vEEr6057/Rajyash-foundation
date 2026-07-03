import { describe, it, expect, vi } from "vitest";

const returningSpy = vi.fn().mockResolvedValue([{ id: "1" }]);
const whereSpy = vi.fn(() => ({ returning: returningSpy }));
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy }),
}));

import { deliveriesRepo } from "./deliveries";

describe("deliveriesRepo.purgeOlderThan (B3 hygiene)", () => {
  it("issues an age-scoped DELETE and returns the purged count", async () => {
    const n = await deliveriesRepo.purgeOlderThan(new Date("2026-04-01"));
    expect(deleteSpy).toHaveBeenCalled();
    expect(whereSpy).toHaveBeenCalled(); // WHERE created_at < cutoff
    expect(returningSpy).toHaveBeenCalled();
    expect(n).toBe(1);
  });
});
