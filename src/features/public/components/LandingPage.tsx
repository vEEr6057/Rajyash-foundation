// src/features/public/components/LandingPage.tsx
// SERVER COMPONENT — public, unauthenticated; generous motion budget.
// All text from "landing" namespace (flat keys from en/landing.json).
// SECURITY (T-7-02-01): getCachedImpactReport returns aggregate only — no PII.
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";
import { getTranslations } from "next-intl/server";
import { getCachedImpactReport } from "@/server/db/repositories/impact";
import { ImpactCounter } from "./ImpactCounter";
import { HowItWorks } from "./HowItWorks";

export async function LandingPage() {
  const [t, impact] = await Promise.all([
    getTranslations("landing"),
    getCachedImpactReport(),
  ]);

  return (
    <main id="main-content">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative mx-auto flex min-h-[85dvh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
        {/* Live badge */}
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm">
          <span className="inline-block size-2 animate-pulse rounded-full bg-green-500" />
          {t("heroLive")}
        </span>

        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
          {t("heroTitle")}
        </h1>

        <p className="mt-4 max-w-md text-muted-foreground sm:text-lg">
          {t("heroSub")}
        </p>

        {/* Dual CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={ROUTES.becomeVolunteer}
            className={buttonVariants({ size: "lg" })}
          >
            {t("becomeVol")}
          </Link>
          <Link
            href={ROUTES.signUp}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t("donateFood")}
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-5 text-xs text-muted-foreground">{t("heroTrust")}</p>
      </section>

      {/* ── IMPACT COUNTER (client — receives server-fetched aggregate) ── */}
      {/* SECURITY (T-7-02-01): only { servings, kg, count } totals passed */}
      <ImpactCounter
        servings={impact.servings}
        kg={impact.kg}
        count={impact.count}
      />

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── TWO WAYS TO HELP ─────────────────────────────────────── */}
      <WaysToHelpSection />

      {/* ── ABOUT ────────────────────────────────────────────────── */}
      <AboutSection />

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <FinalCtaSection />
    </main>
  );
}

// ── Sub-sections ─────────────────────────────────────────────────────────────
// Kept inline because they are small and share the same namespace.
// Each is async to call getTranslations independently (parallel in the tree).

async function WaysToHelpSection() {
  const t = await getTranslations("landing");
  return (
    <section className="bg-surface py-20 px-6">
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">
          {t("helpEyebrow")}
        </p>
        <h2 className="font-display mb-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
          {t("helpTitle")}
        </h2>
        <p className="mb-12 text-center text-sm text-muted-foreground">
          {t("helpSub")}
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Donor card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
              {t("donorTag")}
            </span>
            <h3 className="font-display text-xl font-bold text-foreground">
              {t("donorTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("donorDesc")}</p>
            <ul className="mt-auto space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t("donorP1")}
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t("donorP2")}
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t("donorP3")}
              </li>
            </ul>
            <Link
              href={ROUTES.signUp}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("donateFood")}
            </Link>
          </div>

          {/* Volunteer card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-primary bg-primary/5 p-6">
            <span className="inline-block rounded-full border border-primary/40 bg-primary/20 px-3 py-0.5 text-xs font-semibold text-primary">
              {t("volTag")}
            </span>
            <h3 className="font-display text-xl font-bold text-foreground">
              {t("volTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("volDesc")}</p>
            <ul className="mt-auto space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t("volP1")}
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t("volP2")}
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                {t("volP3")}
              </li>
            </ul>
            <Link
              href={ROUTES.becomeVolunteer}
              className={buttonVariants({ size: "sm" })}
            >
              {t("becomeVol")}
            </Link>
          </div>

          {/* Funds — coming soon (Phase 5 PARKED) */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 opacity-80">
            <span className="inline-block rounded-full border border-border bg-surface px-3 py-0.5 text-xs font-semibold text-muted-foreground">
              {t("fundsBadge")}
            </span>
            <h3 className="font-display text-xl font-bold text-foreground">
              {t("fundsTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("fundsDesc")}</p>
            {/* Non-functional coming-soon — links to contact email as a no-op */}
            <a
              href={`mailto:rajyashfoundation@rajyashgroup.com?subject=Notify+me+about+donations`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("fundsCta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

async function AboutSection() {
  const t = await getTranslations("landing");
  return (
    <section id="about" className="py-20 px-6">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">
          {t("aboutEyebrow")}
        </p>
        <h2 className="font-display mb-6 text-center text-2xl font-bold text-foreground sm:text-3xl">
          {t("aboutTitle")}
        </h2>

        <p className="mx-auto mb-8 max-w-xl text-center text-muted-foreground leading-relaxed">
          {t("aboutBody")}
        </p>

        {/* Quote */}
        <blockquote className="mb-10 rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="font-display text-lg font-semibold text-foreground italic">
            &ldquo;{t("quote")}&rdquo;
          </p>
          <footer className="mt-2 text-sm text-muted-foreground">
            — {t("quoteAttr")}
          </footer>
        </blockquote>

        {/* 3 stats */}
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="font-display text-3xl font-extrabold text-primary">
              {t("aboutStat1")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("aboutStat1L")}
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold text-primary">
              {t("aboutStat2")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("aboutStat2L")}
            </p>
          </div>
          <div>
            <p className="font-display text-2xl font-extrabold text-primary">
              {t("aboutStat3")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("aboutStat3L")}
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("aboutTrust")}
        </p>
      </div>
    </section>
  );
}

async function FinalCtaSection() {
  const t = await getTranslations("landing");
  return (
    <section className="bg-primary py-20 px-6 text-center text-white">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          {t("finalEyebrow")}
        </p>
        <h2 className="font-display text-3xl font-bold">{t("finalTitle")}</h2>
        <p className="text-white/80">{t("finalSub")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={ROUTES.becomeVolunteer}
            className={buttonVariants({
              variant: "outline",
              size: "lg",
            })}
            style={{ color: "inherit", borderColor: "white" }}
          >
            {t("becomeVol")}
          </Link>
          <Link
            href={ROUTES.signUp}
            className={buttonVariants({ size: "lg" })}
            style={{
              backgroundColor: "white",
              color: "var(--color-primary, #C04E12)",
            }}
          >
            {t("donateFood")}
          </Link>
        </div>
      </div>
    </section>
  );
}
