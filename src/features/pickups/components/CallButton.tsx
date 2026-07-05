"use client";

import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * UX-3: tel: deep-link so a driver can call the donor (or a partner contact
 * on a run stop) without leaving the app. Renders nothing when there's no
 * phone on file — no layout jump, no dead button. `compact` renders an
 * icon-only button for tight rows (run stop list) instead of the full-width
 * icon+number button (pickup detail).
 */
export function CallButton({
  phone,
  compact = false,
}: {
  phone?: string | null;
  compact?: boolean;
}) {
  const t = useTranslations("common");
  if (!phone) return null;
  const label = t("buttons.call", { phone });

  if (compact) {
    return (
      <a
        href={`tel:${phone}`}
        aria-label={label}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0")}
      >
        <Phone className="size-4" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={`tel:${phone}`}
      aria-label={label}
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2")}
    >
      <Phone className="size-4" aria-hidden />
      {phone}
    </a>
  );
}
