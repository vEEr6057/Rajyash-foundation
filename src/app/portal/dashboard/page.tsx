import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, HeartHandshake, Map as MapIcon, PackageOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/auth/session";
import { profilesRepo } from "@/server/db/repositories/profiles";
import { pickupsRepo } from "@/server/db/repositories/pickups";
import { ROUTES, type PickupStatus } from "@/config/constants";
import type { Pickup } from "@/server/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PickupCard } from "@/features/pickups/components/PickupCard";
import { PushOptIn } from "@/features/notifications";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Rajyash Food Rescue" };

const ACTIVE: PickupStatus[] = ["accepted", "en_route", "picked_up"];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {value.toLocaleString()}
        </p>
        <p className="mt-0.5 text-sm font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default async function PortalDashboardPage() {
  const session = await getSession();
  if (!session) redirect(ROUTES.signIn);
  if (!session.onboardingComplete) redirect(ROUTES.onboarding);
  if (session.role === "admin") redirect(ROUTES.adminDashboard);
  if (session.role === "driver") redirect(ROUTES.driverRun);

  const [t, profile] = await Promise.all([
    getTranslations("portal"),
    profilesRepo.getById(session.userId),
  ]);
  const name = profile?.name?.split(" ")[0] ?? "";
  const isDonor = session.role === "donor";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {name ? t("dashboard.greeting", { name }) : t("dashboard.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isDonor ? t("dashboard.donorCta") : t("dashboard.volunteerCta")}
        </p>
      </header>

      {isDonor ? (
        <DonorDashboard userId={session.userId} />
      ) : (
        <VolunteerDashboard userId={session.userId} />
      )}

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("dashboard.stats.total")} value={mine.length} />
        <Stat label={t("dashboard.stats.open")} value={count((p) => p.status === "requested")} />
        <Stat label={t("dashboard.stats.active")} value={count((p) => ACTIVE.includes(p.status))} />
        <Stat label={t("dashboard.stats.delivered")} value={count((p) => p.status === "delivered")} />
      </div>

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
          <Empty
            text={t("pickup.donor.emptyState")}
            ctaHref={ROUTES.newPickup}
            ctaLabel={t("pickup.donor.firstPickupCta")}
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

async function VolunteerDashboard({ userId }: { userId: string }) {
  const [t, open, mine] = await Promise.all([
    getTranslations("portal"),
    pickupsRepo.listOpen(),
    pickupsRepo.listByVolunteer(userId),
  ]);
  const active = mine.filter((p) => ACTIVE.includes(p.status));
  const delivered = mine.filter((p) => p.status === "delivered").length;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("dashboard.stats.openNow")} value={open.length} />
        <Stat label={t("dashboard.stats.myActive")} value={active.length} />
        <Stat label={t("dashboard.stats.deliveredByMe")} value={delivered} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={ROUTES.volunteerBoard} className={buttonVariants({ size: "lg" })}>
          <PackageOpen className="size-4" /> {t("dashboard.browsePickups")}
        </Link>
        <Link href={ROUTES.volunteerBoardMap} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <MapIcon className="size-4" /> {t("dashboard.mapView")}
        </Link>
      </div>

      <Section title={t("dashboard.activeTitle")}>
        {active.length === 0 ? (
          <Empty
            text={t("dashboard.noActive")}
            ctaHref={ROUTES.volunteerBoard}
            ctaLabel={t("dashboard.browsePickups")}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((p) => (
              <PickupCard key={p.id} pickup={p} />
            ))}
          </div>
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

function Empty({ text, ctaHref, ctaLabel }: { text: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong p-8 text-center">
      <p className="text-muted-foreground">{text}</p>
      <Link href={ctaHref} className={buttonVariants({ size: "sm" }) + " mt-4"}>
        {ctaLabel}
      </Link>
    </div>
  );
}
