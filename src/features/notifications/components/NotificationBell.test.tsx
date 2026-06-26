import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const markAllMutate = vi.fn();
let unreadCount = 3;

vi.mock("../hooks/useNotifications", () => ({
  useNotifications: () => ({
    items: [],
    unreadCount,
    markAll: { mutate: markAllMutate, isPending: false },
    markOne: { mutate: vi.fn() },
  }),
}));

import { NotificationBell } from "./NotificationBell";

describe("NotificationBell (NOT-01)", () => {
  beforeEach(() => {
    markAllMutate.mockClear();
    unreadCount = 3;
  });

  it("shows the unread count on the badge", () => {
    render(<NotificationBell />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /3 unread/i }),
    ).toBeInTheDocument();
  });

  it("caps the badge at 9+", () => {
    unreadCount = 25;
    render(<NotificationBell />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("calls mark-all-read when the action is clicked", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    await user.click(screen.getByRole("button", { name: /notifications/i })); // open the panel
    await user.click(screen.getByRole("button", { name: /mark all read/i }));
    expect(markAllMutate).toHaveBeenCalledTimes(1);
  });

  it("hides the badge when there is nothing unread", () => {
    unreadCount = 0;
    render(<NotificationBell />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
