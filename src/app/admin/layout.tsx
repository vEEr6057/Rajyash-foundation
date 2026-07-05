// Admin shell — desktop sidebar rail + a slim top bar (mobile menu, locale, theme,
// account). Pure chrome: admin access is enforced by middleware + per-page
// requireRole(["admin"]) (AUTH-05); the layout adds no auth logic.
import { UserButton } from "@clerk/nextjs";
import { LanguageSwitcher } from "@/features/public/components/LanguageSwitcher";
import { ThemeToggle } from "@/features/public/components/ThemeToggle";
import { NotificationBell } from "@/features/notifications";
import { AdminSidebar, AdminMobileNav } from "@/features/admin/components/AdminNav";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <AdminMobileNav />
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
            <UserButton />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-6 scroll-mt-20 focus:outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
