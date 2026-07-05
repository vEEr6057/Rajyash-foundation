"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { intlLocale } from "@/features/pickups/lib/format";
import type { StopTimelineRow } from "@/features/runs/lib/stopHistory";

/**
 * UX-14: admin run detail History — a chronological "when was each stop
 * completed" timeline. NOTE: unlike the pickup History (PickupHistorySection),
 * run_stops has no actor/from audit trail in the schema (see stopHistory.ts) —
 * this intentionally shows completion time only, not a full transition log.
 */
export function StopHistorySection({ rows }: { rows: StopTimelineRow[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();

  if (rows.length === 0) return null;

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);

  return (
    <Collapsible className="mb-6 border-t border-border pt-6">
      <CollapsibleTrigger className="flex w-full items-center justify-between text-left font-display text-[15px] font-semibold [&[data-state=open]>svg]:rotate-180">
        {t("runs.detail.historyTitle", { count: rows.length })}
        <ChevronDown className="size-4 shrink-0 transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-3 space-y-1.5 border-l border-border py-1 pl-3 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {r.kind === "pickup" ? t("runs.kindPickup") : t("runs.kindDrop")}
              </span>
              {" · "}
              {r.address ?? "—"}
              {" · "}
              <span className="tabular-nums">{fmt(r.doneAt)}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
