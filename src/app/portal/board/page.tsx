import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES } from "@/config/constants";
import { PickupCard } from "@/features/pickups/components/PickupCard";
import { MapView } from "@/features/pickups/components/MapView";
import { BoardTabs } from "@/features/pickups/components/BoardTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pickup board — Rajyash Food Rescue" };

export default async function VolunteerBoardPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "volunteer") redirect(ROUTES.portalDashboard);

  const [t, open] = await Promise.all([
    getTranslations("portal"),
    pickupsRepo.listOpen(),
  ]);
  const markers = open.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight">
        {t("pickup.board.title")}
      </h1>

      {open.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-muted-foreground">
          {t("pickup.board.emptyState")}
        </div>
      ) : (
        <BoardTabs
          listSlot={
            <div className="space-y-3">
              {open.map((p) => (
                <PickupCard key={p.id} pickup={p} />
              ))}
            </div>
          }
          mapSlot={<MapView markers={markers} height={460} />}
        />
      )}
    </main>
  );
}
