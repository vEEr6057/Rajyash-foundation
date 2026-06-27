import "server-only";
import { CHANNELS } from "./registry";
import { deliveriesRepo } from "@/server/db/repositories/deliveries";
import type { ChannelKey, NotificationMessage, Recipient } from "./types";

/**
 * Dedup-then-send for one (event, recipient, channel). The dedup insert lives HERE,
 * not in each channel, so every channel gets exactly-once for free (NOT-05) and
 * channels stay pure "how to send" units (NOT-04). Each call is run inside its own
 * Inngest step (04-03) so a throw retries just this step, isolated from the others.
 */
export async function dispatchToChannel(
  channelKey: ChannelKey,
  eventId: string,
  msg: NotificationMessage,
  to: Recipient,
): Promise<void> {
  const fresh = await deliveriesRepo.claim(eventId, to.userId, channelKey);
  if (!fresh) return; // already delivered this (event, recipient, channel) -> skip (NOT-05)
  try {
    await CHANNELS[channelKey].send(msg, to);
  } catch (e) {
    // Send failed: release the claim so the Inngest step retry can re-claim + re-send.
    // Without this the claim row would outlive a failed send and the retry would skip
    // it (a silently lost notification). On success the row stays = exactly-once.
    await deliveriesRepo.release(eventId, to.userId, channelKey);
    throw e; // bubble so the Inngest step retries
  }
}
