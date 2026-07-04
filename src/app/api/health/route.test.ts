import { describe, it, expect, vi } from "vitest";

const execute = vi.fn();

vi.mock("@/server/db/client", () => ({
  getDb: () => ({ execute }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { GET } from "./route";

// NOTE: each test sets its own `execute.mockImplementation` (which fully replaces
// the prior one). We deliberately avoid `mockReset` in a `beforeEach` here — under
// vitest v4, a `mockResolvedValue` followed by a reset and a throwing implementation
// mis-attributes the (caught) throw as an unhandled error and fails the test.

describe("GET /api/health", () => {
  it("returns 200 { ok: true, ts } when the db round-trips", async () => {
    execute.mockImplementation(async () => [{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe("string");
  });

  it("returns 503 { ok: false } when the db query fails", async () => {
    execute.mockImplementation(() => {
      throw new Error("connection refused");
    });
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ ok: false });
  });

  it("leaks nothing beyond ok/ts — no error detail, no env", async () => {
    execute.mockImplementation(() => {
      throw new Error("secret host db.internal:5432");
    });
    const res = await GET();
    const body = await res.json();
    expect(Object.keys(body)).toEqual(["ok"]);
    expect(JSON.stringify(body)).not.toContain("db.internal");
  });
});
