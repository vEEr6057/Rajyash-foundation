// Admin shell — adds the shared authed header (LanguageSwitcher + ThemeToggle)
// above every /admin/* route so the locale is switchable from any admin page
// (I18N-02). Pure chrome: admin access is already enforced by middleware + the
// per-page requireRole(["admin"]) guard (AUTH-05). The layout adds no auth logic
// to avoid duplicating/contradicting that gating.
import { ROUTES } from "@/config/constants";
import { AuthedHeader } from "@/components/AuthedHeader";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AuthedHeader homeHref={ROUTES.adminDashboard} />
      {children}
    </>
  );
}
