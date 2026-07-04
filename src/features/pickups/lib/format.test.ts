import { describe, it, expect } from "vitest";
import { formatWindow, intlLocale } from "./format";

describe("intlLocale", () => {
  it("maps next-intl locales to India-region Intl tags", () => {
    expect(intlLocale("en")).toBe("en-IN");
    expect(intlLocale("gu")).toBe("gu-IN");
    expect(intlLocale("hi")).toBe("hi-IN");
  });
  it("falls back to en-IN for an unknown locale", () => {
    expect(intlLocale("xx")).toBe("en-IN");
  });
});

describe("formatWindow", () => {
  // 2026-07-04, 09:00–10:30 IST (03:30–05:00 UTC) — a same-day window.
  const start = new Date("2026-07-04T03:30:00Z");
  const end = new Date("2026-07-04T05:00:00Z");

  it("renders a same-day window as date + time – time (IST)", () => {
    const out = formatWindow(start, end, "en");
    // Month + day come from IST, not the UTC runtime tz.
    expect(out).toContain("Jul");
    expect(out).toContain("4");
    expect(out).toContain("–");
  });

  it("renders a cross-day window with the date on both sides", () => {
    const nextDay = new Date("2026-07-05T05:00:00Z");
    const out = formatWindow(start, nextDay, "en");
    // "Jul" should appear twice (both sides carry the date on a multi-day window).
    expect(out.match(/Jul/g)?.length).toBe(2);
  });

  // ICU GUARD: the whole point of FIX 3 is localized month names. If the runtime
  // lacks full-ICU, gu-IN/hi-IN silently fall back to English and this fails —
  // which is the signal to note the caveat, not to weaken the assertion.
  it("localizes the month name under gu/hi (requires full-ICU at runtime)", () => {
    const en = formatWindow(start, end, "en");
    const gu = formatWindow(start, end, "gu");
    const hi = formatWindow(start, end, "hi");
    expect(gu).not.toBe(en);
    expect(hi).not.toBe(en);
  });
});
