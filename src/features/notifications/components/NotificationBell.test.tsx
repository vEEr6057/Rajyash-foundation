import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

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

// Minimal EN messages for the portal namespace consumed by NotificationBell.
const messages = {
  portal: {
    notifications: {
      title: "Notifications",
      markAllRead: "Mark all read",
    },
  },
};

function renderBell() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NotificationBell />
    </NextIntlClientProvider>,
  );
}

describe("NotificationBell (NOT-01)", () => {
  beforeEach(() => {
    markAllMutate.mockClear();
    unreadCount = 3;
  });

  it("shows the unread count on the badge", () => {
    renderBell();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /3 unread/i }),
    ).toBeInTheDocument();
  });

  it("caps the badge at 9+", () => {
    unreadCount = 25;
    renderBell();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("calls mark-all-read when the action is clicked", async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole("button", { name: /notifications/i })); // open the panel
    await user.click(screen.getByRole("button", { name: /mark all read/i }));
    expect(markAllMutate).toHaveBeenCalledTimes(1);
  });

  it("hides the badge when there is nothing unread", () => {
    unreadCount = 0;
    renderBell();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
