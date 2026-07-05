import Link from "next/link";
import { MapPin, Clock, Package } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import type { Pickup } from "@/server/db/schema";
import { ROUTES, type Role } from "@/config/constants";
import { formatQuantity, formatWindow } from "@/features/pickups/lib/format";
import { PickupStatusPill } from "./PickupStatusPill";
import { BoardClaimButton } from "./BoardClaimButton";

/**
 * Presentational pickup summary card (links to detail). UX-1: when a driver
 * views an available pickup, a claim button sits below the (still fully
 * clickable) card body — a sibling of the Link, never nested inside it, so
 * tapping Claim never also navigates.
 */
export async function PickupCard({ pickup, role }: { pickup: Pickup; role?: Role }) {
  const [t, locale] = await Promise.all([getTranslations("common"), getLocale()]);
  const showClaim = role === "driver" && pickup.status === "requested";
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm transition-colors hover:bg-surface-2">
      <Link href={ROUTES.pickup(pickup.id)} className="rj-press block p-4 active:bg-surface-2">
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
      {showClaim && (
        <div className="border-t border-border p-3">
          <BoardClaimButton pickupId={pickup.id} />
        </div>
      )}
    </div>
  );
}
