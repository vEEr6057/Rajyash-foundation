"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { claimPickup } from "@/features/pickups/actions/pickupActions";

/**
 * UX-1: claim straight from the board card — a 2-tap confirm instead of
 * drilling into the detail page first just to reach the ClaimButton there.
 * Same atomic claimPickup server action as the detail page; this is only a
 * closer entry point, its semantics are untouched.
 */
export function BoardClaimButton({ pickupId }: { pickupId: string }) {
  const router = useRouter();
  const t = useTranslations("portal");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmClaim() {
    setError(null);
    startTransition(async () => {
      const res = await claimPickup(pickupId);
      if (!res.ok) {
        setError(res.message);
        toast.error(res.message);
        setOpen(false);
        // TAKEN: someone else claimed it first — refresh drops it from the
        // open-board list (it's no longer 'requested'), clearing the card.
        if (res.code === "TAKEN") router.refresh();
        return;
      }
      toast.success(t("pickup.card.claimButton"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant="leaf"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        {t("pickup.card.claim")}
      </Button>
      {error && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={tCommon("confirm.claimPickupTitle")}
        description={tCommon("confirm.claimPickupBody")}
        confirmLabel={tCommon("confirm.claimPickupConfirm")}
        cancelLabel={tCommon("confirm.keep")}
        destructive={false}
        pending={isPending}
        onConfirm={confirmClaim}
      />
    </div>
  );
}
