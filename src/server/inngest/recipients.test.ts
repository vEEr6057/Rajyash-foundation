import { describe, it, expect } from "vitest";
import { resolveRecipients } from "./recipients";

const pickup = { donorId: "donor-1" };

describe("resolveRecipients (D-05 matrix)", () => {
  it("created -> every active volunteer, in_app + web_push (no email)", () => {
    const r = resolveRecipients({
      eventName: "pickup/created",
      pickup,
      volunteerIds: ["v1", "v2"],
    });
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.recipientId).sort()).toEqual(["v1", "v2"]);
    expect(r[0].channels).toEqual(["in_app", "web_push"]);
    expect(r.every((x) => !x.channels.includes("email"))).toBe(true);
  });
  it("claimed -> donor on all three channels", () => {
    const r = resolveRecipients({ eventName: "pickup/claimed", pickup });
    expect(r).toEqual([
      { recipientId: "donor-1", channels: ["in_app", "web_push", "email"] },
    ]);
  });
  it("status_changed en_route -> donor, in_app + web_push (no email)", () => {
    const r = resolveRecipients({
      eventName: "pickup/status_changed",
      pickup,
      toStatus: "en_route",
    });
    expect(r[0].channels).toEqual(["in_app", "web_push"]);
  });
  it("status_changed delivered -> donor, email included", () => {
    const r = resolveRecipients({
      eventName: "pickup/status_changed",
      pickup,
      toStatus: "delivered",
    });
    expect(r[0].channels).toContain("email");
  });
  it("cancelled -> donor in_app only", () => {
    const r = resolveRecipients({ eventName: "pickup/cancelled", pickup });
    expect(r).toEqual([{ recipientId: "donor-1", channels: ["in_app"] }]);
  });
});
