// src/features/public/components/PublicFooter.tsx
// Homepage footer (HOMEPAGE-SPEC §5.9) — legitimacy + contact, on the --rj-* layer.
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { env } from "@/config/env";
import { ROUTES, SOCIAL_LINKS } from "@/config/constants";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LeafMark } from "./RescueLine";

// Brand social glyphs. lucide-react (v1) no longer ships Facebook/Instagram (brand
// logos were removed upstream), so these are minimal inline SVGs — CSP-safe, no dep.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.48h-1.26c-1.24 0-1.63.78-1.63 1.57v1.87h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export async function PublicFooter() {
  const t = await getTranslations("landing");
  const commonT = await getTranslations("common");
  const privacyT = await getTranslations("privacy");
  const donateT = await getTranslations("donate");
  // PAY-03: donate link appears only when payments are enabled (dark by default).
  const paymentsOn = env.NEXT_PUBLIC_PAYMENTS_ENABLED;

  const link = "rj-underline text-sm";
  const linkStyle = { color: "var(--rj-ink-soft)" } as const;

  return (
    <footer
      id="contact"
      className="rj-home scroll-mt-24 px-6 py-14"
      style={{ background: "var(--rj-paper-2)", borderTop: "1px solid var(--rj-hairline)" }}
    >
      <div className="mx-auto max-w-[78rem]">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <img src="/images/rajyash/logo.png" alt={t("brandName")} width={160} height={42} className="h-10 w-auto" />
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--rj-ink-soft)" }}>
              <LeafMark className="size-4" /> {t("footTagline")}
            </p>
          </div>

          {/* Explore */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--rj-ink)" }}>
              {t("footExplore")}
            </p>
            <ul className="space-y-2">
              <li><Link href="#programs" className={link} style={linkStyle}>{t("nav.whatWeDo")}</Link></li>
              <li><Link href="#impact" className={link} style={linkStyle}>{t("nav.impact")}</Link></li>
              <li><Link href={ROUTES.becomeVolunteer} className={link} style={linkStyle}>{t("becomeVol")}</Link></li>
              {paymentsOn && (
                <li><Link href={ROUTES.donate} className={link} style={linkStyle}>{donateT("navLabel")}</Link></li>
              )}
              <li><Link href={ROUTES.signIn} className={link} style={linkStyle}>{t("signin")}</Link></li>
              <li><Link href={ROUTES.staffSignIn} className={link} style={linkStyle}>{t("staffSignin")}</Link></li>
              <li><Link href={ROUTES.privacy} className={link} style={linkStyle}>{privacyT("footLink")}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--rj-ink)" }}>
              {t("footContact")}
            </p>
            <ul className="space-y-2 text-sm" style={{ color: "var(--rj-ink-soft)" }}>
              <li><a href={`mailto:${commonT("footer.email")}`} className={link} style={linkStyle}>{commonT("footer.email")}</a></li>
              <li><a href={`tel:${commonT("footer.phone")}`} className={link} style={linkStyle}>{commonT("footer.phone")}</a></li>
              <li>{t("footAddr")}</li>
            </ul>
            <div className="mt-4 flex items-center gap-3">
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="rj-social inline-flex"
              >
                <FacebookIcon className="size-5" />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rj-social inline-flex"
              >
                <InstagramIcon className="size-5" />
              </a>
            </div>
          </div>

          {/* Registration / legitimacy */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--rj-ink)" }}>
              {t("brandName")}
            </p>
            <p className="text-sm" style={{ color: "var(--rj-ink-soft)" }}>
              {t("footAbout")}
            </p>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderTop: "1px solid var(--rj-hairline)" }}
        >
          <p className="text-xs" style={{ color: "var(--rj-ink-soft)" }}>{t("footRights")}</p>
          <div className="flex items-center gap-4">
            <p className="text-xs" style={{ color: "var(--rj-ink-soft)" }}>{t("footMade")}</p>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
