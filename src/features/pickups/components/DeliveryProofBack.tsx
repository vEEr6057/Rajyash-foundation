"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import type { PickupStatus } from "@/config/constants";

/**
 * UX-8: the donor-only "your food reached people in need" moment. Reuses
 * whatever signed URL the caller already resolved (safeSignedUrl in the
 * detail page — the same helper the driver's own proof upload confirmation
 * reads) — no new storage/URL surface. Renders nothing until delivery + a
 * proof photo actually exist.
 */
export function DeliveryProofBack({
  status,
  proofUrl,
}: {
  status: PickupStatus;
  proofUrl: string | null;
}) {
  const t = useTranslations("portal");
  if (status !== "delivered" || !proofUrl) return null;

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-leaf">
        <Heart className="size-4 fill-current" />
        {t("pickup.detail.proofBack.title")}
      </p>
      <Image
        src={proofUrl}
        alt={t("pickup.detail.proofBack.alt")}
        width={480}
        height={360}
        className="rounded-lg"
        unoptimized
      />
    </div>
  );
}
