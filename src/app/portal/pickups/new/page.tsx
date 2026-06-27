import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PickupForm } from "@/features/pickups/components/PickupForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New pickup — Rajyash Food Rescue" };

export default async function NewPickupPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (session.role !== "donor") redirect(ROUTES.portalDashboard);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Post surplus food</CardTitle>
          <CardDescription>
            Tell us what&apos;s available and where — a volunteer will pick it up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PickupForm mode="create" />
        </CardContent>
      </Card>
    </main>
  );
}
