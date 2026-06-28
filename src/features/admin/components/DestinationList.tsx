"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteDestination } from "../actions/destinationActions";
import type { Destination } from "@/server/db/schema";
import { DestinationForm } from "./DestinationForm";

function Row({ d }: { d: Destination }) {
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
          <span className="font-medium">{d.name}</span>
          <span className="text-xs text-muted-foreground">
            {d.area ? `${d.area} · ` : ""}
            {d.city} · {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? t("destinations.editClose") : tCommon("buttons.edit")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setDelErr(null);
              start(async () => {
                const res = await deleteDestination(d.id);
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
          <DestinationForm
            mode="edit"
            destinationId={d.id}
            defaults={{
              name: d.name,
              area: d.area ?? "",
              lat: d.lat,
              lng: d.lng,
              city: d.city,
              active: d.active,
            }}
            onDone={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

export function DestinationList({ destinations }: { destinations: Destination[] }) {
  const t = useTranslations("admin");
  if (destinations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("destinations.noDestinations")}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {destinations.map((d) => (
        <Row key={d.id} d={d} />
      ))}
    </div>
  );
}
