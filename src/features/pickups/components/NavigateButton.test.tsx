import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

import { NavigateButton } from "./NavigateButton";

describe("NavigateButton", () => {
  it("links to the Google Maps directions deep-link for the coords", () => {
    render(<NavigateButton lat={23.0225} lng={72.5714} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=23.0225,72.5714",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
