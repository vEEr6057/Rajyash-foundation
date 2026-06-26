import type { NotificationChannelKey } from "@/config/constants";

export type ChannelKey = NotificationChannelKey; // "in_app" | "web_push" | "email"

export interface NotificationMessage {
  type: string; // event type, e.g. "pickup/claimed"
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
  pickupId?: string;
}

export interface Recipient {
  userId: string;
  email: string | null;
}

export interface NotificationChannel {
  key: ChannelKey;
  send(msg: NotificationMessage, to: Recipient): Promise<void>;
}
