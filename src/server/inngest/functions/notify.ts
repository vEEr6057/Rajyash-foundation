import { inngest } from "@/server/inngest/client";
import { planRecipients } from "@/server/inngest/recipients";
import { dispatchToChannel } from "@/server/notifications/dispatch";
import type { ChannelKey } from "@/server/notifications/types";

type PickupEventName =
  | "pickup/created"
  | "pickup/claimed"
  | "pickup/status_changed"
  | "pickup/cancelled";

/**
 * One fan-out function for all four pickup events (Inngest v4: triggers + idempotency
 * live in the options object). Function-level idempotency keys on event.data.eventId
 * (NOT-05 first guard); each (recipient, channel) send runs in its own step.run for
 * independent retry + isolation (NOT-04).
 */
export const notifyOnPickupEvent = inngest.createFunction(
  {
    id: "notify-on-pickup-event",
    retries: 4, // 5 attempts per step
    idempotency: "event.data.eventId",
    triggers: [
      { event: "pickup/created" },
      { event: "pickup/claimed" },
      { event: "pickup/status_changed" },
      { event: "pickup/cancelled" },
    ],
  },
  async ({ event, step }) => {
    const data = event.data as { eventId: string; pickupId: string; toStatus?: string };

    const plans = await step.run("plan-recipients", () =>
      planRecipients({
        name: event.name as PickupEventName,
        data: { pickupId: data.pickupId, toStatus: data.toStatus },
      }),
    );

    for (const plan of plans) {
      for (const channel of plan.channels) {
        // One step per (recipient, channel): independent retry + memoization (NOT-04 isolation).
        await step.run(`send-${channel}-${plan.to.userId}`, () =>
          dispatchToChannel(channel as ChannelKey, data.eventId, plan.msg, plan.to),
        );
      }
    }
  },
);
