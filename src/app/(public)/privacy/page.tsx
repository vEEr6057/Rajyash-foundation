// src/app/(public)/privacy/page.tsx
// Public privacy policy (FINISH-STANDARDS §1). Runs on the homepage --rj-* brand
// layer; prose is constrained to --rj-text (40rem). Content is accurate to THIS
// app's real data practices — no boilerplate claims. This page is PUBLIC (added to
// isPublicRoute in middleware.ts); no auth check here.
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/features/public";
import { PublicFooter } from "@/features/public";

export const metadata = {
  title: "Privacy",
  alternates: { canonical: "/privacy" },
};

// The eight sections, in order. Each maps to `s{n}Title` / `s{n}Body` keys in the
// `privacy` namespace so copy stays fully localized (EN/GU/HI).
const SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export default async function PrivacyPage() {
  const [t, commonT] = await Promise.all([
    getTranslations("privacy"),
    getTranslations("common"),
  ]);

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="rj-home px-6 pb-24 pt-28 sm:px-10">
        <div className="mx-auto max-w-[40rem]">
          <p
            className="mb-3 text-sm font-medium uppercase tracking-wider"
            style={{ color: "var(--rj-gold-ink)" }}
          >
            {t("eyebrow")}
          </p>
          <h1
            className="rj-display text-4xl sm:text-5xl"
            style={{ color: "var(--rj-ink)", lineHeight: 1.06 }}
          >
            {t("title")}
          </h1>
          <p className="mt-4 text-sm" style={{ color: "var(--rj-ink-soft)" }}>
            {t("effective")}
          </p>
          <p
            className="mt-6 text-[1.0625rem]"
            style={{ color: "var(--rj-ink-soft)", lineHeight: 1.65 }}
          >
            {t("intro")}
          </p>

          <div className="mt-10 space-y-9">
            {SECTIONS.map((n) => (
              <section key={n}>
                <h2
                  className="rj-display text-2xl"
                  style={{ color: "var(--rj-ink)", lineHeight: 1.15 }}
                >
                  {t(`s${n}Title`)}
                </h2>
                <p
                  className="mt-3 text-[1.0625rem]"
                  style={{ color: "var(--rj-ink)", lineHeight: 1.65 }}
                >
                  {t(`s${n}Body`)}
                </p>
                {/* Section 8 (contact) renders the foundation's details from the
                    single-source common.footer.* catalog, not a duplicated string. */}
                {n === 8 && (
                  <ul
                    className="mt-4 space-y-1 text-[1.0625rem]"
                    style={{ color: "var(--rj-ink)" }}
                  >
                    <li>
                      <a
                        href={`mailto:${commonT("footer.email")}`}
                        className="rj-underline"
                        style={{ color: "var(--rj-green)" }}
                      >
                        {commonT("footer.email")}
                      </a>
                    </li>
                    <li>
                      <a
                        href={`tel:${commonT("footer.phone")}`}
                        className="rj-underline"
                        style={{ color: "var(--rj-green)" }}
                      >
                        {commonT("footer.phone")}
                      </a>
                    </li>
                    <li style={{ color: "var(--rj-ink-soft)" }}>
                      {commonT("footer.address")}
                    </li>
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
