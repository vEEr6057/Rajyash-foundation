"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { PickupForm } from "@/features/pickups/components/PickupForm";
import { logSurplus } from "@/features/admin/actions/intakeActions";
import { ROUTES } from "@/config/constants";
import type { PickupFormInput } from "@/features/pickups/validations/pickup";
import type { Partner } from "@/server/db/schema";

interface Props {
  partners: Pick<Partner, "id" | "name" | "type" | "address">[];
  // Passed by LogSurplusSheet (its FormSheet `close`) so Cancel dismisses the
  // sheet instead of navigating back — same affordance every form-sheet gets.
  onCancel?: () => void;
}

export function AdminSurplusForm({ partners, onCancel }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [partnerId, setPartnerId] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPartner = partners.find((p) => p.id === partnerId);

  async function handleSurplusSubmit(data: PickupFormInput) {
    if (!partnerId) {
      setServerError(t("surplus.partnerRequired"));
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const r = await logSurplus(partnerId, data);
      if (!r.ok) {
        setServerError(r.message);
        toast.error(r.message);
        return;
      }
      toast.success(t("surplus.submitLabel"));
      router.push(ROUTES.adminPickups);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="partner-select">{t("surplus.partnerLabel")}</Label>
        <select
          id="partner-select"
          className="rj-field h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px]"
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
        >
          <option value="">{t("surplus.partnerPlaceholder")}</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <PickupForm
        mode="create"
        onSubmit={handleSurplusSubmit}
        defaults={
          selectedPartner?.address
            ? { address: selectedPartner.address }
            : undefined
        }
        submitLabel={t("surplus.submitLabel")}
        submitting={isPending}
        onCancel={onCancel}
      />
    </div>
  );
}
