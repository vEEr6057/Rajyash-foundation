// Portal shell — adds the shared authed header (LanguageSwitcher + ThemeToggle)
// above every /portal/* route so the locale is switchable from any portal page
// (I18N-02). Pure chrome: per-page getSession/redirect guards stay in the pages
// themselves (defence-in-depth, AUTH-05) — the layout adds no auth logic.
import { ROUTES } from "@/config/constants";
import { AuthedHeader } from "@/components/AuthedHeader";

export default function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AuthedHeader homeHref={ROUTES.portalDashboard} />
      {children}
    </>
  );
}
