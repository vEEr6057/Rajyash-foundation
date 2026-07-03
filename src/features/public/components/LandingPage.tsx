// src/features/public/components/LandingPage.tsx
// Public homepage — editorial elevation of the Rajyash Foundation brand.
// Built verbatim from docs/design/HOMEPAGE-SPEC.md (scoped --rj-* token layer, no app
// saffron system). English copy inline for this cut; i18n extraction is the final build step.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { getCachedImpactReport } from "@/server/db/repositories/impact";
import { ROUTES } from "@/config/constants";
import { RevealOnScroll } from "./RevealOnScroll";
import { RescueLine, LeafMark } from "./RescueLine";
import { LedgerImpact } from "./LedgerImpact";

const ink = "var(--rj-ink)";
const inkSoft = "var(--rj-ink-soft)";
const gold = "var(--rj-gold-ink)";
const hairline = "var(--rj-hairline)";
const cta: React.CSSProperties = {
  background: "var(--rj-green-cta)",
  color: "#fff",
  borderRadius: "6px",
};

type Program = {
  n: string;
  title: string;
  desc: string;
  img: string;
  href?: string;
  live?: boolean;
};
const PROGRAMS: Program[] = [
  { n: "01", title: "Plantation", desc: "Tree drives that give Ahmedabad cleaner air and shade.", img: "/images/rajyash/prog3.jpg" },
  { n: "02", title: "Education", desc: "Books, supplies and support for children who deserve to rise.", img: "/images/rajyash/prog2.jpg" },
  { n: "03", title: "Animals & Birds Rescue", desc: "Rescue, feeding and care for the creatures who share our streets.", img: "/images/rajyash/prog4.jpg" },
  { n: "04", title: "Food Porter", desc: "Surplus food, rescued warm and carried to people in need — every evening.", img: "/images/foodporter/food-porter5.jpg", href: ROUTES.signUp, live: true },
  { n: "05", title: "Anand Mela", desc: "Community fairs that raise support and bring the city together.", img: "/images/rajyash/prog5.jpg" },
  { n: "06", title: "Other Activities", desc: "Blood-donation drives, disaster relief, and everyday kindness all year.", img: "/images/rajyash/prog7.jpg" },
];

function Marker({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rj-display block"
      style={{ fontStyle: "italic", fontWeight: 500, fontSize: "0.8125rem", color: gold, letterSpacing: 0 }}
    >
      {children}
    </span>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <figcaption
      className="absolute bottom-0 left-0 w-full px-4 py-3 text-xs font-medium tracking-[0.02em] text-white"
      style={{ background: "linear-gradient(to top, rgba(30,42,34,.55), transparent)" }}
    >
      {children}
    </figcaption>
  );
}

