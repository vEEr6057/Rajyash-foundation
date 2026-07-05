import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Bell } from "lucide-react";
import { EmptyState } from "./EmptyState";

describe("EmptyState (UX-16)", () => {
  it("renders the title and hint", () => {
    render(<EmptyState title="Nothing here yet" body="Things appear here." />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Things appear here.")).toBeInTheDocument();
  });

  it("omits the action when none is passed", () => {
    render(<EmptyState title="Nothing here yet" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the action slot when passed", () => {
    render(
      <EmptyState
        title="Nothing posted yet"
        action={<button type="button">Post surplus food</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Post surplus food" }),
    ).toBeInTheDocument();
  });

  it("renders the given icon instead of the default brand mark", () => {
    const { container } = render(
      <EmptyState title="No notifications yet" icon={Bell} compact />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
