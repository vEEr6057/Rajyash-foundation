// src/app/(public)/donate/page.tsx
// Public donation page (PAY-03). Runs on the homepage --rj-* brand layer, mirroring
// privacy/page.tsx. DARK BY DEFAULT: when PAYMENTS_ENABLED is off this route redirects
// home (a clean 302), so no donate entry point exists until the owner lights it up.
// (opennext serves notFound() with a 200, so we prefer an explicit redirect over a
// soft-404.) Public route (added to isPublicRoute in middleware) — no auth check.
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { env } from "@/config/env";
import { PublicHeader } from "@/features/public";
import { PublicFooter } from "@/features/public";
import { DonateForm } from "@/features/donations";

export const metadata = {
  title: "Donate",
  alternates: { canonical: "/donate" },
};

export default async function DonatePage() {
  // Master switch: the entire page is inert while payments are disabled → send home.
  if (!env.PAYMENTS_ENABLED) redirect("/");

  const t = await getTranslations("donate");

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
          <p
            className="mt-6 text-[1.0625rem]"
            style={{ color: "var(--rj-ink-soft)", lineHeight: 1.65 }}
          >
            {t("intro")}
          </p>

          <DonateForm />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
