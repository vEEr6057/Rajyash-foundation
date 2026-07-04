import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import {
  notifyOnPickupEvent,
  notifyOnRunEvent,
} from "@/server/inngest/functions/notify";
import { hygieneSweep } from "@/server/inngest/functions/hygiene";
import { sendDonationReceipt } from "@/server/inngest/functions/donations";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [notifyOnPickupEvent, notifyOnRunEvent, hygieneSweep, sendDonationReceipt],
});
