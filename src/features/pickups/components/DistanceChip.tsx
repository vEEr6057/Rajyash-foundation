"use client";

import { Locate } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDistance, haversineKm } from "@/lib/routing";
import { useDriverPosition } from "@/features/pickups/lib/driverPositionContext";

/**
 * UX-2: compact "how far away" chip for a driver board card. Reads the
 * shared one-shot fix from DriverPositionContext (set once by
 * DistanceAwareBoardList) — renders nothing until a fix exists, and nothing
 * for a pickup missing coords.
 */
export function DistanceChip({ lat, lng }: { lat: number | null; lng: number | null }) {
  const t = useTranslations("portal");
  const position = useDriverPosition();
  if (!position || lat == null || lng == null) return null;

  const distance = formatDistance(haversineKm(position, { lat, lng }));
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground"
      aria-label={t("pickup.board.distanceAway", { distance })}
    >
      <Locate className="size-3" aria-hidden="true" />
      {distance}
    </span>
  );
}
