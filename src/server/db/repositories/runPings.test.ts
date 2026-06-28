import { describe, it, expect, vi } from "vitest";

const whereSpy = vi.fn().mockResolvedValue(undefined);
const deleteSpy = vi.fn(() => ({ where: whereSpy }));

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ delete: deleteSpy }),
}));

import { runPingsRepo } from "./runPings";

describe("runPingsRepo.purgeForRun (TRK-05)", () => {
  it("issues a DELETE scoped to the given run id", async () => {
    await runPingsRepo.purgeForRun("run-abc");
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });
});
