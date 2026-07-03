"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ROUTES } from "@/config/constants";
import { cancelPickup, repostPickup } from "@/features/pickups/actions/pickupActions";

/** Donor controls on a pickup detail: edit/cancel (while requested), repost (any). */
export function DonorPickupActions({
  pickupId,
  status,
}: {
  pickupId: string;
  status: string;
}) {
  const router = useRouter();
  const t = useTranslations("portal");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const editable = status === "requested";

  function cancel() {
    startTransition(async () => {
      const res = await cancelPickup(pickupId);
      if (!res.ok) {
        toast.error(res.message ?? tCommon("toast.error"));
        return;
      }
      toast.success(tCommon("toast.updated"));
      setConfirmOpen(false);
      router.refresh();
    });
  }

  function repost() {
    startTransition(async () => {
      const res = await repostPickup(pickupId);
      if (!res.ok) {
        toast.error(res.message ?? tCommon("toast.error"));
        return;
      }
      toast.success(tCommon("toast.done"));
      if ("id" in res) router.push(ROUTES.pickup(res.id));
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {editable && (
          <Link
            href={ROUTES.editPickup(pickupId)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {tCommon("buttons.edit")}
          </Link>
        )}
        <Button variant="outline" size="sm" onClick={repost} disabled={isPending}>
          <RotateCcw className="size-4" />
          {t("pickup.detail.quickRepost")}
        </Button>
      </div>

      {/* Destructive action hairline-separated from the rest (charter §3.5) */}
      {editable && (
        <div className="mt-4 border-t border-border pt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
          >
            {t("pickup.detail.cancelButton")}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={tCommon("confirm.cancelPickupTitle")}
        description={tCommon("confirm.cancelPickupBody")}
        confirmLabel={tCommon("confirm.cancelPickupConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        pending={isPending}
        onConfirm={cancel}
      />
    </div>
  );
}
