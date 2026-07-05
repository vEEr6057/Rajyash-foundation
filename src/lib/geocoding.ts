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

/**
 * In-memory, per-isolate memo of resolved lookups (B1 note 4). Repeated Find
 * clicks and identical addresses skip the network entirely. Capped ~100 entries,
 * FIFO-evicted (insertion order = Map iteration order). Best-effort: a Worker
 * isolate is short-lived, so this is a cheap hot-path cache, not a global cache
 * (a durable one would need KV/DO — not warranted at this volume).
 */
const MEMO_CAP = 100;
const memo = new Map<string, GeocodeResult | null>();

/**
 * Timestamp of the last outbound Nominatim call, per isolate. Used to keep under
 * Nominatim's ≤1 rps usage policy — best-effort only (see memo note above).
 */
let lastCallAt = 0;

/** Collapse case + whitespace so "Foo Bar " and "foo  bar" share one memo slot. */
function normalizeQuery(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function memoize(key: string, result: GeocodeResult | null): void {
  if (memo.size >= MEMO_CAP) {
    const oldest = memo.keys().next().value;
    if (oldest !== undefined) memo.delete(oldest);
  }
  memo.set(key, result);
}

/** Returns the best match, or null if nothing found. Biased to Ahmedabad/India. */
export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;

  const key = normalizeQuery(address);
  if (memo.has(key)) return memo.get(key) ?? null;

  // Nominatim ToS wants ≤1 rps — if we called within the last second, wait out
  // the remainder before firing. Per-isolate best effort (a global limiter would
  // need a DO/KV; not warranted at this volume).
  const sinceLast = Date.now() - lastCallAt;
  if (sinceLast < 1000) {
    await new Promise((r) => setTimeout(r, 1000 - sinceLast));
  }
  lastCallAt = Date.now();

  const url = `${NOMINATIM}?q=${encodeURIComponent(
    q,
  )}&format=json&limit=1&countrycodes=in&addressdetails=0`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    // Geocoding is request-time; don't let Next cache a stale coordinate.
    cache: "no-store",
  });
  // Don't poison the memo with a transient failure — only cache a real response.
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const hit = data[0];

  let result: GeocodeResult | null = null;
  if (hit) {
    const lat = Number.parseFloat(hit.lat);
    const lng = Number.parseFloat(hit.lon);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      result = { lat, lng, displayName: hit.display_name };
    }
  }
  memoize(key, result);
  return result;
}

/**
 * Resolve a Google Maps short link (maps.app.goo.gl / goo.gl/maps) to its full
 * URL by following the redirect server-side, so the pure parser can read the
 * embedded coords. Returns the final URL, or null on any failure. The body is
 * never read — we only need res.url after redirects (Workers fetch follows them).
 */
export async function resolveShortMapsUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    // SSRF hardening (security-review LOW-2): the shortener's redirect can point anywhere.
    // Private-range fetches are already blocked by the Worker's global_fetch_strictly_public
    // flag; here we additionally refuse to hand back any final URL that isn't a Google Maps
    // host, so a crafted goo.gl link can't turn this into a blind fetch of an arbitrary
    // public origin whose URL we then parse/store.
    if (!res.url) return null;
    const host = new URL(res.url).hostname;
    const isGoogleHost = /(^|\.)google\.[a-z.]+$/i.test(host) || /(^|\.)goo\.gl$/i.test(host);
    return isGoogleHost ? res.url : null;
  } catch {
    return null;
  }
}
