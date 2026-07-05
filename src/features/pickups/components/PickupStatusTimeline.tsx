"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { APP_TIME_ZONE, intlLocale } from "@/features/pickups/lib/format";
import type { TimelineStage } from "@/features/pickups/lib/timeline";

const STAGE_LABEL_KEY: Record<TimelineStage["key"], string> = {
  posted: "posted",
  claimed: "claimed",
  en_route: "enRoute",
  delivered: "delivered",
  cancelled: "cancelled",
};

/**
 * UX-7: vertical stage timeline for the donor's own pickup detail. Current
 * stage gets the design system's live pulse; never renders actor names/roles
 * (the underlying statusEvents carry an actorId — deliberately not passed in).
 */
export function PickupStatusTimeline({ stages }: { stages: TimelineStage[] }) {
  const t = useTranslations("portal");
  const locale = useLocale();
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <ol className="space-y-4">
      {stages.map((stage) => (
        <li key={stage.key} className="flex items-start gap-3">
          <span
            className={cn(
              "mt-1 size-2.5 shrink-0 rounded-full",
              stage.isDone ? "bg-leaf" : "bg-border",
              stage.isCurrent && "rj-dot-live",
            )}
            aria-hidden="true"
          />
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                !stage.isDone && "text-muted-foreground",
              )}
            >
              {t(`pickup.detail.timeline.${STAGE_LABEL_KEY[stage.key]}`)}
            </p>
            {stage.timestamp && (
              <p className="text-xs tabular-nums text-subtle-foreground">
                {fmt.format(stage.timestamp)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
