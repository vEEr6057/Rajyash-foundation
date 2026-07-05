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
import { VolunteerClaimNote } from "@/features/pickups/components/VolunteerClaimNote";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pickup board — Rajyash Food Porter" };

// dispatch-model-v2: the board is the driver's claim surface; volunteers keep
// read-only access for awareness (browse + map + live tracking), no claim.
export default async function PickupBoardPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "volunteer" && session.role !== "driver") {
    redirect(ROUTES.portalDashboard);
  }
  const isVolunteer = session.role === "volunteer";

  const [t, tCommon, open] = await Promise.all([
    getTranslations("portal"),
    getTranslations("common"),
    pickupsRepo.listOpen(),
  ]);
  const markers = open.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        eyebrow={tCommon(isVolunteer ? "role.volunteer" : "role.driver")}
        title={t("pickup.board.title")}
        meta={t("pickup.board.waiting", { count: open.length })}
      />

      {isVolunteer && (
        <div className="mb-4">
          <VolunteerClaimNote />
        </div>
      )}

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
                <PickupCard key={p.id} pickup={p} role={session.role} />
              ))}
            </div>
          }
          mapSlot={<MapView markers={markers} height="min(70dvh, 640px)" />}
        />
      )}
    </main>
  );
}
