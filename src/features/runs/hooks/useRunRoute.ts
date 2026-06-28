"use client";

import { useEffect, useRef, useState } from "react";
import { getRunRoute } from "@/features/runs/actions/runActions";
import { movedEnough, type LatLng } from "@/lib/routing";

/**
 * Watcher route + ETA for a run (TRK-06). Calls getRunRoute when the driver first
 * appears and again only after they move past ~200m, so we never hammer OSRM.
 * Mirrors usePickupRoute. Tears down on inactive.
 */
export function useRunRoute(opts: {
  runId: string;
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
    if (!movedEnough(lastRoutedFrom.current, here)) return;
    lastRoutedFrom.current = here;

    let cancelled = false;
    void (async () => {
      const res = await getRunRoute(opts.runId, here.lat, here.lng);
      if (cancelled || !res.ok) return;
      setRoute(res.coords);
      setEtaMinutes(res.etaMinutes);
      setSource(res.source);
    })();
    return () => {
      cancelled = true;
    };
  }, [opts.active, opts.runId, liveLat, liveLng]);

  return { route, etaMinutes, source };
}
