"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StopStatusPill } from "./StopStatusPill";
import { removeStop, reorderStops } from "@/features/runs/actions/runActions";
import type { RunStop } from "@/server/db/schema";

export function StopList({ stops, runId }: { stops: RunStop[]; runId: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, start] = useTransition();

  if (stops.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong p-6 text-center text-sm text-muted-foreground">
        {t("runs.noStops")}
      </p>
    );
  }

  // RUN-04: reorder by swapping the seq of a stop with its neighbour.
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= stops.length) return;
    const a = stops[index];
    const b = stops[target];
    const items = [
      { id: a.id, seq: b.seq },
      { id: b.id, seq: a.seq },
    ];
    start(async () => {
      await reorderStops({ runId, items });
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {stops.map((stop, i) => (
        <div
          key={stop.id}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-sm"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {stop.seq}
          </span>
          <div className="flex flex-col">
            <button
              type="button"
              disabled={pending || i === 0}
              aria-label={t("runs.moveUp")}
              onClick={() => move(i, -1)}
              className="text-muted-foreground disabled:opacity-30"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={pending || i === stops.length - 1}
              aria-label={t("runs.moveDown")}
              onClick={() => move(i, 1)}
              className="text-muted-foreground disabled:opacity-30"
            >
              <ArrowDown className="size-3.5" />
            </button>
          </div>
          <span className="flex-1">
            <span className="font-medium">
              {stop.kind === "pickup" ? t("runs.kindPickup") : t("runs.kindDrop")}
            </span>
            {stop.address && (
              <span className="ml-2 text-muted-foreground">{stop.address}</span>
            )}
          </span>
          <StopStatusPill status={stop.status} />
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={t("runs.removeStop")}
            onClick={() => {
              start(async () => {
                await removeStop(stop.id, runId);
                router.refresh();
              });
            }}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
