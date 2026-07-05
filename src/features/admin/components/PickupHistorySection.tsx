"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { intlLocale } from "@/features/pickups/lib/format";
import type { StatusHistoryRow } from "@/features/admin/lib/statusHistory";

/**
 * UX-14: admin-only status-transition history for a pickup — collapsed by
 * default (a coordinator scanning many pickups doesn't want N history lists
 * open at once). Renders nothing when there are no events yet (a fresh
 * `requested` pickup has none).
 */
export function PickupHistorySection({ rows }: { rows: StatusHistoryRow[] }) {
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
    <Collapsible className="mt-6">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-semibold [&[data-state=open]>svg]:rotate-180">
        {t("pickups.detail.historyTitle", { count: rows.length })}
        <ChevronDown className="size-4 transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5 border-l border-border py-1 pl-3 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {r.fromStatus ? `${tCommon(`status.${r.fromStatus}`)} → ` : ""}
                {tCommon(`status.${r.toStatus}`)}
              </span>
              {" · "}
              {r.actorName}
              {" · "}
              <span className="tabular-nums">{fmt(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
