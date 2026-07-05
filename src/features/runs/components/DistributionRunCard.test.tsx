import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RunStop } from "@/server/db/schema";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const markStopDone = vi.fn().mockResolvedValue({ ok: true, runCompleted: false });
vi.mock("@/features/runs/actions/runActions", () => ({
  markStopDone: (...args: unknown[]) => markStopDone(...args),
}));

import { DistributionRunCard } from "./DistributionRunCard";

function makeStop(overrides: Partial<RunStop>): RunStop {
  return {
    id: "stop-1",
    runId: "run-1",
    seq: 1,
    kind: "drop",
    partnerId: null,
    destinationId: null,
    address: "Community Kitchen, Satellite",
    lat: null,
    lng: null,
    status: "pending",
    doneAt: null,
    notes: null,
    createdAt: new Date(),
    ...overrides,
  } as RunStop;
}

describe("DistributionRunCard", () => {
  it("shows the run meta and each drop stop's address", () => {
    const stops = [
      makeStop({ id: "s1", address: "Shelter A" }),
      makeStop({ id: "s2", address: "Shelter B" }),
    ];
    render(
      <DistributionRunCard meta="Evening · 5 Jul" dropStops={stops} noDropStopsLabel="none" />,
    );
    expect(screen.getByText("Evening · 5 Jul")).toBeInTheDocument();
    expect(screen.getByText("Shelter A")).toBeInTheDocument();
    expect(screen.getByText("Shelter B")).toBeInTheDocument();
  });

  it("shows the no-drop-stops label when the run has none", () => {
    render(<DistributionRunCard meta="Evening · 5 Jul" dropStops={[]} noDropStopsLabel="Nothing yet" />);
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  // The confirm-drop wiring: clicking "Mark done" on a specific stop's row calls
  // markStopDone with THAT stop's id, not some other stop's.
  it("wires each stop's confirm-done button to markStopDone with the right stop id", async () => {
    const user = userEvent.setup();
    const stops = [
      makeStop({ id: "s1", address: "Shelter A" }),
      makeStop({ id: "s2", address: "Shelter B" }),
    ];
    render(
      <DistributionRunCard meta="Evening · 5 Jul" dropStops={stops} noDropStopsLabel="none" />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    await user.click(buttons[1]);
    expect(markStopDone).toHaveBeenCalledWith("s2");
  });

  it("does not render a confirm-done button for an already-done stop", () => {
    const stops = [makeStop({ id: "s1", address: "Shelter A", status: "done" })];
    render(
      <DistributionRunCard meta="Evening · 5 Jul" dropStops={stops} noDropStopsLabel="none" />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
