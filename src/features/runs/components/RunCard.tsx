import Link from "next/link";
import { Calendar, Truck, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES, RUN_SLOT_LABELS } from "@/config/constants";
import type { Run } from "@/server/db/schema";
import { RunStatusPill } from "./RunStatusPill";

export async function RunCard({ run, stopCount }: { run: Run; stopCount: number }) {
  const t = await getTranslations("admin");
  const runDate = new Date(run.runDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <Link
      href={ROUTES.adminRun(run.id)}
      className="rj-press block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-border-strong"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-display font-bold">{RUN_SLOT_LABELS[run.slot]}</span>
        <RunStatusPill status={run.status} />
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Calendar className="size-3.5" aria-hidden /> {runDate}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden /> {stopCount} {t("runs.stopCount")}
      </p>
      {!run.driverId && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
          <Truck className="size-3.5" aria-hidden /> {t("runs.noDriver")}
        </p>
      )}
    </Link>
  );
}
