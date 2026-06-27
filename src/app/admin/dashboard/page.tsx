import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Admin — Rajyash Food Rescue" };

export default async function AdminDashboardPage() {
  // Defence in depth — admin-only, re-checked server-side (AUTH-05). Middleware
  // already 403s non-admins; this guards direct/RSC access too.
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  try {
    await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthError) redirect(ROUTES.portalDashboard);
    throw e;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Admin
        </h1>
        <UserButton />
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Foundation admin</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Pickups, users, partners and reporting arrive in Phase 6.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
