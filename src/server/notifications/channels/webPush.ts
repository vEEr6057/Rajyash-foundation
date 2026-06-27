import "server-only";
import { pushSubsRepo } from "@/server/db/repositories/pushSubs";
import { sendWebPush } from "../push";
import type { NotificationChannel } from "../types";

export const webPushChannel: NotificationChannel = {
  key: "web_push",
  async send(msg, to) {
    const subs = await pushSubsRepo.listForUser(to.userId);
    for (const s of subs) {
      const result = await sendWebPush(
        {
          endpoint: s.endpoint,
          expirationTime: null,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        { title: msg.title, body: msg.body, url: msg.url },
      );
      if (result === "pruned") await pushSubsRepo.deleteByEndpoint(s.endpoint);
    }
  },
};
