import { haversineKm, type LatLng } from "@/lib/routing";

export interface DistanceSortable {
  id: string;
  lat: number | null;
  lng: number | null;
}

/**
 * UX-2: nearest-first sort of board cards from the driver's position.
 * - Items missing lat or lng sort last, keeping their original relative
 *   order among themselves (never mixed nearest-first with the rest).
 * - When `from` is null (no geolocation fix yet — denied/unsupported/still
 *   resolving), the input order is returned unchanged, i.e. the SSR
 *   chronological order the page rendered.
 * Pure — no DOM/geolocation access, so it's cheap to test exhaustively.
 */
export function sortByDistance<T extends DistanceSortable>(
  items: T[],
  from: LatLng | null,
): T[] {
  if (!from) return items;

  const withCoords: { item: T; index: number; km: number }[] = [];
  const withoutCoords: { item: T; index: number }[] = [];

  items.forEach((item, index) => {
    if (item.lat != null && item.lng != null) {
      withCoords.push({
        item,
        index,
        km: haversineKm(from, { lat: item.lat, lng: item.lng }),
      });
    } else {
      withoutCoords.push({ item, index });
    }
  });

  withCoords.sort((a, b) => a.km - b.km || a.index - b.index);
  withoutCoords.sort((a, b) => a.index - b.index);

  return [...withCoords.map((x) => x.item), ...withoutCoords.map((x) => x.item)];
}
