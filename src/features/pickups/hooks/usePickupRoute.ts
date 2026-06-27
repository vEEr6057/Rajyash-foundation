"use client";

import { useEffect, useRef, useState } from "react";
import { getPickupRoute } from "@/features/pickups/actions/pickupActions";
import { movedEnough, type LatLng } from "@/lib/routing";

/**
 * Watcher route + ETA (bridge §5). Calls getPickupRoute when the driver first
 * appears and again only after they move past the re-route threshold (~200m),
 * so we never hammer the OSRM demo server. Tears down on inactive.
 */
export function usePickupRoute(opts: {
  pickupId: string;
  live: LatLng | null;
  active: boolean;
}): {
  route: [number, number][] | null;
  etaMinutes: number | null;
  source: "osrm" | "line" | null;
} {
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [source, setSource] = useState<"osrm" | "line" | null>(null);
  const lastRoutedFrom = useRef<LatLng | null>(null);

  const liveLat = opts.live?.lat;
  const liveLng = opts.live?.lng;

  useEffect(() => {
    if (!opts.active) {
      setRoute(null);
      setEtaMinutes(null);
      setSource(null);
      lastRoutedFrom.current = null;
      return;
    }
    if (liveLat === undefined || liveLng === undefined) return;
    const here: LatLng = { lat: liveLat, lng: liveLng };
    if (!movedEnough(lastRoutedFrom.current, here)) return; // throttle
    lastRoutedFrom.current = here;

    let cancelled = false;
    void (async () => {
      const res = await getPickupRoute(opts.pickupId, here.lat, here.lng);
      if (cancelled || !res.ok) return;
      setRoute(res.coords);
      setEtaMinutes(res.etaMinutes);
      setSource(res.source);
    })();
    return () => {
      cancelled = true;
    };
  }, [opts.active, opts.pickupId, liveLat, liveLng]);

  return { route, etaMinutes, source };
}
