"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StopStatusPill } from "./StopStatusPill";
import { removeStop, reorderStops, overrideStopStatus } from "@/features/runs/actions/runActions";
import { STOP_STATUSES, type StopStatus } from "@/config/constants";
import type { RunStop } from "@/server/db/schema";

export function StopList({
  stops,
  runId,
  editable = true,
}: {
  stops: RunStop[];
  runId: string;
  // B4 parity: a completed/cancelled run's stops are read-only (server rejects edits).
  editable?: boolean;
}) {
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

  // RUN-08: admin override — bypasses the normal driver/volunteer transition
  // path for a single stop (e.g. correcting a missed mark-done in the field).
  function doOverride(stopId: string, status: StopStatus) {
    start(async () => {
      const res = await overrideStopStatus(stopId, status);
      if (res.ok) {
        toast.success(tCommon("toast.updated"));
        router.refresh();
      } else toast.error(res.message ?? tCommon("toast.error"));
    });
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
      const res = await reorderStops({ runId, items });
      if (res.ok) router.refresh();
      else toast.error(res.message ?? tCommon("toast.error"));
    });
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {stops.map((stop, i) => (
        <div key={stop.id} className="flex items-center gap-3 py-3">
          <span className="w-6 shrink-0 font-display text-sm font-semibold tabular-nums text-gold-ink">
            {stop.seq}
          </span>
          <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            {stop.kind === "pickup" ? t("runs.kindPickup") : t("runs.kindDrop")}
          </span>
          <span className="flex-1 truncate text-sm">{stop.address ?? "—"}</span>
          {editable ? (
            <Select
              value={stop.status}
              onValueChange={(v) => doOverride(stop.id, v as StopStatus)}
            >
              <SelectTrigger
                className="h-8 w-28 shrink-0 text-xs"
                aria-label={t("runs.overrideStatus")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tCommon(`stopStatus.${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <StopStatusPill status={stop.status} />
          )}
          {editable && (
            <>
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
              <Button
                size="icon"
                variant="ghost"
                disabled={pending}
                aria-label={t("runs.removeStop")}
                onClick={() => setRemoveId(stop.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      ))}

      {editable && (
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
      )}
    </div>
  );
}
