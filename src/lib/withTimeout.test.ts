import { describe, it, expect, vi } from "vitest";
import { withTimeout } from "./withTimeout";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

describe("withTimeout", () => {
  it("returns the promise's value when it resolves within the budget", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000, "fallback", "test");
    expect(result).toBe("ok");
  });

  it("returns the fallback when the promise exceeds the budget", async () => {
    vi.useFakeTimers();
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("late"), 10_000));
    const raced = withTimeout(slow, 5_000, "fallback", "test");
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await raced).toBe("fallback");
    vi.useRealTimers();
  });

  it("does not swallow a resolved value in favor of the fallback when fast", async () => {
    vi.useFakeTimers();
    const fast = new Promise<number>((resolve) => setTimeout(() => resolve(42), 100));
    const raced = withTimeout(fast, 5_000, -1, "test");
    await vi.advanceTimersByTimeAsync(100);
    expect(await raced).toBe(42);
    vi.useRealTimers();
  });
});
