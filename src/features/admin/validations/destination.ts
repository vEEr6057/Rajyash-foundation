import { z } from "zod";

/** Destination create/edit input (DEST-01). lat/lng set via MapView draggable pin or geocode. */
export const destinationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Enter the destination name" })
    .max(200),
  area: z.string().trim().max(200).optional().or(z.literal("")),
  lat: z
    .number()
    .min(-90, { message: "Latitude must be between −90 and 90" })
    .max(90, { message: "Latitude must be between −90 and 90" }),
  lng: z
    .number()
    .min(-180, { message: "Longitude must be between −180 and 180" })
    .max(180, { message: "Longitude must be between −180 and 180" }),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

export type DestinationInput = z.infer<typeof destinationSchema>;
