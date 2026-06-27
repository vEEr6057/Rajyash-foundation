"use client";

import { useTranslations } from "next-intl";
import { MapView } from "./MapView";
import { useLivePickupLocation } from "@/features/pickups/hooks/useLivePickupLocation";
import { usePickupRoute } from "@/features/pickups/hooks/usePickupRoute";

/**
 * Donor/admin live view (TRK-02/03). Subscribes via useLivePickupLocation
 * (realtime + 10s polling fallback), renders the interpolated volunteer marker,
 * a route line + ETA (usePickupRoute), and a freshness badge.
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
  const t = useTranslations("portal");
  const { position, stale, lastSeen, connection } = useLivePickupLocation({
    pickupId,
    active,
  });
  const live = position ? { lat: position.lat, lng: position.lng } : null;
  const { route, etaMinutes, source } = usePickupRoute({ pickupId, live, active });

  return (
    <div className="space-y-2">
      <MapView
        markers={[]}
        destination={destination}
        live={live}
        liveStale={stale}
        route={route}
        height={280}
      />
      {etaMinutes != null && !stale && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-leaf">
          <span>{t("pickup.detail.etaAway", { minutes: etaMinutes })}</span>
          {source === "line" && (
            <span className="text-xs font-normal text-muted-foreground">
              {t("pickup.detail.etaEstimate")}
            </span>
          )}
        </div>
      )}
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
        {lastSeen && <span className="text-muted-foreground">updated {lastSeen}</span>}
        {connection === "polling" && (
          <span className="text-muted-foreground">reconnecting…</span>
        )}
      </div>
    </div>
  );
}
