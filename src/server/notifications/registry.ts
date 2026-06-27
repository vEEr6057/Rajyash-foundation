import "server-only";
import { inAppChannel } from "./channels/inApp";
import { webPushChannel } from "./channels/webPush";
import { emailChannel } from "./channels/email";
import type { ChannelKey, NotificationChannel } from "./types";

/** Adding, disabling, or replacing a channel is ONE edit here — no caller changes (NOT-04). */
export const CHANNELS: Record<ChannelKey, NotificationChannel> = {
  in_app: inAppChannel,
  web_push: webPushChannel,
  email: emailChannel,
};
