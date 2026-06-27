import { z } from "zod";
import { PARTNER_TYPES } from "@/config/constants";

/** Partner org create/edit input (ADM-04 / D-06). Contact fields optional. */
export const partnerSchema = z.object({
  name: z.string().trim().min(1, { message: "Enter the partner name" }).max(200),
  type: z.enum(PARTNER_TYPES, { error: "Choose a partner type" }),
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email({ message: "Enter a valid email" })
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
});
export type PartnerInput = z.infer<typeof partnerSchema>;
