import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => "en",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/pickups",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const assignPickup = vi.fn();
vi.mock("@/features/admin", () => ({
  assignPickup: (...a: unknown[]) => assignPickup(...a),
}));

import { PickupsTable } from "./PickupsTable";

function makePickup(overrides: Record<string, unknown>) {
  return {
    id: "pk1",
    status: "requested",
    category: "veg",
    quantity: 10,
    quantityUnit: "servings",
    address: "Somewhere",
    createdAt: new Date("2026-01-01"),
    volunteerId: null,
    ...overrides,
  } as never;
}

const basePickup = makePickup({});

describe("PickupsTable — collector column (dispatch-model-v2 driver fix)", () => {
  it("resolves the collector name from the drivers list, not a volunteer list", () => {
    const assigned = makePickup({ id: "pk2", volunteerId: "d1" });
    render(
      <PickupsTable
        pickups={[assigned]}
        drivers={[{ id: "d1", name: "Ravi the Driver" }]}
        sort="createdAt"
        dir="desc"
      />,
    );
    expect(screen.getByText("Ravi the Driver")).toBeInTheDocument();
  });

  it("shows unassigned when no driver is assigned", () => {
    render(
      <PickupsTable
        pickups={[basePickup]}
        drivers={[{ id: "d1", name: "Ravi the Driver" }]}
        sort="createdAt"
        dir="desc"
      />,
    );
    expect(screen.getByText("pickups.table.unassigned")).toBeInTheDocument();
  });
});
