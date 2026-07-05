import { StopStatusPill } from "./StopStatusPill";
import { MarkStopDoneButton } from "./MarkStopDoneButton";
import type { RunStop } from "@/server/db/schema";

/**
 * dispatch-model-v2 (docs/specs/dispatch-model-v2.md): one active run on the
 * volunteer "Today's distributions" list (/portal/distributions). Volunteers
 * confirm drops only — the drop (not pickup) leg is what they help with —
 * reusing the same markStopDone path the driver's run page uses
 * (runActions.ts already allows any volunteer to confirm a drop on an ACTIVE
 * run, so no new server logic is needed here).
 */
export function DistributionRunCard({
  meta,
  dropStops,
  noDropStopsLabel,
}: {
  meta: string;
  dropStops: RunStop[];
  noDropStopsLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {meta}
      </p>
      {dropStops.length === 0 ? (
        <p className="text-sm text-muted-foreground">{noDropStopsLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {dropStops.map((stop) => (
            <li key={stop.id} className="flex items-center gap-3 py-3">
              <span className="flex-1 truncate text-sm">{stop.address ?? "—"}</span>
              <StopStatusPill status={stop.status} />
              <div className="w-28 shrink-0">
                <MarkStopDoneButton stopId={stop.id} stopStatus={stop.status} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
