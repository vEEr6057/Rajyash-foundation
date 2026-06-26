import { Inngest } from "inngest";
import { env } from "@/config/env";

/**
 * Inngest client (v4). Keys passed EXPLICITLY from env (Pitfall P2 — dodges opennext's
 * process.env timing; env.ts boot-validates them). Event payloads are validated by our
 * own pure resolver/copy units rather than Inngest's removed EventSchemas API; the
 * emitted event names are centralised in NOTIFICATION_EVENTS.
 */
export const inngest = new Inngest({
  id: "rajyash-food-rescue",
  eventKey: env.INNGEST_EVENT_KEY,
  signingKey: env.INNGEST_SIGNING_KEY,
});
