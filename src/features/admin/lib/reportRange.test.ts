import { describe, it, expect } from "vitest";
import { formatReportRange } from "./reportRange";

describe("formatReportRange (en)", () => {
  it("collapses a same-day range to a single full date", () => {
    expect(formatReportRange("2026-07-04", "2026-07-04", "en")).toBe("Jul 4, 2026");
  });

  it("shares month + year across a same-month range", () => {
    // Regression: the old branch produced the malformed "1–Jul 4, 2026".
    expect(formatReportRange("2026-07-01", "2026-07-04", "en")).toBe("Jul 1 – 4, 2026");
  });

  it("shows the full date on both sides for a cross-month range", () => {
    expect(formatReportRange("2026-06-28", "2026-07-04", "en")).toBe(
      "Jun 28, 2026 – Jul 4, 2026",
    );
  });

  it("shows the full date on both sides for a cross-year range", () => {
    expect(formatReportRange("2025-12-30", "2026-01-02", "en")).toBe(
      "Dec 30, 2025 – Jan 2, 2026",
    );
  });
});
