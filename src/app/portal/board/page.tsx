import Link from "next/link";
import { redirect } from "next/navigation";
import { Map as MapIcon } from "lucide-react";
import { getSession } from "@/server/auth/session";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES } from "@/config/constants";
import { buttonVariants } from "@/components/ui/button";
import { PickupCard } from "@/features/pickups/components/PickupCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pickup board — Rajyash Food Rescue" };

export default async function VolunteerBoardPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "volunteer") redirect(ROUTES.portalDashboard);

  const open = await pickupsRepo.listOpen();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Available pickups</h1>
        <Link href={ROUTES.volunteerBoardMap} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <MapIcon className="size-4" /> Map
        </Link>
      </header>

      {open.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong p-8 text-center text-muted-foreground">
          No open pickups right now. Check back soon.
        </div>
      ) : (
        <div className="space-y-3">
          {open.map((p) => (
            <PickupCard key={p.id} pickup={p} />
          ))}
        </div>
      )}
    </main>
  );
}
