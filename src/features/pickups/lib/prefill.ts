import type { Pickup } from "@/server/db/schema";

/**
 * UX-6: fields carried over from the donor's last pickup into a fresh "repeat
 * last pickup" prefill. Deliberately excludes the pickup window and food photo
 * — those are always re-entered fresh (a stale window/photo would be wrong).
 */
export interface LastPickupPrefill {
  category: Pickup["category"];
  description: string;
  quantity: number;
  quantityUnit: Pickup["quantityUnit"];
  address: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
}

/** Pure mapper: DB row → the prefill shape the form actually needs. */
export function mapPickupToPrefill(pickup: Pickup): LastPickupPrefill {
  return {
    category: pickup.category,
    description: pickup.description ?? "",
    quantity: pickup.quantity,
    quantityUnit: pickup.quantityUnit,
    address: pickup.address,
    lat: pickup.lat,
    lng: pickup.lng,
    googleMapsUrl: pickup.googleMapsUrl ?? "",
  };
}
