import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getSession, requireRole, AuthError } from "@/server/auth/session";
import { ROUTES } from "@/config/constants";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin — Rajyash Food Rescue" };

const SECTIONS = [
  { href: ROUTES.adminPickups, title: "Pickups", desc: "View & assign pickups" },
  { href: ROUTES.adminUsers, title: "Users", desc: "Manage roles & access" },
  { href: ROUTES.adminPartners, title: "Partners", desc: "Donor organizations" },
  { href: ROUTES.adminReports, title: "Reports", desc: "Impact & CSV export" },
];

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:border-border-strong">
              <CardContent className="pt-5">
                <p className="font-display text-lg font-bold tracking-tight">
                  {s.title}
                </p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
