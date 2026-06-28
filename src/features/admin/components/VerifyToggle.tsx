"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  verifyPickup,
  unverifyPickup,
} from "@/features/admin/actions/intakeActions";

interface Props {
  pickupId: string;
  verifiedAt: Date | null;
  verifiedBy: string | null;
}

export function VerifyToggle({ pickupId, verifiedAt }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isVerified = !!verifiedAt;

  function handleToggle() {
    startTransition(async () => {
      const action = isVerified ? unverifyPickup : verifyPickup;
      const r = await action(pickupId);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {isVerified && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <ShieldCheck className="size-3" />
          {t("pickup.verify.verifiedBadge")}
        </span>
      )}
      <Button
        size="sm"
        variant={isVerified ? "outline" : "secondary"}
        onClick={handleToggle}
        disabled={isPending}
      >
        {isPending
          ? t("pickup.verify.pending")
          : isVerified
            ? t("pickup.verify.unverifyButton")
            : t("pickup.verify.verifyButton")}
      </Button>
    </div>
  );
}
