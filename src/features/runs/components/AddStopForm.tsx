"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { addPickupStop, addDropStop } from "@/features/runs/actions/runActions";
import type { Partner, Destination } from "@/server/db/schema";

/** Segmented control — active segment is primary solid, inactive is outline
 * (charter: solid green = interactive; batch-3 §3.3). */
function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border-strong bg-surface text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

export function AddStopForm({
  runId,
  nextSeq,
  partners,
  destinations,
}: {
  runId: string;
  nextSeq: number;
  partners: Partner[];
  destinations: Destination[];
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [kind, setKind] = useState<"pickup" | "drop">("pickup");
  const [partnerId, setPartnerId] = useState("");
  const [destMode, setDestMode] = useState<"saved" | "adhoc">("saved");
  const [destinationId, setDestinationId] = useState("");
  const [adhocAddress, setAdhocAddress] = useState("");

  function addPickup() {
    if (!partnerId) {
      setErr(t("runs.form.partnerRequired"));
      return;
    }
    setErr(null);
    start(async () => {
      const res = await addPickupStop({ runId, partnerId, seq: nextSeq });
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setPartnerId("");
      router.refresh();
    });
  }

  function addDrop() {
    if (destMode === "saved" && !destinationId) {
      setErr(t("runs.form.destRequired"));
      return;
    }
    if (destMode === "adhoc" && !adhocAddress) {
      setErr(t("runs.form.addrRequired"));
      return;
    }
    setErr(null);
    start(async () => {
      const res = await addDropStop({
        runId,
        seq: nextSeq,
        destinationId: destMode === "saved" ? destinationId : undefined,
        address: destMode === "adhoc" ? adhocAddress : undefined,
      });
      if (!res.ok) {
        setErr(res.message);
        return;
      }
      setDestinationId("");
      setAdhocAddress("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Toggle active={kind === "pickup"} onClick={() => setKind("pickup")}>
          {t("runs.kindPickup")}
        </Toggle>
        <Toggle active={kind === "drop"} onClick={() => setKind("drop")}>
          {t("runs.kindDrop")}
        </Toggle>
      </div>

      {kind === "pickup" ? (
        <div className="space-y-3">
          <div>
            <Label>{t("runs.form.partner")}</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t("runs.form.selectPartner")} />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {p.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={pending} onClick={addPickup}>
            {t("runs.form.addPickupStop")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Toggle active={destMode === "saved"} onClick={() => setDestMode("saved")}>
              {t("runs.form.savedDest")}
            </Toggle>
            <Toggle active={destMode === "adhoc"} onClick={() => setDestMode("adhoc")}>
              {t("runs.form.adHoc")}
            </Toggle>
          </div>

          {destMode === "saved" ? (
            <div>
              <Label>{t("runs.form.destination")}</Label>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("runs.form.selectDest")} />
                </SelectTrigger>
                <SelectContent>
                  {destinations
                    .filter((d) => d.active)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                        {d.area ? ` · ${d.area}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>{t("runs.form.adHocAddress")}</Label>
              <Input
                value={adhocAddress}
                onChange={(e) => setAdhocAddress(e.target.value)}
                placeholder={t("runs.form.adHocPlaceholder")}
                className="mt-1"
              />
            </div>
          )}

          <Button size="sm" disabled={pending} onClick={addDrop}>
            {pending ? t("runs.form.geocoding") : t("runs.form.addDropStop")}
          </Button>
        </div>
      )}
      {err && (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
