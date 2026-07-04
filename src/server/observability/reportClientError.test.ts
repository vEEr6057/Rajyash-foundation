import { describe, it, expect, vi, beforeEach } from "vitest";

const error = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: { error: (...a: unknown[]) => error(...a) },
}));

import { reportClientError } from "./reportClientError";

beforeEach(() => error.mockReset());

describe("reportClientError", () => {
  it("logs a well-formed report", async () => {
    const res = await reportClientError({
      message: "boom",
      digest: "abc123",
      url: "https://app.example/x",
    });
    expect(res).toEqual({ ok: true });
    expect(error).toHaveBeenCalledWith("client-error", {
      message: "boom",
      digest: "abc123",
      url: "https://app.example/x",
    });
  });

  it("truncates oversize input to the caps (500/100/300)", async () => {
    await reportClientError({
      message: "m".repeat(900),
      digest: "d".repeat(400),
      url: "u".repeat(900),
    });
    const [, meta] = error.mock.calls[0] as [
      string,
      { message: string; digest: string; url: string },
    ];
    expect(meta.message.length).toBe(500);
    expect(meta.digest.length).toBe(100);
    expect(meta.url.length).toBe(300);
  });

  it("returns { ok: false } and logs nothing for invalid input (missing message)", async () => {
    // @ts-expect-error — exercising an untrusted client sending the wrong shape
    const res = await reportClientError({ digest: "x" });
    expect(res).toEqual({ ok: false });
    expect(error).not.toHaveBeenCalled();
  });

  it("drops a non-string message safely", async () => {
    // @ts-expect-error — untrusted client sending a number
    const res = await reportClientError({ message: 42 });
    expect(res).toEqual({ ok: false });
    expect(error).not.toHaveBeenCalled();
  });
});
