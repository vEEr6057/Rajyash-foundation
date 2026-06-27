"use client";

import { Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { googleMapsDirectionsUrl } from "@/lib/maps-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Driver one-tap navigation (bridge §4). Opens the Google Maps app/site with
 * turn-by-turn directions to the pickup coords — free deep-link, no API/billing.
 */
export function NavigateButton({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations("portal");
  return (
    <a
      href={googleMapsDirectionsUrl(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2")}
    >
      <Navigation className="size-4" aria-hidden />
      {t("pickup.detail.navigate")}
    </a>
  );
}
