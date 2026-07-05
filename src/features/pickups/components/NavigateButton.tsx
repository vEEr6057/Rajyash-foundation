"use client";

import { Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { googleMapsDirectionsUrl, googleMapsDirectionsUrlForAddress } from "@/lib/maps-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Driver one-tap navigation (bridge §4 / UX-4). Opens the Google Maps app/site
 * with turn-by-turn directions — free deep-link, no API/billing. Prefers exact
 * coords; falls back to the free-text address when a stop has none yet (e.g.
 * an ad-hoc run stop). `compact` renders an icon-only button for tight rows
 * (run stop list) instead of the full-width labelled button (pickup detail).
 */
export function NavigateButton({
  lat,
  lng,
  address,
  compact = false,
}: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  compact?: boolean;
}) {
  const t = useTranslations("portal");
  const href =
    lat != null && lng != null
      ? googleMapsDirectionsUrl(lat, lng)
      : address
        ? googleMapsDirectionsUrlForAddress(address)
        : null;
  if (!href) return null;

  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("pickup.detail.navigate")}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")}
      >
        <Navigation className="size-4" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2")}
    >
      <Navigation className="size-4" aria-hidden />
      {t("pickup.detail.navigate")}
    </a>
  );
}
