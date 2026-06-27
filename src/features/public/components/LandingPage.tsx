// src/features/public/components/LandingPage.tsx
// SERVER COMPONENT — public, unauthenticated; generous motion budget.
// All text from "landing" namespace (flat keys from en/landing.json).
// SECURITY (T-7-02-01): getCachedImpactReport returns aggregate only — no PII.
import Link from "next/link";
import { HandHeart, MapPin, Sprout } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";
import { getTranslations } from "next-intl/server";
import { getCachedImpactReport } from "@/server/db/repositories/impact";
import { ImpactCounter } from "./ImpactCounter";
import { HowItWorks } from "./HowItWorks";
import { RevealOnScroll } from "./RevealOnScroll";

export async function LandingPage() {
  const [t, impact] = await Promise.all([
    getTranslations("landing"),
    getCachedImpactReport(),
  ]);

  return (
    <main id="main-content">
      {/* ── HERO (premium: two-column, contained gradient depth) ─────── */}
      <section className="relative overflow-hidden px-6 py-16 sm:py-24">
        {/* Decorative brand gradient blobs — contained, transform/opacity only */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -right-24 -top-32 size-[28rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--saffron) 38%, transparent), transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-40 -left-32 size-[30rem] rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--leaf-bright) 28%, transparent), transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Text column */}
          <div className="text-center lg:text-left">
            <RevealOnScroll>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold text-foreground shadow-sm">
                <span className="rj-dot-live inline-block size-2 rounded-full bg-leaf-bright" aria-hidden="true" />
                {t("heroLive")}
              </span>
            </RevealOnScroll>

            <RevealOnScroll delay={70}>
              <h1 className="font-display text-4xl font-extrabold leading-[1.03] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                {t("heroTitle")}
              </h1>
            </RevealOnScroll>

            <RevealOnScroll delay={130}>
              <p className="mx-auto mt-5 max-w-xl text-muted-foreground sm:text-lg lg:mx-0">
                {t("heroSub")}
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={190}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link href={ROUTES.signUp} className={buttonVariants({ size: "lg" })}>
                  <HandHeart className="size-5" aria-hidden />
                  {t("donateFood")}
                </Link>
                <Link
                  href={ROUTES.becomeVolunteer}
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  {t("becomeVol")}
                </Link>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={240}>
              <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground lg:justify-start">
                <MapPin className="size-4" aria-hidden />
                {t("heroTrust")}
              </p>
            </RevealOnScroll>
          </div>

          {/* Visual column — branded gradient panel + floating stat card.
              (A real warm photo can replace the gradient panel later.) */}
          <RevealOnScroll delay={160} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              className="relative aspect-[5/4] w-full overflow-hidden rounded-[1.75rem] border border-border shadow-lg sm:aspect-[16/10] lg:aspect-[4/5]"
              style={{
                background:
                  "linear-gradient(150deg, color-mix(in srgb, var(--primary) 20%, var(--surface)), color-mix(in srgb, var(--leaf) 18%, var(--surface)))",
              }}
            >
              <div className="absolute inset-0 grid place-items-center text-primary/25">
                <HandHeart className="size-40" strokeWidth={1.1} aria-hidden />
              </div>
            </div>
            <div className="absolute -left-3 bottom-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-lg">
              <span className="grid size-11 place-items-center rounded-xl bg-leaf-soft text-leaf-soft-foreground">
                <Sprout className="size-6" aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block font-display text-2xl font-extrabold tracking-tight text-foreground">
                  {t("aboutStat1")}
                </span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  {t("aboutStat1L")}
                </span>
              </span>
            </div>
          </RevealOnScroll>
        </div>
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
        <RevealOnScroll>
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">
            {t("helpEyebrow")}
          </p>
          <h2 className="font-display mb-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
            {t("helpTitle")}
          </h2>
          <p className="mb-12 text-center text-sm text-muted-foreground">
            {t("helpSub")}
          </p>
        </RevealOnScroll>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Donor card */}
          <RevealOnScroll
            delay={40}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
          >
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
          </RevealOnScroll>

          {/* Volunteer card */}
          <RevealOnScroll
            delay={120}
            className="flex flex-col gap-4 rounded-2xl border border-primary bg-primary/5 p-6"
          >
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
          </RevealOnScroll>

          {/* Funds — coming soon (Phase 5 PARKED) */}
          <RevealOnScroll
            delay={180}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 opacity-80"
          >
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
          </RevealOnScroll>
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
        <RevealOnScroll>
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-primary">
            {t("aboutEyebrow")}
          </p>
          <h2 className="font-display mb-6 text-center text-2xl font-bold text-foreground sm:text-3xl">
            {t("aboutTitle")}
          </h2>

          <p className="mx-auto mb-8 max-w-xl text-center text-muted-foreground leading-relaxed">
            {t("aboutBody")}
          </p>
        </RevealOnScroll>

        {/* Quote */}
        <RevealOnScroll delay={60} className="mb-10">
          <blockquote className="rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="font-display text-lg font-semibold text-foreground italic">
              &ldquo;{t("quote")}&rdquo;
            </p>
            <footer className="mt-2 text-sm text-muted-foreground">
              — {t("quoteAttr")}
            </footer>
          </blockquote>
        </RevealOnScroll>

        {/* 3 stats */}
        <RevealOnScroll delay={120} className="grid grid-cols-3 gap-6 text-center">
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
        </RevealOnScroll>

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
      <RevealOnScroll className="mx-auto max-w-2xl space-y-4">
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
            // On the orange band the `outline` variant's bg-surface (white) + inherited
            // white text made this button white-on-white. Force a transparent bg so it
            // reads as a white-outlined button (white border + white text) on the band.
            style={{
              color: "inherit",
              borderColor: "white",
              backgroundColor: "transparent",
            }}
          >
            {t("becomeVol")}
          </Link>
          <Link
            href={ROUTES.signUp}
            className={buttonVariants({ size: "lg" })}
            style={{
              backgroundColor: "white",
              color: "var(--color-primary)",
            }}
          >
            {t("donateFood")}
          </Link>
        </div>
      </RevealOnScroll>
    </section>
  );
}
