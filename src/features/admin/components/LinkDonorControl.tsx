"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { setUserPartner } from "../actions/adminActions";

const SELECT =
  "rj-field h-9 rounded-lg border border-input bg-surface px-2 text-sm";

export function LinkDonorControl({
  donors,
  partners,
}: {
  donors: { id: string; name: string; partnerId: string | null }[];
  partners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [donorId, setDonorId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (donors.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("partners.noDonors")}</p>;
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <select
        className={SELECT}
        value={donorId}
        onChange={(e) => setDonorId(e.target.value)}
        aria-label={t("partners.linkDonor.label")}
      >
        <option value="">{t("partners.linkDonor.placeholder")}…</option>
        {donors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
            {d.partnerId ? ` ${t("partners.linkDonor.linked")}` : ""}
          </option>
        ))}
      </select>
      <select
        className={SELECT}
        value={partnerId}
        onChange={(e) => setPartnerId(e.target.value)}
        aria-label={t("partners.linkDonor.partnerLabel")}
      >
        <option value="">{t("partners.linkDonor.unlink")}</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!donorId || pending}
        onClick={() => {
          setErr(null);
          start(async () => {
            const res = await setUserPartner(donorId, partnerId || null);
            if (!res.ok) setErr(res.message);
            else router.refresh();
          });
        }}
      >
        {t("partners.linkDonor.submitButton")}
      </Button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}
