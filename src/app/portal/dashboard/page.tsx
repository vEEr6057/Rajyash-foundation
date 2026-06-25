import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Plus, HeartHandshake, Map as MapIcon } from "lucide-react";
import { getSession } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Rajyash Food Rescue" };

export default async function PortalDashboardPage() {
  // Defence in depth — never rely on middleware alone (AUTH-05).
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (!session.onboardingComplete) redirect(ROUTES.onboarding);

  const isDonor = session.role === "donor";
  const isVolunteer = session.role === "volunteer";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Dashboard</h1>
        <UserButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            {isDonor ? "Got surplus food?" : isVolunteer ? "Ready to rescue?" : "Welcome"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDonor && (
            <div className="flex flex-wrap gap-3">
              <Link href={ROUTES.newPickup} className={buttonVariants({ size: "lg" })}>
                <Plus className="size-4" /> Post a pickup
              </Link>
              <Link href={ROUTES.donorPickups} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <HeartHandshake className="size-4" /> My pickups
              </Link>
            </div>
          )}
          {isVolunteer && (
            <div className="flex flex-wrap gap-3">
              <Link href={ROUTES.volunteerBoard} className={buttonVariants({ size: "lg" })}>
                Browse pickups
              </Link>
              <Link href={ROUTES.volunteerBoardMap} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <MapIcon className="size-4" /> Map view
              </Link>
            </div>
          )}
          {session.role === "admin" && (
            <Link href={ROUTES.adminDashboard} className={buttonVariants({ size: "lg" })}>
              Admin dashboard
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
