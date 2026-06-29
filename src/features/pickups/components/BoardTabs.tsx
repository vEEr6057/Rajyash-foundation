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
  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">
          <ListIcon className="size-4" /> {t("pickup.board.listTab")}
        </TabsTrigger>
        <TabsTrigger value="map">
          <MapIcon className="size-4" /> {t("pickup.board.mapTab")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="list">{listSlot}</TabsContent>
      <TabsContent value="map">{mapSlot}</TabsContent>
    </Tabs>
  );
}
