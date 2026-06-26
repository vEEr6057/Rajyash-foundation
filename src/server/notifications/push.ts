import "server-only";
import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";
import { env } from "@/config/env";

const vapid: VapidKeys = {
  subject: env.VAPID_SUBJECT,
  publicKey: env.VAPID_PUBLIC_KEY,
  privateKey: env.VAPID_PRIVATE_KEY,
};

/** Returns "sent" | "pruned" (caller deletes the sub row on "pruned"). Throws on transient. */
export async function sendWebPush(
  sub: PushSubscription,
  payload: { title: string; body: string; url?: string },
): Promise<"sent" | "pruned"> {
  const push = await buildPushPayload(
    // 24h TTL: hold the message so a user offline for more than a minute still gets it.
    { data: JSON.stringify(payload), options: { ttl: 86_400 } },
    sub,
    vapid,
  );
  // buildPushPayload returns a Uint8Array body; cast to BodyInit — TS 5.7's generic
  // Uint8Array doesn't match fetch's BufferSource, but the Workers/undici runtime
  // accepts a Uint8Array body fine.
  const res = await fetch(sub.endpoint, {
    ...push,
    body: push.body as BodyInit,
  });
  if (res.status === 404 || res.status === 410) return "pruned"; // dead endpoint -> prune
  if (!res.ok) throw new Error(`push ${res.status}`); // transient -> Inngest retries
  return "sent";
}
