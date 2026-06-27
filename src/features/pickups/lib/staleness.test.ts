import { describe, it, expect } from "vitest";
import { isStale, formatLastSeen } from "./staleness";

const NOW = 1_700_000_000_000;
const at = (msAgo: number) => new Date(NOW - msAgo);

describe("isStale (TRK-03)", () => {
  it("is false for a fresh ping (well under threshold)", () => {
    expect(isStale(at(5_000), NOW)).toBe(false);
  });
  it("is false just under the 90s threshold", () => {
    expect(isStale(at(89_000), NOW)).toBe(false);
  });
  it("is true at exactly the 90s threshold", () => {
    expect(isStale(at(90_000), NOW)).toBe(true);
  });
  it("is true well past the threshold", () => {
    expect(isStale(at(5 * 60_000), NOW)).toBe(true);
  });
  it("accepts an ISO string createdAt", () => {
    expect(isStale(new Date(NOW - 120_000).toISOString(), NOW)).toBe(true);
  });
});

describe("formatLastSeen (TRK-03)", () => {
  it("says 'just now' under 10s", () => {
    expect(formatLastSeen(at(3_000), NOW)).toBe("just now");
  });
  it("renders seconds under a minute", () => {
    expect(formatLastSeen(at(42_000), NOW)).toBe("42s ago");
  });
  it("renders minutes under an hour", () => {
    expect(formatLastSeen(at(5 * 60_000), NOW)).toBe("5m ago");
  });
  it("renders hours beyond an hour", () => {
    expect(formatLastSeen(at(2 * 60 * 60_000), NOW)).toBe("2h ago");
  });
});
