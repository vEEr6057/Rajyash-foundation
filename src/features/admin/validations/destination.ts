import { z } from "zod";

/**
 * Destination create/edit input (DEST-01). Admins enter an address or a Google Maps
 * link (never coordinates); lat/lng are derived from that (or the draggable pin) and
 * kept only for the map + Navigate deep-link.
 */
export const destinationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Enter the destination name" })
    .max(200),
  area: z.string().trim().max(200).optional().or(z.literal("")),
  address: z
    .string()
    .trim()
    .min(1, { message: "Enter an address or Google Maps link" })
    .max(400),
  mapsLink: z.string().trim().max(600).optional().or(z.literal("")),
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
