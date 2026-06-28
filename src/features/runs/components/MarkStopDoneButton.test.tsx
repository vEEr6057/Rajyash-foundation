import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/runs/actions/runActions", () => ({ markStopDone: vi.fn() }));

import { MarkStopDoneButton } from "./MarkStopDoneButton";

describe("MarkStopDoneButton", () => {
  it("renders a button for a pending stop", () => {
    render(<MarkStopDoneButton stopId="s1" stopStatus="pending" />);
    expect(screen.getByRole("button")).toHaveTextContent("run.stop.markDone");
  });

  it("renders nothing for a done stop", () => {
    const { container } = render(<MarkStopDoneButton stopId="s1" stopStatus="done" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a skipped stop", () => {
    const { container } = render(<MarkStopDoneButton stopId="s1" stopStatus="skipped" />);
    expect(container).toBeEmptyDOMElement();
  });
});
