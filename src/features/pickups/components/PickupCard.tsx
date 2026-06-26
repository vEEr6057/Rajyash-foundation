import Link from "next/link";
import { MapPin, Clock, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Pickup } from "@/server/db/schema";
import { ROUTES } from "@/config/constants";
import { formatQuantity, formatWindow } from "@/features/pickups/lib/format";
import { PickupStatusPill } from "./PickupStatusPill";

/** Presentational pickup summary card (links to detail). */
export async function PickupCard({ pickup }: { pickup: Pickup }) {
  const t = await getTranslations("common");
  return (
    <Link
      href={ROUTES.pickup(pickup.id)}
      className="rj-press block rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-display font-bold">
          <Package className="size-4 text-primary" />
          {t(`foodCategory.${pickup.category}`)}
        </span>
        <PickupStatusPill status={pickup.status} />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {formatQuantity(pickup.quantity, pickup.quantityUnit)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="size-3.5" />
        {formatWindow(pickup.windowStart, pickup.windowEnd)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-3.5" />
        <span className="truncate">{pickup.address}</span>
      </p>
    </Link>
  );
}
