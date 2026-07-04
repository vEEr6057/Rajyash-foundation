// Shared layout for the legal/policy pages (terms, refund) — mirrors the privacy
// page: --rj-* brand layer, 40rem prose column, sN sections from the `policies`
// namespace, with the foundation contact block under the final section (Razorpay
// website-compliance requires reachable contact details on these pages).
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export async function PolicyPage({
  prefix,
  sections,
}: {
  /** Key prefix in the `policies` namespace: "terms" | "refund". */
  prefix: "terms" | "refund";
  /** Number of sN sections to render. */
  sections: number;
}) {
  const [t, commonT] = await Promise.all([
    getTranslations("policies"),
    getTranslations("common"),
  ]);
  const nums = Array.from({ length: sections }, (_, i) => i + 1);

  return (
    <>
      <PublicHeader />
      <main id="main-content" className="rj-home px-6 pb-24 pt-28 sm:px-10">
        <div className="mx-auto max-w-[40rem]">
          <p
            className="mb-3 text-sm font-medium uppercase tracking-wider"
            style={{ color: "var(--rj-gold-ink)" }}
          >
            {t(`${prefix}Eyebrow`)}
          </p>
          <h1
            className="rj-display text-4xl sm:text-5xl"
            style={{ color: "var(--rj-ink)", lineHeight: 1.06 }}
          >
            {t(`${prefix}Title`)}
          </h1>
          <p className="mt-4 text-sm" style={{ color: "var(--rj-ink-soft)" }}>
            {t(`${prefix}Effective`)}
          </p>
          <p
            className="mt-6 text-[1.0625rem]"
            style={{ color: "var(--rj-ink-soft)", lineHeight: 1.65 }}
          >
            {t(`${prefix}Intro`)}
          </p>

          <div className="mt-10 space-y-9">
            {nums.map((n) => (
              <section key={n}>
                <h2
                  className="rj-display text-2xl"
                  style={{ color: "var(--rj-ink)", lineHeight: 1.15 }}
                >
                  {t(`${prefix}S${n}Title`)}
                </h2>
                <p
                  className="mt-3 text-[1.0625rem]"
                  style={{ color: "var(--rj-ink-soft)", lineHeight: 1.65 }}
                >
                  {t(`${prefix}S${n}Body`)}
                </p>
                {n === sections && (
                  <ul className="mt-4 space-y-1 text-[1.0625rem]">
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
