"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LatLng } from "@/lib/routing";
import { sortByDistance, type DistanceSortable } from "@/features/pickups/lib/distanceSort";
import { DriverPositionContext } from "@/features/pickups/lib/driverPositionContext";

export interface BoardListItem extends DistanceSortable {
  node: ReactNode;
}

/**
 * UX-2: thin client wrapper around the (still server-rendered) board cards —
 * only this component and its DistanceChip descendants are client; the page,
 * data fetch, and card markup stay server components (no refetch, SEO/perf
 * unchanged). Requests the driver's position once, after mount, so it never
 * blocks SSR. On denial/unavailable/timeout it silently keeps the SSR
 * chronological order — no nag, no error (the tracking flow already asks for
 * geo permission for drivers, so this is usually pre-granted anyway).
 */
export function DistanceAwareBoardList({ items }: { items: BoardListItem[] }) {
  const [position, setPosition] = useState<LatLng | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // permission denied / position unavailable / timeout — no-op, keep chronological order
      },
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 },
    );
  }, []);

  const sorted = useMemo(() => sortByDistance(items, position), [items, position]);

  return (
    <DriverPositionContext.Provider value={position}>
      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((item) => (
          <div key={item.id}>{item.node}</div>
        ))}
      </div>
    </DriverPositionContext.Provider>
  );
}
