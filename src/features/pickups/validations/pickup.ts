import { z } from "zod";
import { FOOD_CATEGORIES, QUANTITY_UNITS } from "@/config/constants";

/** Donor pickup create/edit input (DON-01..03). lat/lng resolved via geocode + draggable pin. */
export const pickupFormSchema = z
  .object({
    category: z.enum(FOOD_CATEGORIES, { error: "Choose a food type" }),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    quantity: z.coerce
      .number({ error: "Enter a quantity" })
      .int({ message: "Whole number only" })
      .min(1, { message: "Must be at least 1" })
      .max(100000, { message: "That seems too large" }),
    quantityUnit: z.enum(QUANTITY_UNITS, { error: "Choose a unit" }),
    windowStart: z.coerce.date({ error: "Pick a start time" }),
    windowEnd: z.coerce.date({ error: "Pick an end time" }),
    address: z.string().trim().min(5, { message: "Enter the pickup address" }),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    safetyAttested: z.literal(true, {
      error: "Please confirm the food is safe to share",
    }),
    foodPhotoPath: z.string().optional().or(z.literal("")),
  })
  .refine((d) => d.windowEnd > d.windowStart, {
    message: "End time must be after the start time",
    path: ["windowEnd"],
  });

export type PickupFormInput = z.infer<typeof pickupFormSchema>;
