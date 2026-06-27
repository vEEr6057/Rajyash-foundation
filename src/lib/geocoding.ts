import "server-only";

/**
 * Forward geocoding via Nominatim / OpenStreetMap (free, no key). Called once at
 * pickup creation, server-side, behind auth — well under the 1 req/s policy.
 * A meaningful User-Agent is REQUIRED by Nominatim's usage policy.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "RajyashFoodRescue/1.0 (rajyashfoundation@rajyashgroup.com)";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/** Returns the best match, or null if nothing found. Biased to Ahmedabad/India. */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;

  const url = `${NOMINATIM}?q=${encodeURIComponent(
    q,
  )}&format=json&limit=1&countrycodes=in&addressdetails=0`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    // Geocoding is request-time; don't let Next cache a stale coordinate.
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const hit = data[0];
  if (!hit) return null;

  const lat = Number.parseFloat(hit.lat);
  const lng = Number.parseFloat(hit.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng, displayName: hit.display_name };
}
