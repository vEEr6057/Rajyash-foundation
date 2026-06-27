import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getSession } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard — Rajyash Food Rescue" };

export default async function PortalDashboardPage() {
  // Defence in depth — never rely on middleware alone (AUTH-05).
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (!session.onboardingComplete) redirect(ROUTES.onboarding);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <UserButton />
      </header>
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re in 🎉</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Signed in as a{" "}
            <span className="font-semibold text-foreground">{session.role}</span>.
            The rescue features land in Phase 2.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
