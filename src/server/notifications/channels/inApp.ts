import "server-only";
import { notificationsRepo } from "@/server/db/repositories/notifications";
import type { NotificationChannel } from "../types";

export const inAppChannel: NotificationChannel = {
  key: "in_app",
  async send(msg, to) {
    await notificationsRepo.insert({
      userId: to.userId,
      type: msg.type,
      title: msg.title,
      body: msg.body,
      data: msg.data ?? null,
      pickupId: msg.pickupId ?? null,
    });
  },
};
