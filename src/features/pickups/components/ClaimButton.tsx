"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimPickup } from "@/features/pickups/actions/pickupActions";

/** VOL-03 / VOL-06: claim with loading + retry-on-failure (field networks). */
export function ClaimButton({ pickupId }: { pickupId: string }) {
  const router = useRouter();
  const t = useTranslations("portal");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function claim() {
    setError(null);
    startTransition(async () => {
      const res = await claimPickup(pickupId);
      if (!res.ok) {
        setError(res.message);
        toast.error(res.message);
        if (res.code === "TAKEN") router.refresh();
        return;
      }
      toast.success(t("pickup.card.claimButton"));
      router.refresh();
    });
  }

  return (
    <div>
      <Button variant="leaf" size="lg" className="w-full" onClick={claim} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? t("pickup.card.claiming") : t("pickup.card.claimButton")}
      </Button>
      {error && (
        <p className="mt-1.5 text-sm text-destructive" role="alert">
          {error}{" "}
          {!isPending && (
            <button type="button" className="underline" onClick={claim}>
              {tCommon("buttons.retry")}
            </button>
          )}
        </p>
      )}
    </div>
  );
}
