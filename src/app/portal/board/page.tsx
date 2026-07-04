import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES } from "@/config/constants";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { PickupCard } from "@/features/pickups/components/PickupCard";
import { MapView } from "@/features/pickups/components/MapView";
import { BoardTabs } from "@/features/pickups/components/BoardTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pickup board — Rajyash Food Porter" };

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
      <PageHeader
        eyebrow={t("pickup.board.eyebrow")}
        title={t("pickup.board.title")}
        meta={t("pickup.board.waiting", { count: open.length })}
      />

      {open.length === 0 ? (
        <EmptyState
          title={t("pickup.board.emptyTitle")}
          body={t("pickup.board.emptyBody")}
        />
      ) : (
        <BoardTabs
          listSlot={
            <div className="grid gap-3 md:grid-cols-2">
              {open.map((p) => (
                <PickupCard key={p.id} pickup={p} />
              ))}
            </div>
          }
          mapSlot={<MapView markers={markers} height="min(70dvh, 640px)" />}
        />
      )}
    </main>
  );
}
