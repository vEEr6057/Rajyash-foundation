"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { StopStatus } from "@/config/constants";

// Reuse the existing status-pill design tokens (no new tokens needed).
const STOP_STATUS_TOKEN: Record<StopStatus, string> = {
  pending: "requested",
  done: "delivered",
  skipped: "cancelled",
};

export function StopStatusPill({
  status,
  className,
}: {
  status: StopStatus;
  className?: string;
}) {
  const t = useTranslations("common");
  const k = STOP_STATUS_TOKEN[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        className,
      )}
      style={{ background: `var(--st-${k}-bg)`, color: `var(--st-${k}-fg)` }}
    >
      <span className="size-2 rounded-full" style={{ background: `var(--st-${k}-dot)` }} aria-hidden />
      {t(`stopStatus.${status}`)}
    </span>
  );
}
