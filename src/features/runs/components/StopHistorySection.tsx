"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { intlLocale } from "@/features/pickups";
import type { StopHistoryRow } from "@/features/runs/lib/stopHistory";

/**
 * UX-14 v2: admin run detail History — the full stop_status_events audit
 * trail (from → to · actor · time), mirroring PickupHistorySection. A stop
 * with no recorded events (legacy — created before stop_status_events
 * shipped) falls back to a completion-time-only line (isLegacy) so old runs
 * still show something instead of going blank.
 */
export function StopHistorySection({ rows }: { rows: StopHistoryRow[] }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
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
              {r.isLegacy ? (
                <span className="tabular-nums">{fmt(r.createdAt)}</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {r.fromStatus ? `${tCommon(`stopStatus.${r.fromStatus}`)} → ` : ""}
                    {tCommon(`stopStatus.${r.toStatus}`)}
                  </span>
                  {" · "}
                  {r.actorName ?? t("runs.detail.actorUnknown")}
                  {" · "}
                  <span className="tabular-nums">{fmt(r.createdAt)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
