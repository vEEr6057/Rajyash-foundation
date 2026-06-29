"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StopStatusPill } from "./StopStatusPill";
import { removeStop, reorderStops } from "@/features/runs/actions/runActions";
import type { RunStop } from "@/server/db/schema";

export function StopList({ stops, runId }: { stops: RunStop[]; runId: string }) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [removeId, setRemoveId] = useState<string | null>(null);

  function doRemove(id: string) {
    start(async () => {
      const res = await removeStop(id, runId);
      if (res.ok) {
        toast.success(tCommon("toast.deleted"));
        setRemoveId(null);
        router.refresh();
      } else toast.error(res.message ?? tCommon("toast.error"));
    });
  }

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
            size="icon"
            variant="ghost"
            disabled={pending}
            aria-label={t("runs.removeStop")}
            onClick={() => setRemoveId(stop.id)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title={tCommon("confirm.removeStopTitle")}
        description={tCommon("confirm.removeStopBody")}
        confirmLabel={tCommon("confirm.removeStopConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        pending={pending}
        onConfirm={() => removeId && doRemove(removeId)}
      />
    </div>
  );
}
