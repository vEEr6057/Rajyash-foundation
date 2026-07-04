"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  PackageOpen,
  Route,
  MapPin,
  Building2,
  Users,
  BarChart3,
  Menu,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";
import { LeafMark } from "@/components/LeafMark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const ICONS = {
  overview: LayoutDashboard,
  pickups: PackageOpen,
  runs: Route,
  destinations: MapPin,
  partners: Building2,
  users: Users,
  reports: BarChart3,
} as const;

/** Single source of truth for admin nav order + routing. Labels resolved via i18n.
 * 'Log surplus' is intentionally NOT a nav item — it's an action (sheet on the
 * Pickups page + quick-action on the overview), not a section. */
const NAV: { key: keyof typeof ICONS; href: string; labelKey: string }[] = [
  { key: "overview", href: ROUTES.adminDashboard, labelKey: "dashboard.overviewLink" },
  { key: "pickups", href: ROUTES.adminPickups, labelKey: "dashboard.pickupsLink" },
  { key: "runs", href: ROUTES.adminRuns, labelKey: "dashboard.runsLink" },
  { key: "destinations", href: ROUTES.adminDestinations, labelKey: "dashboard.destinationsLink" },
  { key: "partners", href: ROUTES.adminPartners, labelKey: "dashboard.partnersLink" },
  { key: "users", href: ROUTES.adminUsers, labelKey: "dashboard.usersLink" },
  { key: "reports", href: ROUTES.adminReports, labelKey: "dashboard.reportsLink" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  // Strip the leading /<locale> segment so matching works under next-intl routing.
  const path = pathname.replace(/^\/(en|gu|hi)(?=\/|$)/, "") || "/";

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ key, href, labelKey }) => {
        const Icon = ICONS[key];
        const active =
          href === ROUTES.adminDashboard ? path === href : path.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop sidebar rail — fixed column, hidden on mobile. */
export function AdminSidebar() {
  const t = useTranslations("admin");
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
      <div className="sticky top-0 flex h-screen flex-col gap-4 p-4">
        <Link
          href={ROUTES.adminDashboard}
          className="flex items-center gap-2 px-2 text-foreground"
        >
          <LeafMark className="size-4 text-gold-ink" />
          <span className="font-display text-sm font-semibold">
            {t("dashboard.title")}
          </span>
        </Link>
        <NavLinks />
      </div>
    </aside>
  );
}

/** Mobile drawer trigger + sheet — shown only below lg. */
export function AdminMobileNav() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={tCommon("aria.menu")}>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetTitle className="flex items-center gap-2 text-foreground">
          <LeafMark className="size-4 text-gold-ink" />
          <span className="font-display text-sm font-semibold">
            {t("dashboard.title")}
          </span>
        </SheetTitle>
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
