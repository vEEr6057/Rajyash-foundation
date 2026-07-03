"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markStopDone } from "@/features/runs/actions/runActions";
import type { StopStatus } from "@/config/constants";

export function MarkStopDoneButton({
  stopId,
  stopStatus,
  size = "sm",
  variant = "leaf",
  className,
}: {
  stopId: string;
  stopStatus: StopStatus;
  size?: "sm" | "lg";
  variant?: "leaf" | "primary";
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("portal");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (stopStatus !== "pending") return null; // only actionable while pending

  function handleDone() {
    setError(null);
    startTransition(async () => {
      const res = await markStopDone(stopId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      toast.success(
        res.runCompleted ? t("run.runCompleteToast") : t("run.stop.doneToast"),
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <Button
        variant={variant}
        size={size}
        className={cn("w-full", className)}
        onClick={handleDone}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {isPending ? t("run.stop.marking") : t("run.stop.markDone")}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}{" "}
          {!isPending && (
            <button type="button" className="underline" onClick={handleDone}>
              {t("run.stop.retry")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
