import { inngest } from "@/server/inngest/client";
import { pingsRepo } from "@/server/db/repositories/pings";
import { runPingsRepo } from "@/server/db/repositories/runPings";
import { notificationsRepo } from "@/server/db/repositories/notifications";
import { deliveriesRepo } from "@/server/db/repositories/deliveries";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { logger } from "@/lib/logger";

const HOURS = 60 * 60 * 1000;
const DAYS = 24 * HOURS;

/**
 * Nightly hygiene sweep (B3) — 03:30 IST daily. Inngest cron runs fine on Workers, so no
 * Cloudflare Cron Trigger is needed. Each purge is its own step.run so a failure retries
 * just that purge in isolation (and every DELETE-by-age is idempotent). Counts are logged.
 *
 * Cutoffs:
 *  - ping trails > 24h (stuck-active safety net; the normal purge is event-driven).
 *  - read in-app notifications > 90d; unread > 180d.
 *  - dedup-claim rows (notification_deliveries) > 90d (dedup window ≫ retry window).
 *  - auto-cancel `requested` pickups whose window closed > 48h ago (B4 — clears the
 *    volunteer board of dead entries, writing a status_events audit row per pickup);
 *    claimed-but-stale pickups (> 72h) are only WARN-logged (a human un-claims them).
 */
export const hygieneSweep = inngest.createFunction(
  {
    id: "hygiene-sweep",
    retries: 2,
    triggers: [{ cron: "TZ=Asia/Kolkata 30 3 * * *" }],
  },
  async ({ step }) => {
    const now = Date.now();
    const cutoff24h = new Date(now - 24 * HOURS);
    const cutoff48h = new Date(now - 48 * HOURS);
    const cutoff72h = new Date(now - 72 * HOURS);
    const cutoff90d = new Date(now - 90 * DAYS);
    const cutoff180d = new Date(now - 180 * DAYS);

    await step.run("purge-location-pings", async () => {
      const count = await pingsRepo.purgeOlderThan(cutoff24h);
      logger.info("hygiene sweep: purged stale location pings", { count });
      return count;
    });

    await step.run("purge-run-pings", async () => {
      const count = await runPingsRepo.purgeOlderThan(cutoff24h);
      logger.info("hygiene sweep: purged stale run pings", { count });
      return count;
    });

    await step.run("purge-read-notifications", async () => {
      const count = await notificationsRepo.purgeReadOlderThan(cutoff90d);
      logger.info("hygiene sweep: purged old read notifications", { count });
      return count;
    });

    await step.run("purge-unread-notifications", async () => {
      const count = await notificationsRepo.purgeUnreadOlderThan(cutoff180d);
      logger.info("hygiene sweep: purged old unread notifications", { count });
      return count;
    });

    await step.run("purge-notification-deliveries", async () => {
      const count = await deliveriesRepo.purgeOlderThan(cutoff90d);
      logger.info("hygiene sweep: purged old dedup-claim rows", { count });
      return count;
    });

    await step.run("auto-cancel-stale-requested", async () => {
      const count = await pickupsRepo.cancelStaleRequested(cutoff48h);
      logger.info("hygiene sweep: auto-cancelled stale requested pickups", { count });
      return count;
    });

    await step.run("warn-stale-claimed", async () => {
      const count = await pickupsRepo.countStaleClaimed(cutoff72h);
      if (count > 0) {
        logger.warn("hygiene sweep: claimed pickups past their window need attention", {
          count,
        });
      }
      return count;
    });
  },
);
