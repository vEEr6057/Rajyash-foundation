/**
 * Pure helpers for Google-Maps links (no network, no key). We never call the
 * Google Maps API — we only (a) extract coordinates a user already has in a
 * pasted link and (b) build a free `dir/?api=1` deep-link for turn-by-turn.
 * Short links (maps.app.goo.gl) carry no coords until resolved — see
 * resolveShortMapsUrl in src/lib/geocoding.ts (server-only redirect-follow).
 */

function validPair(latStr: string, lngStr: string): { lat: number; lng: number } | null {
  const lat = Number.parseFloat(latStr);
  const lng = Number.parseFloat(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Extract a lat/lng from a Google Maps URL, or null. Precedence: place-pin
 *  (!3d!4d) → explicit query params → @viewport. */
export function parseLatLngFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  // !3dLAT!4dLNG — the actual place marker (most precise).
  const place = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (place) {
    const hit = validPair(place[1], place[2]);
    if (hit) return hit;
  }

  // Explicit "lat,lng" params: q / query / destination / ll / center / sll.
  try {
    const u = new URL(url);
    for (const key of ["q", "query", "destination", "ll", "center", "sll"]) {
      const v = u.searchParams.get(key);
      if (v && /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(v.trim())) {
        const [la, ln] = v.trim().split(",");
        const hit = validPair(la, ln);
        if (hit) return hit;
      }
    }
  } catch {
    // not a parseable URL — fall through to the regex form below
  }

  // @LAT,LNG (viewport center).
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const hit = validPair(at[1], at[2]);
    if (hit) return hit;
  }
  return null;
}

const GMAPS_HOST = /(^|\.)(google\.[a-z.]+|goo\.gl)$/i;

export function isGoogleMapsUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    if (!GMAPS_HOST.test(u.hostname)) return false;
    return /\/maps/.test(u.pathname) || u.hostname.startsWith("maps.") || u.hostname.endsWith("goo.gl");
  } catch {
    return false;
  }
}

export function isShortGoogleMapsUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    if (u.hostname === "maps.app.goo.gl") return true;
    if (u.hostname === "goo.gl" && u.pathname.startsWith("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

/** Free, no-key turn-by-turn deep link — opens the Google Maps app/site. */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
