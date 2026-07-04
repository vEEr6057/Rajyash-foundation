import { z } from "zod";
import { DONATION_MIN_PAISE, DONATION_MAX_PAISE } from "@/config/constants";

/**
 * createDonationOrder input (PAY-01). `amount` is PAISE (integer) — the client converts
 * ₹ → paise before calling. Server re-validates the bounds regardless of any client-side
 * check (never trust the client). Name/email are optional donor details for the receipt.
 */
export const donationOrderSchema = z.object({
  amount: z
    .number()
    .int({ message: "Amount must be a whole number of paise" })
    .min(DONATION_MIN_PAISE, { message: "Minimum donation is ₹10" })
    .max(DONATION_MAX_PAISE, { message: "That amount is too large" }),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email" })
    .max(200)
    .optional()
    .or(z.literal("")),
});

export type DonationOrderInput = z.infer<typeof donationOrderSchema>;
