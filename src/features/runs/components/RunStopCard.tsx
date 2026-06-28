import { MapPin, Package, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { NavigateButton } from "@/features/pickups/components/NavigateButton";
import { StopStatusPill } from "./StopStatusPill";
import { MarkStopDoneButton } from "./MarkStopDoneButton";
import type { RunStop } from "@/server/db/schema";

export async function RunStopCard({ stop, seq }: { stop: RunStop; seq: number }) {
  const t = await getTranslations("portal");

  return (
    <Card className="border-border">
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {seq}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {stop.kind === "pickup" ? (
                <>
                  <Package className="size-3" aria-hidden /> {t("run.stop.kindPickup")}
                </>
              ) : (
                <>
                  <Truck className="size-3" aria-hidden /> {t("run.stop.kindDrop")}
                </>
              )}
            </span>
          </div>
          <StopStatusPill status={stop.status} />
        </div>

        {stop.address && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{stop.address}</span>
          </p>
        )}

        {stop.notes && <p className="text-xs text-muted-foreground">{stop.notes}</p>}

        <div className="flex flex-col gap-2 pt-1">
          {stop.lat !== null && stop.lng !== null && (
            <NavigateButton lat={stop.lat} lng={stop.lng} />
          )}
          <MarkStopDoneButton stopId={stop.id} stopStatus={stop.status} />
        </div>
      </CardContent>
    </Card>
  );
}
