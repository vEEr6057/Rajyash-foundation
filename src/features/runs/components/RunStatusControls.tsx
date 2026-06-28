"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { setRunStatus, deleteRun } from "@/features/runs/actions/runActions";
import {
  VALID_RUN_TRANSITIONS,
  RUN_STATUS_LABELS,
  ROUTES,
  type RunStatus,
} from "@/config/constants";

export function RunStatusControls({
  runId,
  status,
}: {
  runId: string;
  status: RunStatus;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [pending, start] = useTransition();

  const nextStatuses = VALID_RUN_TRANSITIONS[status];
  const canDelete = status === "planned";

  if (nextStatuses.length === 0 && !canDelete) return null;

  function advance(to: RunStatus) {
    start(async () => {
      await setRunStatus(runId, to);
      router.refresh();
    });
  }

  function doDelete() {
    start(async () => {
      const res = await deleteRun(runId);
      if (res.ok) router.push(ROUTES.adminRuns);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((to) => (
        <Button
          key={to}
          size="sm"
          variant={to === "cancelled" ? "destructive" : "leaf"}
          disabled={pending}
          onClick={() => advance(to)}
        >
          {t("runs.status.advance", { status: RUN_STATUS_LABELS[to] })}
        </Button>
      ))}
      {canDelete && (
        <Button size="sm" variant="destructive" disabled={pending} onClick={doDelete}>
          {t("runs.delete")}
        </Button>
      )}
    </div>
  );
}
