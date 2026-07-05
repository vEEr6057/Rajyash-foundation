import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const assignDriver = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/features/runs/actions/runActions", () => ({
  assignDriver: (...a: unknown[]) => assignDriver(...a),
}));

// Radix Select needs these under jsdom (no native pointer-capture/scroll support).
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
Element.prototype.scrollIntoView = vi.fn();

import { AssignRunDriverForm } from "./AssignRunDriverForm";

const drivers = [
  { id: "d1", name: "Amit", email: "amit@example.com" },
  { id: "d2", name: "Bela", email: "bela@example.com" },
] as never;

describe("AssignRunDriverForm (RUN-01 UI gap fix)", () => {
  it("shows a no-drivers message when the driver list is empty", () => {
    render(<AssignRunDriverForm runId="r1" currentDriverId={null} drivers={[]} />);
    expect(screen.getByText("runs.assignDriver.noDrivers")).toBeInTheDocument();
  });

  it("reassigns the run to the newly selected driver on Save", async () => {
    const user = userEvent.setup();
    render(<AssignRunDriverForm runId="r1" currentDriverId="d1" drivers={drivers} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /Bela/ }));
    await user.click(screen.getByRole("button", { name: "buttons.save" }));

    expect(assignDriver).toHaveBeenCalledWith("r1", "d2");
  });

  it("disables Save when the selected driver is unchanged", () => {
    render(<AssignRunDriverForm runId="r1" currentDriverId="d1" drivers={drivers} />);
    expect(screen.getByRole("button", { name: "buttons.save" })).toBeDisabled();
  });
});
