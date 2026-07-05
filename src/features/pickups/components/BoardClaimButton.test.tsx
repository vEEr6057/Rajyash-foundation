import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/pickups/actions/pickupActions", () => ({ claimPickup: vi.fn() }));

import { claimPickup } from "@/features/pickups/actions/pickupActions";
import { BoardClaimButton } from "./BoardClaimButton";

const mockClaimPickup = vi.mocked(claimPickup);

describe("BoardClaimButton", () => {
  beforeEach(() => {
    mockClaimPickup.mockReset();
    refresh.mockReset();
  });

  it("calls claimPickup with this card's pickup id once the confirm step is accepted", async () => {
    mockClaimPickup.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<BoardClaimButton pickupId="pickup-42" />);

    await user.click(screen.getByRole("button", { name: "pickup.card.claim" }));
    await user.click(screen.getByText("confirm.claimPickupConfirm"));

    expect(mockClaimPickup).toHaveBeenCalledWith("pickup-42");
  });

  it("shows the conflict message inline and refreshes the board when already taken", async () => {
    mockClaimPickup.mockResolvedValue({
      ok: false,
      code: "TAKEN",
      message: "Just taken by another driver.",
    });
    const user = userEvent.setup();
    render(<BoardClaimButton pickupId="pickup-42" />);

    await user.click(screen.getByRole("button", { name: "pickup.card.claim" }));
    await user.click(screen.getByText("confirm.claimPickupConfirm"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Just taken by another driver.");
    expect(refresh).toHaveBeenCalled();
  });
});
