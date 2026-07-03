import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import {
  notifyOnPickupEvent,
  notifyOnRunEvent,
} from "@/server/inngest/functions/notify";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [notifyOnPickupEvent, notifyOnRunEvent],
});
