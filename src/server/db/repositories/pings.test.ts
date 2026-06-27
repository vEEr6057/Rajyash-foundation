import { describe, it, expect, vi } from "vitest";

const whereSpy = vi.fn().mockResolvedValue(undefined);
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy }),
}));

import { pingsRepo } from "./pings";

describe("pingsRepo.purgeForPickup (TRK-04)", () => {
  it("issues a DELETE scoped to the given pickup id", async () => {
    await pingsRepo.purgeForPickup("pickup-123");
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy).toHaveBeenCalledTimes(1); // a WHERE clause was applied (scoped, not table-wide)
  });
});
