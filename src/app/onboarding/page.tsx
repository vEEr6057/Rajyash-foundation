// src/app/onboarding/page.tsx — modified to accept ?role=volunteer searchParam (PUB-03)
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/features/auth/components/OnboardingForm";
import { getSession } from "@/server/auth/session";

export const metadata = { title: "Welcome — Rajyash Food Rescue" };

type SelectableRole = "volunteer" | "donor" | "driver";
const asSelectable = (r: string | undefined): SelectableRole | undefined =>
  r === "volunteer" || r === "donor" || r === "driver" ? r : undefined;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const t = await getTranslations("onboarding");
  // SECURITY (T-7-02-02): Validate role against the selectable allowlist — donor/volunteer/driver.
  // Anything else (including admin) is silently ignored; role is also re-validated
  // in completeOnboarding server action (AUTH-05 path unchanged).
  // Priority: explicit ?role= (homepage CTA intent) → the role an admin INVITED them as
  // (carried in Clerk metadata via inviteUser, since invite links don't carry a query
  // param). Admin is never selectable here, so an admin-metadata role falls through to undefined.
  const session = await getSession();
  const defaultRole = asSelectable(role) ?? asSelectable(session?.role);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm defaultRole={defaultRole} />
        </CardContent>
      </Card>
    </main>
  );
}
