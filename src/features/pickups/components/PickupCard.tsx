import Link from "next/link";
import { MapPin, Clock, Package } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import type { Pickup } from "@/server/db/schema";
import { ROUTES } from "@/config/constants";
import { formatQuantity, formatWindow } from "@/features/pickups/lib/format";
import { PickupStatusPill } from "./PickupStatusPill";

/** Presentational pickup summary card (links to detail). */
export async function PickupCard({ pickup }: { pickup: Pickup }) {
  const [t, locale] = await Promise.all([getTranslations("common"), getLocale()]);
  return (
    <Link
      href={ROUTES.pickup(pickup.id)}
      className="rj-press block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-surface-2 active:bg-surface-2"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-display font-semibold">
          <Package className="size-4 text-primary" />
          {t(`foodCategory.${pickup.category}`)}
        </span>
        <PickupStatusPill status={pickup.status} />
      </div>
      <p className="font-display text-sm font-medium tabular-nums text-foreground">
        {formatQuantity(pickup.quantity, pickup.quantityUnit, t)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="size-3.5" />
        {formatWindow(pickup.windowStart, pickup.windowEnd, locale)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-3.5" />
        <span className="truncate">{pickup.address}</span>
      </p>
    </Link>
  );
}
