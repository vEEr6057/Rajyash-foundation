import { inngest } from "@/server/inngest/client";
import {
  planRecipients,
  planRunRecipients,
  type RunEventName,
} from "@/server/inngest/recipients";
import { dispatchToChannel } from "@/server/notifications/dispatch";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { notificationsRepo } from "@/server/db/repositories/notifications";
import { logger } from "@/lib/logger";
import type { ChannelKey } from "@/server/notifications/types";

type PickupEventName =
  | "pickup/created"
  | "pickup/claimed"
  | "pickup/status_changed"
  | "pickup/cancelled";

/**
 * Shared onFailure reporter (B3). Fires only after the final retry of a notify function.
 * Logs the failure and drops one in-app notification to every active admin so a silent
 * delivery loss becomes visible. Entirely guarded — a throwing failure-handler would put
 * Inngest into a failure-of-the-failure loop, so it must swallow everything.
 */
async function reportNotifyFailure(
  failureEvent: unknown,
  error: unknown,
  countRecipients: (name: string, data: Record<string, unknown>) => Promise<number>,
): Promise<void> {
  try {
    const original = (failureEvent as { data?: { event?: { name?: string; data?: Record<string, unknown> } } })
      ?.data?.event;
    const eventName = original?.name ?? "unknown";
    const eventId = (original?.data?.eventId as string | undefined) ?? "unknown";

    let recipientCount = -1;
    try {
      recipientCount = await countRecipients(eventName, original?.data ?? {});
    } catch {
      // Count is diagnostic only — never let re-planning sink the handler.
    }

    logger.error("notification delivery failed after final retry", {
      eventName,
      eventId,
      recipientCount,
      error: error instanceof Error ? error.message : String(error),
    });

    const adminIds = await profilesRepo.listAdminIds();
    for (const id of adminIds) {
      await notificationsRepo.insert({
        userId: id,
        type: "notification/failed",
        title: "A notification failed to deliver",
        body: "A notification failed to deliver — check the Inngest dashboard.",
        data: { eventName, eventId },
        pickupId: null,
      });
    }
  } catch (e) {
    logger.error("notify onFailure handler itself failed", { err: String(e) });
  }
}

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
    onFailure: ({ event, error }) =>
      reportNotifyFailure(event, error, (name, data) =>
        planRecipients({
          name: name as PickupEventName,
          data: data as { pickupId: string; toStatus?: string },
        }).then((plans) => plans.length),
      ),
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

/**
 * Sibling of notifyOnPickupEvent for the run/dispatch events (B3). A separate function
 * (distinct Inngest `id`) so the pickup event data shape stays untouched; same
 * claim→send→release machinery, same per-(recipient, channel) step isolation +
 * function-level idempotency on event.data.eventId.
 */
export const notifyOnRunEvent = inngest.createFunction(
  {
    id: "notify-on-run-event",
    retries: 4, // 5 attempts per step
    idempotency: "event.data.eventId",
    triggers: [{ event: "run/assigned" }, { event: "run/completed" }],
    onFailure: ({ event, error }) =>
      reportNotifyFailure(event, error, (name, data) =>
        planRunRecipients({
          name: name as RunEventName,
          data: data as { runId: string; driverId?: string },
        }).then((plans) => plans.length),
      ),
  },
  async ({ event, step }) => {
    const data = event.data as {
      eventId: string;
      runId: string;
      driverId?: string;
    };

    const plans = await step.run("plan-run-recipients", () =>
      planRunRecipients({
        name: event.name as RunEventName,
        data: { runId: data.runId, driverId: data.driverId },
      }),
    );

    for (const plan of plans) {
      for (const channel of plan.channels) {
        await step.run(`send-${channel}-${plan.to.userId}`, () =>
          dispatchToChannel(channel as ChannelKey, data.eventId, plan.msg, plan.to),
        );
      }
    }
  },
);
