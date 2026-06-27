import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url({ message: "Invalid push endpoint" }),
  p256dh: z.string().min(1, { message: "Missing p256dh key" }),
  auth: z.string().min(1, { message: "Missing auth key" }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
