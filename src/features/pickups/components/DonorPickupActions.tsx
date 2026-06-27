"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editable = status === "requested";

  function cancel() {
    if (!confirm("Cancel this pickup request?")) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelPickup(pickupId);
      if (!res.ok) return setError(res.message);
      router.refresh();
    });
  }

  function repost() {
    setError(null);
    startTransition(async () => {
      const res = await repostPickup(pickupId);
      if (!res.ok) return setError(res.message);
      if ("id" in res) router.push(ROUTES.pickup(res.id));
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {editable && (
          <Link
            href={ROUTES.editPickup(pickupId)}
            className={buttonVariants({ variant: "outline" })}
          >
            Edit
          </Link>
        )}
        {editable && (
          <Button variant="destructive" onClick={cancel} disabled={isPending}>
            Cancel request
          </Button>
        )}
        <Button variant="secondary" onClick={repost} disabled={isPending}>
          Repost
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