export async function LandingPage() {
  const [t, impact, session] = await Promise.all([
    getTranslations("landing"),
    getCachedImpactReport(),
    getSession(),
  ]);
  const dashboardHref = session
    ? session.role === "admin"
      ? ROUTES.adminDashboard
      : ROUTES.portalDashboard
    : null;

  return (
    <main id="main-content" className="rj-home overflow-x-clip">
      {/* ── Rescue-line band: hero → ledger ─────────────────────────── */}
      <div className="relative">
        <RescueLine />

        {/* ── 5.2 HERO — 60/40 typographic split ─────────────────── */}
        <section className="relative mx-auto grid max-w-[78rem] grid-cols-1 gap-y-10 px-6 pb-16 pt-28 sm:px-10 lg:grid-cols-12 lg:gap-x-8 lg:pt-32">
          <div className="relative z-10 lg:col-span-7 lg:pr-8">
            <RevealOnScroll>
              <p className="text-sm font-semibold" style={{ color: inkSoft }}>
                <span style={{ color: gold }}>સેવા</span> · We rise by lifting others
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={80}>
              <h1
                className="mt-5"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.25rem)", lineHeight: 1.06, letterSpacing: "-0.005em", color: ink }}
              >
                We rise by <span style={{ color: gold }}>lifting</span> others.
              </h1>
            </RevealOnScroll>
            <RevealOnScroll delay={150}>
              <p
                className="mt-6 max-w-xl"
                style={{ fontSize: "clamp(1.125rem, 1.4vw, 1.3125rem)", lineHeight: 1.55, color: inkSoft }}
              >
                Since 2016, the Rajyash Foundation has turned Ahmedabad&rsquo;s surplus into
                dignity. Every evening, volunteers still carry warm meals across the city — and
                this page counts them as they go.
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={220}>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                {dashboardHref ? (
                  <Link href={dashboardHref} className="px-6 py-3 font-medium" style={cta}>
                    Go to dashboard
                  </Link>
                ) : (
                  <>
                    <Link href={ROUTES.becomeVolunteer} className="px-6 py-3 font-medium" style={cta}>
                      Become a volunteer
                    </Link>
                    <Link href={ROUTES.signUp} className="rj-underline inline-flex items-center gap-1 font-medium" style={{ color: ink }}>
                      or donate surplus food <ArrowRight className="size-4" />
                    </Link>
                  </>
                )}
              </div>
            </RevealOnScroll>
          </div>

          <figure className="relative z-10 -mr-6 overflow-hidden sm:-mr-10 lg:col-span-5 lg:-mr-[max(2.5rem,calc((100vw-78rem)/2))]">
            <div
              className="relative h-full min-h-[clamp(420px,60vh,680px)] overflow-hidden rounded-lg"
              style={{ border: "1px solid var(--rj-hairline-2)" }}
            >
              <img
                src="/images/foodporter/food-porter2.jpg"
                alt="Volunteers handing out warm evening meals from tiffins on an Ahmedabad street"
                className="rj-graded absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
              <Caption>Evening distribution, Ahmedabad · 2026</Caption>
            </div>
          </figure>
        </section>

        {/* ── 5.3 PROOF STRIP ─────────────────────────────────────── */}
        <section className="mx-auto max-w-[78rem] px-6 sm:px-10">
          <div style={{ borderTop: `1px solid ${hairline}`, borderBottom: `1px solid ${hairline}` }}>
            <p
              className="rj-display flex flex-wrap items-baseline gap-x-3 gap-y-1 py-6"
              style={{ fontWeight: 500, fontSize: "clamp(1rem,1.6vw,1.375rem)" }}
            >
              {[
                ["365,000", "people helped"],
                ["70", "volunteers"],
                ["6", "programmes"],
                ["2016", "serving Ahmedabad since"],
              ].map(([num, label], i) => (
                <span key={label} className="inline-flex items-baseline gap-3">
                  {i > 0 && <span style={{ color: gold }} aria-hidden>·</span>}
                  <span style={{ color: ink }}>{num}</span>
                  <span style={{ color: inkSoft, fontSize: "0.95rem" }}>{label}</span>
                </span>
              ))}
            </p>
          </div>
        </section>

        {/* ── 5.4 PROGRAMS — editorial index rows ─────────────────── */}
        <section id="programs" className="mx-auto max-w-[78rem] scroll-mt-24 px-6 py-20 sm:px-10">
          <RevealOnScroll>
            <Marker>સેવા · What we do</Marker>
            <h2 className="mt-2" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)", lineHeight: 1.12, color: ink, fontWeight: 600 }}>
              Six ways we lift our city.
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delay={80} className="mt-10">
            <ul style={{ borderTop: `1px solid ${hairline}` }}>
              {PROGRAMS.map((p) => {
                const row = (
                  <div
                    className="rj-row grid grid-cols-12 items-center gap-4 py-6"
                    style={{ borderBottom: `1px solid ${hairline}`, borderLeft: p.live ? "3px solid var(--rj-gold)" : "3px solid transparent", paddingLeft: "1rem" }}
                  >
                    <span className="rj-display col-span-2 sm:col-span-1" style={{ color: inkSoft, fontSize: "1rem" }}>{p.n}</span>
                    <div className="col-span-10 sm:col-span-8">
                      <div className="flex items-center gap-3">
                        <span className="rj-row-name rj-display" style={{ fontSize: "clamp(1.5rem,2.4vw,2rem)", fontWeight: 500, lineHeight: 1.1, color: ink }}>
                          {p.title}
                        </span>
                        {p.live && (
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: gold }}>
                            The live programme
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm" style={{ color: inkSoft }}>{p.desc}</p>
                    </div>
                    <div className="col-span-12 sm:col-span-3">
                      <div className="ml-auto aspect-[4/3] max-w-[9rem] overflow-hidden rounded-lg" style={{ border: `1px solid ${hairline}` }}>
                        <img src={p.img} alt="" className="rj-graded rj-row-thumb h-full w-full object-cover" loading="lazy" />
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={p.title}>
                    {p.href ? <Link href={p.href} className="block">{row}</Link> : row}
                  </li>
                );
              })}
            </ul>
          </RevealOnScroll>
        </section>

        {/* ── 5.5 FOOD PORTER live feature ────────────────────────── */}
        <section className="mx-auto grid max-w-[78rem] grid-cols-1 items-center gap-10 px-6 py-20 sm:px-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <RevealOnScroll>
              <Marker>02 — Food Porter</Marker>
              <h2 className="mt-2" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)", lineHeight: 1.12, color: ink, fontWeight: 600 }}>
                The rescue loop runs on software now.
              </h2>
              <p className="mt-5 max-w-prose" style={{ color: inkSoft, fontSize: "1.0625rem", lineHeight: 1.65 }}>
                A donor posts surplus food. A volunteer nearby claims it, picks it up while it&rsquo;s
                still warm, and delivers it to people in need — often within the hour. Every step is
                logged, so nothing is lost and nobody is guessing.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-5">
                <Link href={ROUTES.signUp} className="px-6 py-3 font-medium" style={cta}>See how it works</Link>
                <Link href={ROUTES.becomeVolunteer} className="rj-underline font-medium" style={{ color: ink }}>Start volunteering →</Link>
              </div>
            </RevealOnScroll>
          </div>
          <figure className="relative -mr-6 overflow-hidden sm:-mr-10 lg:col-span-6 lg:-mr-[max(2.5rem,calc((100vw-78rem)/2))]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg lg:aspect-auto lg:h-[30rem]" style={{ border: "1px solid var(--rj-hairline-2)" }}>
              <img src="/images/foodporter/food-porter3.jpg" alt="Two Food Porter volunteers serving rescued food from steel containers" className="rj-graded absolute inset-0 h-full w-full object-cover" loading="lazy" />
              <Caption>A Food Porter run, Satellite · 2026</Caption>
            </div>
          </figure>
        </section>

        {/* ── 5.6 PROVENANCE LEDGER ───────────────────────────────── */}
        <section id="impact" className="mx-auto max-w-[78rem] scroll-mt-24 px-6 pb-24 sm:px-10">
          <RevealOnScroll className="lg:max-w-[52rem]">
            <LedgerImpact servings={impact.servings} kg={impact.kg} count={impact.count} />
          </RevealOnScroll>
        </section>
      </div>

      {/* ── 5.7 ONE HUMAN STORY ───────────────────────────────────── */}
      <section className="mx-auto grid max-w-[78rem] grid-cols-1 items-center gap-10 px-6 py-20 sm:px-10 lg:grid-cols-12 lg:gap-8">
        <figure className="relative -ml-6 overflow-hidden sm:-ml-10 lg:col-span-6 lg:order-1 lg:-ml-[max(2.5rem,calc((100vw-78rem)/2))]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg" style={{ border: "1px solid var(--rj-hairline-2)" }}>
            <img src="/images/rajyash/prog6.jpg" alt="A Rajyash Foundation volunteer during an evening food run" className="rj-graded absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <Caption>A volunteer on the evening route · Ahmedabad</Caption>
          </div>
        </figure>
        <div className="lg:order-2 lg:col-span-5 lg:col-start-8">
          <RevealOnScroll>
            <blockquote className="rj-display" style={{ fontSize: "clamp(1.5rem,2.4vw,2rem)", fontWeight: 500, lineHeight: 1.2, color: ink }}>
              &ldquo;I drive for an hour after work. By the time I&rsquo;m home, forty people have eaten.&rdquo;
            </blockquote>
            <p className="mt-4 font-medium" style={{ color: gold }}>— Riya, Food Porter volunteer since 2023</p>
            <p className="mt-5" style={{ color: inkSoft, fontSize: "1.0625rem", lineHeight: 1.65 }}>
              Most of our volunteers give a couple of evenings a month. That&rsquo;s all it takes to
              keep the loop turning.
            </p>
          </RevealOnScroll>
        </div>
      </section>

      {/* ── 5.8 FINALE CTA — the one full-bleed green, one centered ── */}
      <section className="px-6 py-20 text-center text-white" style={{ background: "var(--rj-green)" }}>
        <RevealOnScroll className="mx-auto max-w-2xl">
          <h2 style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)", lineHeight: 1.12, fontWeight: 600 }}>
            Good food, in the right hands.
          </h2>
          <p className="mt-3 text-white/85">
            Whether you have food to give or a few hours to drive, there&rsquo;s a place for you in the loop.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href={ROUTES.becomeVolunteer} className="rounded-md bg-white px-6 py-3 font-semibold" style={{ color: "var(--rj-green)" }}>
              Become a volunteer
            </Link>
            <Link href={ROUTES.signUp} className="rounded-md border-2 border-white/80 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              Donate surplus food
            </Link>
          </div>
          <p className="sr-only">{t("heroTrust")}</p>
        </RevealOnScroll>
        <LeafMark className="mx-auto mt-10 size-5 opacity-80" />
      </section>
    </main>
  );
}
