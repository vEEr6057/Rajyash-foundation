// Portal shell — shared authed header + (mobile) role-aware bottom nav.
// Per-page getSession/redirect guards stay in the pages themselves (AUTH-05);
// the layout reads the session only to choose the bottom-nav items.
import { ROUTES } from "@/config/constants";
import { AuthedHeader } from "@/components/AuthedHeader";
import { getSession } from "@/server/auth/session";
import { PortalBottomNav } from "@/features/portal/components/PortalBottomNav";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const role = session?.role;
  const hasBottomNav = role === "donor" || role === "volunteer";

  return (
    <>
      <AuthedHeader homeHref={ROUTES.portalDashboard} />
      {/* pad content above the fixed bottom nav on mobile */}
      <div className={hasBottomNav ? "pb-20 lg:pb-0" : undefined}>{children}</div>
      {role && <PortalBottomNav role={role} />}
    </>
  );
}
