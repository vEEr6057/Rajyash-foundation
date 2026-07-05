import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

import { DeliveryProofBack } from "./DeliveryProofBack";

describe("DeliveryProofBack", () => {
  it("shows the proof photo once the pickup is delivered and a photo exists", () => {
    render(<DeliveryProofBack status="delivered" proofUrl="https://example.com/proof.jpg" />);
    expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("example.com"));
  });

  it("renders nothing when delivered but no proof photo was uploaded", () => {
    const { container } = render(<DeliveryProofBack status="delivered" proofUrl={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing before delivery even if a proof URL is somehow present", () => {
    const { container } = render(
      <DeliveryProofBack status="en_route" proofUrl="https://example.com/proof.jpg" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a cancelled pickup", () => {
    const { container } = render(
      <DeliveryProofBack status="cancelled" proofUrl="https://example.com/proof.jpg" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
