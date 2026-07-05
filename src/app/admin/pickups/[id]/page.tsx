import { notFound, redirect } from "next/navigation";
import { Clock, MapPin, Package } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { statusEventsRepo } from "@/server/db/repositories/statusEvents";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { partnersRepo } from "@/server/db/repositories/partners";
import { ROUTES } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { PickupStatusPill } from "@/features/pickups/components/PickupStatusPill";
import { formatQuantity, formatWindow } from "@/features/pickups/lib/format";
import { buildStatusHistory } from "@/features/admin/lib/statusHistory";
import { PickupHistorySection } from "@/features/admin/components/PickupHistorySection";

export const dynamic = "force-dynamic";

/**
 * Admin-only pickup detail (UX-14). Deliberately separate from the shared
 * `/portal/pickups/[id]` page donor/driver/volunteer views share — this
 * surface exists specifically to show the full status_events history with the
 * ACTOR resolved (who did it, not just what happened), which isn't information
 * the portal view exposes to every role. Read-only: mutations (assign, verify)
 * stay on the admin pickups table / pickup detail's existing entry points.
 */
export default async function AdminPickupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  const [tCommon, tAdmin, locale] = await Promise.all([
    getTranslations("common"),
    getTranslations("admin"),
    getLocale(),
  ]);

  const pickup = await pickupsRepo.getById(id);
  if (!pickup) notFound();

  const [events, donor, driver, partner] = await Promise.all([
    statusEventsRepo.listForPickup(id),
    profilesRepo.getById(pickup.donorId),
    pickup.volunteerId ? profilesRepo.getById(pickup.volunteerId) : null,
    pickup.partnerId ? partnersRepo.getById(pickup.partnerId) : null,
  ]);

  // Resolve every distinct actor on this pickup's history to a display name —
  // small, bounded fan-out (a pickup has at most a handful of transitions).
  const actorIds = [...new Set(events.map((e) => e.actorId))];
  const actorProfiles = await Promise.all(actorIds.map((aid) => profilesRepo.getById(aid)));
  const actorNameById = new Map(
    actorIds.map((aid, i) => [aid, actorProfiles[i]?.name ?? tAdmin("pickups.detail.actorUnknown")]),
  );
  const historyRows = buildStatusHistory(
    events,
    actorNameById,
    tAdmin("pickups.detail.actorUnknown"),
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <PageHeader
        eyebrow={tAdmin("pickups.detail.eyebrow")}
        title={
          <span className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            {tCommon(`foodCategory.${pickup.category}`)}
          </span>
        }
        action={<PickupStatusPill status={pickup.status} />}
      />

      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-lg font-semibold">
          {formatQuantity(pickup.quantity, pickup.quantityUnit, tCommon)}
        </p>
        {pickup.description && (
          <p className="text-sm text-muted-foreground">{pickup.description}</p>
        )}
        <p className="flex items-center gap-1.5 text-sm">
          <Clock className="size-4 text-muted-foreground" />
          {formatWindow(pickup.windowStart, pickup.windowEnd, locale)}
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 text-muted-foreground" />
          {pickup.address}
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
          <dt className="text-muted-foreground">{tAdmin("pickups.table.donor")}</dt>
          <dd>{donor?.name ?? tAdmin("pickups.detail.actorUnknown")}</dd>
          {partner && (
            <>
              <dt className="text-muted-foreground">{tAdmin("pickups.detail.partnerLabel")}</dt>
              <dd>{partner.name}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{tAdmin("pickups.table.driver")}</dt>
          <dd>
            {driver?.name ?? (
              <span className="text-muted-foreground">{tAdmin("pickups.table.unassigned")}</span>
            )}
          </dd>
        </dl>
      </div>

      <PickupHistorySection rows={historyRows} />
    </div>
  );
}
