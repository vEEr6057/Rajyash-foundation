"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type PickupStatus } from "@/config/constants";
import { nextStatus, isDeliveringTransition } from "@/features/pickups/lib/statusMachine";
import {
  advancePickup,
  setProofPhoto,
} from "@/features/pickups/actions/pickupActions";
import { PhotoUploader } from "./PhotoUploader";

/** VOL-04/05/06: advance to the next status; require proof photo before delivering. */
export function StatusAdvanceSection({
  pickupId,
  status,
  hasProof,
}: {
  pickupId: string;
  status: PickupStatus;
  hasProof: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("portal");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proofDone, setProofDone] = useState(hasProof);

  const next = nextStatus(status);
  if (!next) return null; // terminal (delivered/cancelled)

  // DEL-01 (v2): proof photo is OPTIONAL — offered on the delivering step, never required.
  const delivering = isDeliveringTransition(status, next);

  function advance() {
    setError(null);
    startTransition(async () => {
      const res = await advancePickup(pickupId);
      if (!res.ok) {
        setError(res.message);
        toast.error(res.message);
        return;
      }
      toast.success(tCommon("status." + next));
      router.refresh();
    });
  }

  async function onProofUploaded(path: string) {
    const res = await setProofPhoto(pickupId, path);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setProofDone(true);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {delivering && (
        <div>
          <p className="mb-1.5 text-sm font-semibold">{t("pickup.detail.proofUpload")}</p>
          {proofDone ? (
            <p className="text-sm text-leaf">{t("pickup.detail.proofDone")}</p>
          ) : (
            <>
              <p className="mb-1.5 text-xs text-muted-foreground">{t("pickup.detail.proofOptional")}</p>
              <PhotoUploader kind="proof" label="Add proof photo" onUploaded={onProofUploaded} />
            </>
          )}
        </div>
      )}

      <Button
        variant="leaf"
        size="lg"
        className="w-full"
        onClick={advance}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending
          ? t("pickup.detail.advancing")
          : t("pickup.detail.advanceButton", { nextStatus: tCommon(`status.${next}`) })}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}{" "}
          {!isPending && (
            <button type="button" className="underline" onClick={advance}>
              {tCommon("buttons.retry")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
