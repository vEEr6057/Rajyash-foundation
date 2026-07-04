// src/features/public/components/PublicFooter.tsx
// Homepage footer (HOMEPAGE-SPEC §5.9) — legitimacy + contact, on the --rj-* layer.
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/config/constants";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LeafMark } from "./RescueLine";

export async function PublicFooter() {
  const t = await getTranslations("landing");
  const commonT = await getTranslations("common");
  const privacyT = await getTranslations("privacy");

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
