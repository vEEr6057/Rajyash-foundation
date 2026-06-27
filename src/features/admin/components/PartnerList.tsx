"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { type PartnerType } from "@/config/constants";
import { deletePartner } from "@/features/admin";
import type { Partner } from "@/server/db/schema";
import { PartnerForm } from "./PartnerForm";

function Row({ p }: { p: Partner }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-lg border border-border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{p.name}</span>
          <span className="text-xs text-muted-foreground">
            {tCommon(`partnerType.${p.type as PartnerType}`)} ·{" "}
            {p.contactName || p.contactEmail || p.contactPhone || "—"} ·{" "}
            {p.city}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? t("partners.editClose") : tCommon("buttons.edit")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setDelErr(null);
              start(async () => {
                const res = await deletePartner(p.id);
                if (res.ok) router.refresh();
                else setDelErr(res.message);
              });
            }}
          >
            {tCommon("buttons.delete")}
          </Button>
        </div>
      </div>
      {delErr && <p className="mt-2 text-xs text-destructive">{delErr}</p>}
      {editing && (
        <div className="mt-3 border-t border-border pt-3">
          <PartnerForm
            mode="edit"
            partnerId={p.id}
            defaults={{
              name: p.name,
              type: p.type as PartnerType,
              contactName: p.contactName ?? "",
              contactPhone: p.contactPhone ?? "",
              contactEmail: p.contactEmail ?? "",
              address: p.address ?? "",
              city: p.city,
            }}
            onDone={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

export function PartnerList({ partners }: { partners: Partner[] }) {
  const t = useTranslations("admin");
  if (partners.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("partners.noPartners")}</p>
    );
  }
  return (
    <div className="space-y-2">
      {partners.map((p) => (
        <Row key={p.id} p={p} />
      ))}
    </div>
  );
}
