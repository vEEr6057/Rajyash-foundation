/** Pure tweening for the live marker — no jumps between 30s pings (TRK-02). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function interpolateLatLng(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  t: number,
): { lat: number; lng: number } {
  const c = Math.min(1, Math.max(0, t));
  return { lat: lerp(from.lat, to.lat, c), lng: lerp(from.lng, to.lng, c) };
}
