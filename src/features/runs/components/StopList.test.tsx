import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const removeStop = vi.fn();
const reorderStops = vi.fn();
const overrideStopStatus = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/features/runs/actions/runActions", () => ({
  removeStop: (...a: unknown[]) => removeStop(...a),
  reorderStops: (...a: unknown[]) => reorderStops(...a),
  overrideStopStatus: (...a: unknown[]) => overrideStopStatus(...a),
}));

// Radix Select needs these under jsdom (no native pointer-capture/scroll support).
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
Element.prototype.scrollIntoView = vi.fn();

import { StopList } from "./StopList";

const stop = {
  id: "s1",
  runId: "r1",
  seq: 1,
  kind: "pickup",
  address: "Test Kitchen",
  status: "pending",
} as never;

describe("StopList — admin stop-status override (RUN-08 UI gap)", () => {
  it("shows an override Select instead of the read-only pill while editable", () => {
    render(<StopList stops={[stop]} runId="r1" editable />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("calls overrideStopStatus with the stop id and the newly chosen status", async () => {
    const user = userEvent.setup();
    render(<StopList stops={[stop]} runId="r1" editable />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "stopStatus.done" }));

    expect(overrideStopStatus).toHaveBeenCalledWith("s1", "done");
  });

  it("shows the read-only status pill (no override control) when not editable", () => {
    render(<StopList stops={[stop]} runId="r1" editable={false} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
