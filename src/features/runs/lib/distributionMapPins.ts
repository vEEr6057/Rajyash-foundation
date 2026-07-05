import type { RunStop } from "@/server/db/schema";

/**
 * UX-9: one map pin per drop stop with coordinates. `meta` is the caller-built
 * "slot · date" string (same string already shown on the DistributionRunCard),
 * so the popup and the card agree without a second formatting path.
 */
export interface DistributionMapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  meta: string;
  status: RunStop["status"];
}

/**
 * Flattens today's active runs' drop stops into map pins, skipping any stop
 * without lat/lng (ad-hoc drops entered as address-only still show on the
 * list — they just don't get a pin).
 */
export function toDistributionMapPins(
  runs: Array<{ meta: string; dropStops: RunStop[] }>,
): DistributionMapPin[] {
  return runs.flatMap(({ meta, dropStops }) =>
    dropStops
      .filter(
        (stop): stop is RunStop & { lat: number; lng: number } =>
          stop.lat != null && stop.lng != null,
      )
      .map((stop) => ({
        id: stop.id,
        lat: stop.lat,
        lng: stop.lng,
        title: stop.address ?? "—",
        meta,
        status: stop.status,
      })),
  );
}
