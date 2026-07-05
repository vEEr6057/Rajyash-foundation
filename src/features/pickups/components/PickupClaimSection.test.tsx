import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/pickups/actions/pickupActions", () => ({ claimPickup: vi.fn() }));

import { PickupClaimSection } from "./PickupClaimSection";

describe("PickupClaimSection", () => {
  // dispatch-model-v2: the collector role is the driver, not the volunteer.
  it("shows the claim button for a driver viewing a requested pickup", () => {
    render(<PickupClaimSection role="driver" status="requested" pickupId="p1" />);
    expect(screen.getByRole("button")).toHaveTextContent("pickup.card.claimButton");
  });

  it("shows a read-only note (no claim button) for a volunteer viewing a requested pickup", () => {
    render(<PickupClaimSection role="volunteer" status="requested" pickupId="p1" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("pickup.board.volunteerNote")).toBeInTheDocument();
  });

  it("renders nothing for a donor viewing a requested pickup", () => {
    const { container } = render(
      <PickupClaimSection role="donor" status="requested" pickupId="p1" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the pickup is no longer requested (driver)", () => {
    const { container } = render(
      <PickupClaimSection role="driver" status="accepted" pickupId="p1" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing once the pickup is no longer requested (volunteer)", () => {
    const { container } = render(
      <PickupClaimSection role="volunteer" status="en_route" pickupId="p1" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the role is unknown", () => {
    const { container } = render(
      <PickupClaimSection role={undefined} status="requested" pickupId="p1" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
