import { describe, it, expect } from "vitest";
import {
  shouldShowInstallNudge,
  INSTALL_NUDGE_MIN_VISITS,
} from "./installNudgeDecision";

describe("shouldShowInstallNudge (UX-17)", () => {
  it("hides below the minimum visit count", () => {
    expect(
      shouldShowInstallNudge({
        visitCount: INSTALL_NUDGE_MIN_VISITS - 1,
        dismissed: false,
        isStandalone: false,
      }),
    ).toBe(false);
  });

  it("shows once the minimum visit count is reached", () => {
    expect(
      shouldShowInstallNudge({
        visitCount: INSTALL_NUDGE_MIN_VISITS,
        dismissed: false,
        isStandalone: false,
      }),
    ).toBe(true);
  });

  it("hides after the user has dismissed it, even with enough visits", () => {
    expect(
      shouldShowInstallNudge({
        visitCount: INSTALL_NUDGE_MIN_VISITS + 5,
        dismissed: true,
        isStandalone: false,
      }),
    ).toBe(false);
  });

  it("hides when already running standalone (installed)", () => {
    expect(
      shouldShowInstallNudge({
        visitCount: INSTALL_NUDGE_MIN_VISITS + 5,
        dismissed: false,
        isStandalone: true,
      }),
    ).toBe(false);
  });

  it("standalone takes precedence even when never dismissed and eligible", () => {
    expect(
      shouldShowInstallNudge({
        visitCount: 100,
        dismissed: false,
        isStandalone: true,
      }),
    ).toBe(false);
  });
});
