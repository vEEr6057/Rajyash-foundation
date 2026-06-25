import { PICKUP_STATUS_PILL, type PickupStatus } from "@/config/constants";
import { formatStatus } from "@/features/pickups/lib/format";
import { cn } from "@/lib/utils";

/** Status pill using the design-system per-state tokens (--st-<key>-bg/-fg/-dot). */
export function PickupStatusPill({
  status,
  className,
}: {
  status: PickupStatus;
  className?: string;
}) {
  const k = PICKUP_STATUS_PILL[status];
  const live = status === "en_route";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        className,
      )}
      style={{
        background: `var(--st-${k}-bg)`,
        color: `var(--st-${k}-fg)`,
      }}
    >
      <span
        className={cn("size-2 rounded-full", live && "rj-dot-live")}
        style={{ background: `var(--st-${k}-dot)` }}
      />
      {formatStatus(status)}
    </span>
  );
}
