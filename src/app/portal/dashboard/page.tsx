import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, HeartHandshake, Route as RouteIcon, PackageOpen } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { runsRepo } from "@/server/db/repositories/runs";
import { ROUTES, type PickupStatus } from "@/config/constants";
import type { Pickup } from "@/server/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LedgerRow } from "@/components/LedgerRow";
import { APP_TIME_ZONE } from "@/features/pickups/lib/format";
import { PickupCard } from "@/features/pickups/components/PickupCard";
import { PushOptIn } from "@/features/notifications";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Rajyash Food Porter" };

const ACTIVE: PickupStatus[] = ["accepted", "en_route", "picked_up"];

export default async function PortalDashboardPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (!session.onboardingComplete) redirect(ROUTES.onboarding);
  if (session.role === "admin") redirect(ROUTES.adminDashboard);
  if (session.role === "driver") redirect(ROUTES.driverRun);

  const [t, locale, profile] = await Promise.all([
    getTranslations("portal"),
    getLocale(),
    profilesRepo.getById(session.userId),
  ]);
  const name = profile?.name?.split(" ")[0] ?? "";
  const isDonor = session.role === "donor";
  const istDate = new Intl.DateTimeFormat(`${locale}-IN`, {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <PageHeader
        eyebrow={isDonor ? t("dashboard.donorEyebrow") : t("dashboard.volunteerEyebrow")}
        title={name ? t("dashboard.greeting", { name }) : t("dashboard.title")}
        meta={isDonor ? istDate : t("dashboard.volunteerCta")}
      />

      {isDonor ? <DonorDashboard userId={session.userId} /> : <VolunteerDashboard />}

      <div className="mt-6">
        <PushOptIn />
      </div>
    </main>
  );
}

async function DonorDashboard({ userId }: { userId: string }) {
  const [t, mine] = await Promise.all([
    getTranslations("portal"),
    pickupsRepo.listByDonor(userId),
  ]);
  const count = (s: (p: Pickup) => boolean) => mine.filter(s).length;
  const recent = mine.slice(0, 4);

  return (
    <>
      <LedgerRow
        stats={[
          { value: mine.length.toLocaleString(), label: t("dashboard.stats.total") },
          {
            value: count((p) => p.status === "requested").toLocaleString(),
            label: t("dashboard.stats.open"),
          },
          {
            value: count((p) => ACTIVE.includes(p.status)).toLocaleString(),
            label: t("dashboard.stats.active"),
          },
          {
            value: count((p) => p.status === "delivered").toLocaleString(),
            label: t("dashboard.stats.delivered"),
          },
        ]}
        provenance={t("dashboard.statsProvenance")}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={ROUTES.newPickup} className={buttonVariants({ size: "lg" })}>
          <Plus className="size-4" /> {t("dashboard.postPickup")}
        </Link>
        <Link href={ROUTES.donorPickups} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <HeartHandshake className="size-4" /> {t("dashboard.myPickups")}
        </Link>
      </div>

      <Section title={t("dashboard.recentTitle")}>
        {recent.length === 0 ? (
          <EmptyState
            title={t("pickup.donor.emptyTitle")}
            body={t("pickup.donor.emptyBody")}
            action={
              <Link href={ROUTES.newPickup} className={buttonVariants()}>
                {t("pickup.donor.firstPickupCta")}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((p) => (
              <PickupCard key={p.id} pickup={p} />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

// dispatch-model-v2 (docs/specs/dispatch-model-v2.md): volunteers never claim
// or get assigned a pickup — they help distribute at active runs. The ledger
// and CTAs reflect that: open pickups is awareness, active runs is "what can
// I help with right now."
async function VolunteerDashboard() {
  const [t, open, allRuns] = await Promise.all([
    getTranslations("portal"),
    pickupsRepo.listOpen(),
    runsRepo.listRuns(),
  ]);
  const activeRuns = allRuns.filter((r) => r.status === "active");

  return (
    <>
      <LedgerRow
        stats={[
          { value: open.length.toLocaleString(), label: t("dashboard.stats.openNow") },
          { value: activeRuns.length.toLocaleString(), label: t("dashboard.stats.myActive") },
        ]}
        provenance={t("dashboard.volunteerStatsProvenance")}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={ROUTES.distributions} className={buttonVariants({ size: "lg" })}>
          <RouteIcon className="size-4" /> {t("distributions.title")}
        </Link>
        <Link href={ROUTES.volunteerBoard} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <PackageOpen className="size-4" /> {t("dashboard.browsePickups")}
        </Link>
      </div>

      <Section title={t("dashboard.activeTitle")}>
        {activeRuns.length === 0 ? (
          <EmptyState title={t("dashboard.noActive")} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("distributions.metaCount", { count: activeRuns.length })} —{" "}
            <Link href={ROUTES.distributions} className="font-semibold text-primary">
              {t("distributions.title")}
            </Link>
          </p>
        )}
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
