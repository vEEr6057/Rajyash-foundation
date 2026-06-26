"use client";

import { MapView } from "./MapView";
import { useLivePickupLocation } from "@/features/pickups/hooks/useLivePickupLocation";

/**
 * Donor/admin live view (TRK-02/03). Subscribes via useLivePickupLocation (realtime +
 * 10s polling fallback), renders the volunteer marker moving toward the destination, and
 * a freshness badge: rj-dot-live "Live" while fresh, muted "may be outdated" when stale.
 */
export function LiveTrackingMap({
  pickupId,
  active,
  destination,
}: {
  pickupId: string;
  active: boolean;
  destination: { lat: number; lng: number };
}) {
  const { position, stale, lastSeen, connection } = useLivePickupLocation({
    pickupId,
    active,
  });

  return (
    <div className="space-y-2">
      <MapView
        markers={[]}
        destination={destination}
        live={position ? { lat: position.lat, lng: position.lng } : null}
        liveStale={stale}
        height={280}
      />
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          {!stale && position ? (
            <span
              className="rj-dot-live inline-block size-2 rounded-full bg-leaf-bright"
              aria-hidden
            />
          ) : (
            <span
              className="inline-block size-2 rounded-full bg-muted-foreground/50"
              aria-hidden
            />
          )}
          <span className={stale ? "text-muted-foreground" : "text-leaf"}>
            {position
              ? stale
                ? "Location may be outdated"
                : "Live"
              : "Waiting for location…"}
          </span>
        </span>
        {lastSeen && (
          <span className="text-muted-foreground">updated {lastSeen}</span>
        )}
        {connection === "polling" && (
          <span className="text-muted-foreground">reconnecting…</span>
        )}
      </div>
    </div>
  );
}
