import Link from "next/link";
import { redirect } from "next/navigation";
import { List } from "lucide-react";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES } from "@/config/constants";
import { buttonVariants } from "@/components/ui/button";
import { MapView } from "@/features/pickups/components/MapView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pickup map — Rajyash Food Rescue" };

export default async function VolunteerBoardMapPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "volunteer") redirect(ROUTES.portalDashboard);

  const open = await pickupsRepo.listOpen();
  const markers = open.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Pickup map</h1>
        <Link href={ROUTES.volunteerBoard} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <List className="size-4" /> List
        </Link>
      </header>
      <MapView markers={markers} height={460} />
      <p className="mt-3 text-sm text-muted-foreground">
        {open.length} open pickup{open.length === 1 ? "" : "s"}. Open the list to claim one.
      </p>
    </main>
  );
}
