/** Pure routing math for the watcher map's route line + ETA (bridge §5). */
export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Great-circle distance in kilometres (UX-2 board sort/chip — same math, km unit). */
export function haversineKm(a: LatLng, b: LatLng): number {
  return haversineMeters(a, b) / 1000;
}

/**
 * UX-2: "2.3 km" / "850 m" — round to the nearest 10m under 1km (a driver
 * doesn't need metre precision), one decimal above. Rounds the metres FIRST
 * so a value like 0.999km never displays as the confusing "1000 m" — it
 * rolls over to "1.0 km" instead.
 */
export function formatDistance(km: number): string {
  const roundedMeters = Math.round((km * 1000) / 10) * 10;
  if (roundedMeters < 1000) return `${roundedMeters} m`;
  return `${km.toFixed(1)} km`;
}

/** Minutes to cover `meters` at `kmph` (default 18 — urban rickshaw). Floor of 1. */
export function estimateEtaMinutes(meters: number, kmph = 18): number {
  const minutes = Math.round((meters / 1000 / kmph) * 60);
  return Math.max(1, minutes);
}

/** Fallback "route": the two endpoints, as Leaflet [lat,lng] pairs. */
export function straightLineRoute(from: LatLng, to: LatLng): [number, number][] {
  return [
    [from.lat, from.lng],
    [to.lat, to.lng],
  ];
}

/** Throttle gate: re-route only after the driver moved past the threshold. */
export function movedEnough(from: LatLng | null, to: LatLng, thresholdM = 200): boolean {
  if (!from) return true;
  return haversineMeters(from, to) >= thresholdM;
}
