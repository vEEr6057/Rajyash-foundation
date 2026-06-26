import { getTranslations } from "next-intl/server";
import { PickupStatusPill } from "@/features/pickups/components/PickupStatusPill";
import { formatQuantity } from "@/features/pickups/lib/format";
import type { Pickup } from "@/server/db/schema";
import { AssignVolunteerControl } from "./AssignVolunteerControl";

/** Presentational admin pickup row; only the assign control (requested rows) is a client island. */
export async function AdminPickupRow({
  pickup,
  volunteers,
}: {
  pickup: Pickup;
  volunteers: { id: string; name: string }[];
}) {
  const [tCommon, tAdmin] = await Promise.all([
    getTranslations("common"),
    getTranslations("admin"),
  ]);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <PickupStatusPill status={pickup.status} />
          <span className="font-medium">{tCommon(`foodCategory.${pickup.category}`)}</span>
          <span className="text-muted-foreground">
            · {formatQuantity(pickup.quantity, pickup.quantityUnit)}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {pickup.address} ·{" "}
          {pickup.volunteerId ? tAdmin("pickups.table.assigned") : tAdmin("pickups.table.unassigned")} ·{" "}
          {new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
          }).format(pickup.createdAt)}
        </span>
      </div>
      {pickup.status === "requested" && (
        <AssignVolunteerControl pickupId={pickup.id} volunteers={volunteers} />
      )}
    </div>
  );
}
