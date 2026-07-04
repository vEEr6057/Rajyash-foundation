"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setRunStatus, deleteRun } from "@/features/runs/actions/runActions";
import {
  VALID_RUN_TRANSITIONS,
  RUN_STATUS_LABEL_KEYS,
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
  const tCommon = useTranslations("common");
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<null | "cancel" | "delete">(null);

  const nextStatuses = VALID_RUN_TRANSITIONS[status];
  // deleteRun allows planned OR cancelled — keep the Delete button in parity.
  const canDelete = status === "planned" || status === "cancelled";

  if (nextStatuses.length === 0 && !canDelete) return null;

  function advance(to: RunStatus) {
    start(async () => {
      const res = await setRunStatus(runId, to);
      if (res.ok) {
        toast.success(tCommon("toast.updated"));
        setConfirm(null);
        router.refresh();
      } else toast.error(res.message ?? tCommon("toast.error"));
    });
  }

  function doDelete() {
    start(async () => {
      const res = await deleteRun(runId);
      if (res.ok) {
        toast.success(tCommon("toast.deleted"));
        router.push(ROUTES.adminRuns);
      } else toast.error(res.message ?? tCommon("toast.error"));
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
          onClick={() => (to === "cancelled" ? setConfirm("cancel") : advance(to))}
        >
          {t("runs.status.advance", { status: tCommon(RUN_STATUS_LABEL_KEYS[to]) })}
        </Button>
      ))}
      {canDelete && (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => setConfirm("delete")}>
          {t("runs.delete")}
        </Button>
      )}

      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={tCommon("confirm.cancelRunTitle")}
        description={tCommon("confirm.cancelRunBody")}
        confirmLabel={tCommon("confirm.cancelRunConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        pending={pending}
        onConfirm={() => advance("cancelled")}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={tCommon("confirm.deleteTitle", { item: "run" })}
        description={tCommon("confirm.deleteBody")}
        confirmLabel={tCommon("confirm.deleteConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        pending={pending}
        onConfirm={doDelete}
      />
    </div>
  );
}
