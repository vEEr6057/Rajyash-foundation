"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { RunStatus } from "@/config/constants";

const RUN_STATUS_TOKEN: Record<RunStatus, string> = {
  planned: "requested",
  active: "enroute",
  completed: "delivered",
  cancelled: "cancelled",
};

export function RunStatusPill({
  status,
  className,
}: {
  status: RunStatus;
  className?: string;
}) {
  const t = useTranslations("common");
  const k = RUN_STATUS_TOKEN[status];
  const live = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        className,
      )}
      style={{ background: `var(--st-${k}-bg)`, color: `var(--st-${k}-fg)` }}
    >
      <span
        className={cn("size-2 rounded-full", live && "rj-dot-live")}
        style={{ background: `var(--st-${k}-dot)` }}
        aria-hidden
      />
      {t(`runStatus.${status}`)}
    </span>
  );
}
