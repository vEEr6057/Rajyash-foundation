"use client";

import { useTranslations } from "next-intl";
import { List as ListIcon, Map as MapIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * List / Map toggle for the volunteer board. Both views are passed as
 * pre-rendered slots (the cards are a server component, the map a client one).
 * Radix unmounts the inactive tab, so the Leaflet map mounts with a real size
 * only when its tab is shown.
 */
export function BoardTabs({
  listSlot,
  mapSlot,
}: {
  listSlot: React.ReactNode;
  mapSlot: React.ReactNode;
}) {
  const t = useTranslations("portal");
  // Segmented control (batch-5 §1.2): one height h-9, active = primary solid,
  // inactive = outline — matches the batch-3 AddStopForm Pickup/Drop toggle.
  const trigger =
    "h-9 gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none";
  return (
    <Tabs defaultValue="list">
      <TabsList className="h-9 gap-2 bg-transparent p-0">
        <TabsTrigger value="list" className={trigger}>
          <ListIcon className="size-4" /> {t("pickup.board.listTab")}
        </TabsTrigger>
        <TabsTrigger value="map" className={trigger}>
          <MapIcon className="size-4" /> {t("pickup.board.mapTab")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="list">{listSlot}</TabsContent>
      <TabsContent value="map">{mapSlot}</TabsContent>
    </Tabs>
  );
}
