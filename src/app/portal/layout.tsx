// Portal shell — shared authed header + (mobile) role-aware bottom nav.
// Per-page getSession/redirect guards stay in the pages themselves (AUTH-05);
// the layout reads the session only to choose the bottom-nav items.
import { ROUTES } from "@/config/constants";
import { AuthedHeader } from "@/components/AuthedHeader";
import { getSession } from "@/server/auth/session";
import { PortalBottomNav } from "@/features/portal/components/PortalBottomNav";
import { InstallNudgeBanner } from "@/features/pwa";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  const role = session?.role;
  // dispatch-model-v2: drivers now have two screens (claim board + my run), so
  // they get the bottom nav too.
  const hasBottomNav = role === "donor" || role === "volunteer" || role === "driver";

  return (
    <>
      <AuthedHeader homeHref={ROUTES.portalDashboard} />
      {/* UX-17: signed-in only (gated on `role`, same as the bottom nav below) —
          never rendered on public pages. */}
      {role && <InstallNudgeBanner />}
      {/* pad content above the fixed bottom nav on mobile.
          <main> (not a div) so the skip-link target is also the main landmark,
          matching the admin shell. */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`scroll-mt-20 focus:outline-none${hasBottomNav ? " pb-20 lg:pb-0" : ""}`}
      >
        {children}
      </main>
      {role && <PortalBottomNav role={role} />}
    </>
  );
}
