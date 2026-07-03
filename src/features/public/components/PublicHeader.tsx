// src/features/public/components/PublicHeader.tsx
// Homepage masthead (HOMEPAGE-SPEC §5.1). Server component (reads session);
// the transparent-over-hero → paper-on-scroll behaviour lives in HeaderScroll (client).
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ROUTES } from "@/config/constants";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { PublicMobileMenu } from "./PublicMobileMenu";
import { HeaderScroll } from "./HeaderScroll";

const NAV: [string, string][] = [
  ["#programs", "What we do"],
  ["#impact", "Impact"],
  ["/sign-up?role=volunteer", "Volunteer"],
  ["#contact", "Contact"],
];

export async function PublicHeader() {
  const [t, tNav, session] = await Promise.all([
    getTranslations("landing"),
    getTranslations("common"),
    getSession(),
  ]);
  const dashboardHref = session
    ? session.role === "admin"
      ? ROUTES.adminDashboard
      : ROUTES.portalDashboard
    : null;

  return (
    <HeaderScroll>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-[var(--rj-paper)] focus:px-3 focus:py-1.5 focus:text-sm"
      >
        {t("skip")}
      </a>
      <div className="mx-auto flex h-[72px] max-w-[78rem] items-center justify-between gap-4 px-6 sm:px-10">
        <Link href={ROUTES.home} aria-label={t("brandName")} className="flex items-center">
          <img src="/images/rajyash/logo.png" alt="Rajyash Foundation" width={160} height={42} className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Site navigation">
          {NAV.map(([href, label]) => (
            <Link
              key={label}
              href={href}
              className="rj-underline text-sm font-medium"
              style={{ color: "var(--rj-ink)" }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {dashboardHref ? (
            <>
              <Link
                href={dashboardHref}
                className="px-4 py-2 text-sm font-medium"
                style={{ background: "var(--rj-green-cta)", color: "#fff", borderRadius: "6px" }}
              >
                {tNav("nav.dashboard")}
              </Link>
              <UserButton appearance={{ elements: { avatarBox: "size-8" } }} userProfileMode="modal" />
            </>
          ) : (
            <>
              <Link href={ROUTES.signIn} className="rj-underline text-sm font-medium" style={{ color: "var(--rj-ink)" }}>
                {t("signin")}
              </Link>
              <Link
                href={ROUTES.becomeVolunteer}
                className="px-4 py-2 text-sm font-medium"
                style={{ background: "var(--rj-green-cta)", color: "#fff", borderRadius: "6px" }}
              >
                {t("becomeVol")}
              </Link>
            </>
          )}
        </div>

        <PublicMobileMenu dashboardHref={dashboardHref} />
      </div>
    </HeaderScroll>
  );
}
