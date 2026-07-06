"use client";

import { useTranslations } from "next-intl";
import { MapView } from "@/features/pickups";
import type { DistributionMapPin } from "@/features/runs/lib/distributionMapPins";

/**
 * UX-9: one pin per drop stop with coordinates, on the volunteer "Today's
 * distributions" page. Reuses MapView/MapViewInner (same component the board
 * map and live run map use) — only the popup content is new. Caller (the
 * page) already filters to pins.length > 0 before rendering this, per the
 * "no empty map" rule.
 */
export function DistributionsMap({ pins }: { pins: DistributionMapPin[] }) {
  const t = useTranslations("common");

  const markers = pins.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    popup: (
      <div className="space-y-0.5 text-sm">
        <p className="font-semibold">{p.title}</p>
        <p className="text-xs text-muted-foreground">{p.meta}</p>
        <p>{t(`stopStatus.${p.status}`)}</p>
      </div>
    ),
  }));

  return <MapView markers={markers} height={240} />;
}
