// src/features/public/components/LandingPage.tsx
// Public landing — a close visual clone of the official rajyashfoundation.com homepage
// (their own brand, for their own app): green #337048 + gold + coral, Roboto Slab / Roboto,
// their section order (hero → impact → about pillars → what-we-do → food-rescue live impact →
// volunteer CTA). Copy mirrors the official site (English-only, as there). Motion via
// RevealOnScroll (their WOW.js reveal) + ImpactCounter count-up.
import Link from "next/link";
import {
  Sprout,
  GraduationCap,
  Bird,
  HandHeart,
  PartyPopper,
  HeartPulse,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { getCachedImpactReport } from "@/server/db/repositories/impact";
import { ROUTES } from "@/config/constants";
import { ImpactCounter } from "./ImpactCounter";
import { RevealOnScroll } from "./RevealOnScroll";

const GREEN = "#337048";
const CORAL = "#FC615D";

const PROGRAMS = [
  {
    Icon: Sprout,
    title: "Plantation",
    body: "Greening Ahmedabad one sapling at a time — tree drives that give the city cleaner air and shade.",
    img: "/images/rajyash/prog3.jpg",
  },
  {
    Icon: GraduationCap,
    title: "Education",
    body: "Backing underprivileged children with the books, supplies and support they need to learn and rise.",
    img: "/images/rajyash/prog2.jpg",
  },
  {
    Icon: Bird,
    title: "Animals & Birds Rescue",
    body: "Rescue, feeding and care for the animals and birds that share our city.",
    img: "/images/rajyash/prog4.jpg",
  },
  {
    Icon: HandHeart,
    title: "Food Porter",
    body: "Rescuing surplus food and getting it — warm and safe — to people in need across Ahmedabad.",
    img: "/images/foodporter/food-porter5.jpg",
    href: ROUTES.signUp,
  },
  {
    Icon: PartyPopper,
    title: "Anand Mela",
    body: "Community fairs that bring people together and raise support for those who need it most.",
    img: "/images/rajyash/prog5.jpg",
  },
  {
    Icon: HeartPulse,
    title: "Other Activities",
    body: "Blood-donation drives, disaster relief and everyday acts of kindness across the year.",
    img: "/images/rajyash/prog7.jpg",
  },
] as const;

const PILLARS = [
  { title: "Embrace", body: "We meet people where they are — with dignity, warmth and no conditions." },
  { title: "Empower", body: "We give real, practical support that helps people stand on their own." },
  { title: "Inspire", body: "We show that one small act of kindness, repeated, changes a city." },
] as const;

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
    <main id="main-content" className="rj-clone overflow-x-clip bg-white text-[#233]">
      <style>{`
        .rj-clone{font-family:var(--font-roboto),system-ui,sans-serif}
        .rj-clone h1,.rj-clone h2,.rj-clone h3,.rj-clone .slab{
          font-family:var(--font-roboto-slab),Georgia,serif}
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <img
          src="/images/rajyash/prog2.jpg"
          alt="Rajyash Foundation volunteers with schoolchildren in Ahmedabad"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          loading="eager"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(105deg, rgba(20,48,32,.92) 0%, rgba(20,48,32,.78) 42%, rgba(20,48,32,.30) 100%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl text-white">
            <RevealOnScroll>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold tracking-wide backdrop-blur">
                <span className="size-2 rounded-full" style={{ background: CORAL }} />
                We rise by lifting others
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={80}>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Join us in creating a <span style={{ color: "#F6C445" }}>better tomorrow</span>
              </h1>
            </RevealOnScroll>
            <RevealOnScroll delay={150}>
              <p className="mt-6 max-w-xl text-lg text-white/85">
                One act of kindness at a time. We strive to make a lasting impact — from
                environmental conservation to social welfare — across Ahmedabad.
              </p>
            </RevealOnScroll>
            <RevealOnScroll delay={220}>
              <div className="mt-9 flex flex-wrap gap-4">
                {dashboardHref ? (
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold text-white shadow-lg transition hover:brightness-110"
                    style={{ background: CORAL }}
                  >
                    <LayoutDashboard className="size-5" /> Go to dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href={ROUTES.signUp}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold text-white shadow-lg transition hover:brightness-110"
                      style={{ background: CORAL }}
                    >
                      <HandHeart className="size-5" /> Donate surplus food
                    </Link>
                    <Link
                      href={ROUTES.becomeVolunteer}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 px-7 py-3.5 font-semibold text-white transition hover:bg-white hover:text-[#233]"
                    >
                      Become a volunteer <ArrowRight className="size-5" />
                    </Link>
                  </>
                )}
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ── IMPACT STATS BAND (count-up) ─────────────────────────── */}
      <section className="border-b border-black/5" style={{ background: GREEN }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 text-center text-white sm:grid-cols-4">
          {[
            { n: "365,000+", l: "People helped" },
            { n: "70", l: "Volunteers" },
            { n: "6", l: "Programs" },
            { n: "2016", l: "Serving since" },
          ].map((s) => (
            <div key={s.l}>
              <p className="slab text-3xl font-extrabold sm:text-4xl">{s.n}</p>
              <p className="mt-1 text-sm text-white/80">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT — Embrace / Empower / Inspire ──────────────────── */}
      <section id="about" className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <RevealOnScroll>
            <div className="overflow-hidden rounded-2xl shadow-xl">
              <img
                src="/images/rajyash/prog6.jpg"
                alt="Rajyash Foundation volunteers at work in Ahmedabad"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </RevealOnScroll>
          <div>
            <RevealOnScroll>
              <p
                className="mb-2 text-xs font-bold uppercase tracking-[0.15em]"
                style={{ color: CORAL }}
              >
                About us
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                More than an act of charity — a movement of kindness.
              </h2>
              <p className="mt-4 max-w-prose text-[#555] leading-relaxed">
                The Rajyash Foundation is the social arm of the Rajyash Group, based in
                Ahmedabad. Our dedicated team of 70 works tirelessly to create a brighter,
                kinder tomorrow — from environmental conservation to feeding people in need.
              </p>
            </RevealOnScroll>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {PILLARS.map((p, i) => (
                <RevealOnScroll key={p.title} delay={60 + i * 70}>
                  <div className="h-full rounded-xl border border-black/5 bg-[#f7faf7] p-5">
                    <h3 className="slab text-lg font-bold" style={{ color: GREEN }}>
                      {p.title}
                    </h3>
                    <p className="mt-1 text-sm text-[#555]">{p.body}</p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE DO — 6 programs ──────────────────────────────── */}
      <section id="programs" className="bg-[#f6f8f6] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll className="mx-auto mb-12 max-w-2xl text-center">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-[0.15em]"
              style={{ color: CORAL }}
            >
              What we do
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Six ways we lift our city
            </h2>
            <p className="mt-3 text-[#555]">
              From saplings to surplus food, every programme turns everyday kindness into
              lasting change.
            </p>
          </RevealOnScroll>

          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMS.map((p, i) => {
              const card = (
                <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={p.img}
                      alt={p.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span
                      className="absolute left-4 top-4 grid size-11 place-items-center rounded-xl text-white shadow-md"
                      style={{ background: GREEN }}
                    >
                      <p.Icon className="size-5" />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="slab text-xl font-bold text-[#233]">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-[#555] leading-relaxed">{p.body}</p>
                    {"href" in p && p.href ? (
                      <span
                        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
                        style={{ color: GREEN }}
                      >
                        Get involved <ArrowRight className="size-4" />
                      </span>
                    ) : null}
                  </div>
                </div>
              );
              return (
                <RevealOnScroll key={p.title} delay={40 + i * 60}>
                  {"href" in p && p.href ? (
                    <Link href={p.href} className="block h-full">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </RevealOnScroll>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LIVE FOOD-RESCUE IMPACT (real numbers from this app) ─── */}
      <ImpactCounter servings={impact.servings} kg={impact.kg} count={impact.count} />

      {/* ── VOLUNTEER CTA ────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center text-white" style={{ background: GREEN }}>
        <RevealOnScroll className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl">Lend a few hours. Change a life.</h2>
          <p className="mt-3 text-white/85">
            Whether you have food to give or time to drive, there is a place for you in the
            Rajyash Foundation family.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href={ROUTES.becomeVolunteer}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-semibold text-white shadow-lg transition hover:brightness-110"
              style={{ background: CORAL }}
            >
              Become a volunteer <ArrowRight className="size-5" />
            </Link>
            <Link
              href={ROUTES.signUp}
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/70 px-7 py-3.5 font-semibold text-white transition hover:bg-white hover:text-[#233]"
            >
              Donate surplus food
            </Link>
          </div>
          <p className="sr-only">{t("heroTrust")}</p>
        </RevealOnScroll>
      </section>
    </main>
  );
}
