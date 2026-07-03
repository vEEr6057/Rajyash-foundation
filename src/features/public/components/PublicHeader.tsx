// src/features/public/components/PublicHeader.tsx
// Server component — public landing header with nav, LanguageSwitcher, CTAs.
// The global sticky header in root layout.tsx is REMOVED so this is the only
// header on the landing page (header reconciliation — 07-02 objective).
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { PublicMobileMenu } from "./PublicMobileMenu";

export async function PublicHeader() {
  const [t, tNav, session] = await Promise.all([
    getTranslations("landing"),
    getTranslations("common"),
    getSession(),
  ]);
  // Auth-aware: a signed-in visitor sees Dashboard + account menu, not Sign in / Join.
  const dashboardHref = session
    ? session.role === "admin"
      ? ROUTES.adminDashboard
      : ROUTES.portalDashboard
    : null;
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1.5 focus:text-sm"
      >
        {t("skip")}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Brand — official Rajyash Foundation logo */}
        <Link href={ROUTES.home} aria-label={t("brandName")} className="flex items-center">
          <img
            src="/images/rajyash/logo.png"
            alt="Rajyash Foundation"
            width={168}
            height={44}
            className="h-11 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Site navigation"
        >
          {[
            ["#about", "About us"],
            ["#programs", "What we do"],
            ["/sign-up?role=volunteer", "Volunteer"],
            ["#contact", "Contact"],
          ].map(([href, label]) => (
            <Link
              key={label}
              href={href}
              className="text-sm font-medium text-[#3a4a3f] transition-colors hover:text-[#337048]"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side: desktop cluster (hidden on mobile to prevent overflow) */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {dashboardHref ? (
            <>
              <Link
                href={dashboardHref}
                className={buttonVariants({ size: "sm" })}
              >
                {tNav("nav.dashboard")}
              </Link>
              <UserButton
                appearance={{ elements: { avatarBox: "size-8" } }}
                userProfileMode="modal"
              />
            </>
          ) : (
            <>
              <Link
                href={ROUTES.signIn}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t("signin")}
              </Link>
              <Link
                href={ROUTES.becomeVolunteer}
                className={buttonVariants({ size: "sm" })}
              >
                {t("becomeVol")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: collapse everything into a Sheet menu */}
        <PublicMobileMenu dashboardHref={dashboardHref} />
      </div>
    </header>
  );
}
