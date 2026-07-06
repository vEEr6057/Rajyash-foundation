"use client";

import { useTranslations } from "next-intl";
import { MapView } from "@/features/pickups";
import { useLiveRunLocation } from "@/features/runs/hooks/useLiveRunLocation";
import { useRunRoute } from "@/features/runs/hooks/useRunRoute";

/**
 * Coordinator/driver/volunteer run watcher (TRK-05/06). Mirrors LiveTrackingMap:
 * live driver marker, route polyline (--route gold), ETA card, stale indicator.
 * `nextStop` = the next pending stop's coords (resolved by the page).
 * Uses the "portal" i18n namespace (next-intl loads it regardless of route).
 */
export function RunLiveMap({
  runId,
  active,
  nextStop,
}: {
  runId: string;
  active: boolean;
  nextStop: { lat: number; lng: number } | null;
}) {
  const t = useTranslations("portal");
  const { position, stale, lastSeen, connection } = useLiveRunLocation({ runId, active });
  const live = position ? { lat: position.lat, lng: position.lng } : null;
  const { route, etaMinutes, source } = useRunRoute({ runId, live, active });

  return (
    <div className="space-y-2">
      <MapView
        markers={[]}
        destination={nextStop}
        live={live}
        liveStale={stale}
        route={route}
        height={280}
      />
      {etaMinutes != null && etaMinutes > 0 && !stale && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-leaf">
          <span>{t("run.liveMap.etaAway", { minutes: etaMinutes })}</span>
          {source === "line" && (
            <span className="text-xs font-normal text-muted-foreground">
              {t("run.liveMap.etaEstimate")}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5">
          {!stale && position ? (
            <span className="rj-dot-live inline-block size-2 rounded-full bg-leaf-bright" aria-hidden />
          ) : (
            <span className="inline-block size-2 rounded-full bg-muted-foreground/50" aria-hidden />
          )}
          <span className={stale ? "text-muted-foreground" : "text-leaf"}>
            {position
              ? stale
                ? t("run.liveMap.stale")
                : t("run.liveMap.live")
              : t("run.liveMap.waiting")}
          </span>
        </span>
        {lastSeen && <span className="text-muted-foreground">updated {lastSeen}</span>}
        {connection === "polling" && (
          <span className="text-muted-foreground">{t("run.liveMap.reconnecting")}</span>
        )}
      </div>
    </div>
  );
}
