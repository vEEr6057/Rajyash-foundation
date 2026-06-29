// src/features/public/components/PublicHeader.tsx
// Server component — public landing header with nav, LanguageSwitcher, CTAs.
// The global sticky header in root layout.tsx is REMOVED so this is the only
// header on the landing page (header reconciliation — 07-02 objective).
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { PublicMobileMenu } from "./PublicMobileMenu";

export async function PublicHeader() {
  const t = await getTranslations("landing");
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-1.5 focus:text-sm"
      >
        {t("skip")}
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Brand */}
        <Link
          href={ROUTES.home}
          className="flex flex-col leading-tight"
          aria-label={t("brandName")}
        >
          <span className="font-display text-lg font-bold text-primary">
            {t("brandName")}
          </span>
          <span className="text-xs text-muted-foreground">{t("brandSub")}</span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-5 md:flex"
          aria-label="Site navigation"
        >
          <Link
            href="#how"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.how")}
          </Link>
          <Link
            href="#impact"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.impact")}
          </Link>
          <Link
            href="#about"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.about")}
          </Link>
          <Link
            href="#contact"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("nav.contact")}
          </Link>
        </nav>

        {/* Right side: desktop cluster (hidden on mobile to prevent overflow) */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
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
        </div>

        {/* Mobile: collapse everything into a Sheet menu */}
        <PublicMobileMenu />
      </div>
    </header>
  );
}
