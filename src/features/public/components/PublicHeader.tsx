// src/features/public/components/PublicHeader.tsx
// Homepage masthead (HOMEPAGE-SPEC §5.1). Server component (reads session);
// the transparent-over-hero → paper-on-scroll behaviour lives in HeaderScroll (client).
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { env } from "@/config/env";
import { ROUTES } from "@/config/constants";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { PublicMobileMenu } from "./PublicMobileMenu";
import { HeaderScroll } from "./HeaderScroll";

// Anchor targets must exist on the homepage: #programs, #impact (LandingPage
// sections) and #contact (PublicFooter). Labels are landing.nav.* keys.
const NAV: [href: string, labelKey: "nav.whatWeDo" | "nav.impact" | "nav.volunteer" | "nav.contact"][] = [
  ["#programs", "nav.whatWeDo"],
  ["#impact", "nav.impact"],
  [ROUTES.becomeVolunteer, "nav.volunteer"],
  ["#contact", "nav.contact"],
];

export async function PublicHeader() {
  const [t, tNav, donateT, session] = await Promise.all([
    getTranslations("landing"),
    getTranslations("common"),
    getTranslations("donate"),
    getSession(),
  ]);
  // PAY-03: donate CTA appears only when payments are enabled (dark by default).
  const paymentsOn = env.NEXT_PUBLIC_PAYMENTS_ENABLED;
  const dashboardHref = session
    ? session.role === "admin"
      ? ROUTES.adminDashboard
      : ROUTES.portalDashboard
    : null;

  return (
    <HeaderScroll>
      {/* No skip link here — the root layout's <SkipLink /> is already the page's
          first focusable element and targets the same #main-content. Two identical
          skip links in the tab order is an a11y anti-pattern. */}
      <div className="mx-auto flex h-[72px] max-w-[78rem] items-center justify-between gap-4 px-6 sm:px-10">
        <Link href={ROUTES.home} aria-label={t("brandName")} className="flex items-center">
          <img src="/images/rajyash/logo.png" alt={t("brandName")} width={160} height={42} className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label={t("navAria")}>
          {NAV.map(([href, labelKey]) => (
            <Link
              key={labelKey}
              href={href}
              className="rj-underline text-sm font-medium"
              style={{ color: "var(--rj-ink)" }}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {paymentsOn && (
            <Link
              href={ROUTES.donate}
              className="rj-underline text-sm font-medium"
              style={{ color: "var(--rj-gold-ink)" }}
            >
              {donateT("navLabel")}
            </Link>
          )}
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
