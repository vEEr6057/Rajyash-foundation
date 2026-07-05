"use client";

import { useTranslations } from "next-intl";
import { LeafMark } from "@/components/LeafMark";

/**
 * dispatch-model-v2: volunteers never claim — this quiet note replaces the
 * claim button wherever a volunteer views an open (requested) pickup, on the
 * board and on the pickup detail page (frontend-practices §3: shared once,
 * used in both places instead of forking the copy).
 */
export function VolunteerClaimNote() {
  const t = useTranslations("portal");
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
      <LeafMark className="mt-0.5 size-4 shrink-0 opacity-70" />
      <p>{t("pickup.board.volunteerNote")}</p>
    </div>
  );
}
