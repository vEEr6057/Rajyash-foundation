import "server-only";
import type { LatLng } from "@/lib/routing";

const OSRM = "https://router.project-osrm.org/route/v1/driving";

function isValidLatLng({ lat, lng }: LatLng): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Real road route via the free OSRM demo server. Returns Leaflet-ordered
 * [lat,lng] coords + duration, or null on any failure (caller falls back to a
 * straight line). No key, no billing. 3.5s timeout so a slow demo server never
 * stalls the watcher map. The demo server has no SLA — the fallback is the
 * contract, this is the enhancement.
 */
export async function fetchOsrmRoute(
  from: LatLng,
  to: LatLng,
): Promise<{ coords: [number, number][]; durationSec: number } | null> {
  if (!isValidLatLng(from) || !isValidLatLng(to)) return null;

  const coordinates = `${String(Number(from.lng))},${String(Number(from.lat))};${String(
    Number(to.lng),
  )},${String(Number(to.lat))}`;
  const url = new URL(`${OSRM}/${coordinates}`);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3500), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: Array<{ duration: number; geometry: { coordinates: [number, number][] } }>;
    };
    const route = data.routes?.[0];
    if (!route) return null;
    // OSRM/GeoJSON is [lng,lat]; Leaflet wants [lat,lng].
    const coords = route.geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
    if (coords.length < 2) return null;
    return { coords, durationSec: route.duration };
  } catch {
    return null;
  }
}
