// src/app/onboarding/page.tsx — modified to accept ?role=volunteer searchParam (PUB-03)
import { getTranslations } from "next-intl/server";
import { AuthSplitLayout } from "@/features/auth/components/AuthSplitLayout";
import { OnboardingForm } from "@/features/auth/components/OnboardingForm";
import { getSession } from "@/server/auth/session";

export const metadata = { title: "Welcome — Rajyash Food Porter" };

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
  // NOTE: admin-invited users (inviteUser stamps onboardingComplete: true) never actually
  // reach this page anymore — middleware's onboarding gate redirects them straight to
  // /portal/dashboard, and their profile is provisioned lazily by getSession's
  // ensureInvitedProfile. The isAdminInvite/defaultRole-from-session branches below are
  // effectively unreachable dead paths for that flow now; left in place as a harmless
  // fallback and because the ?role= (self sign-up CTA) flow below still uses this logic.
  const session = await getSession();
  const defaultRole = asSelectable(role) ?? asSelectable(session?.role);
  // An admin-invited user arrives here with role="admin" already in Clerk metadata.
  // Hide the (donor/volunteer/driver) role picker for them — completeOnboarding preserves
  // their admin role regardless of what the form sends; they only confirm name/city/phone.
  const isAdminInvite = session?.role === "admin";

  return (
    <AuthSplitLayout eyebrow={t("eyebrow")} headline={t("headline")} subline={t("subline")}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center lg:text-left">
          <h1 className="font-display text-2xl font-medium text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <OnboardingForm defaultRole={defaultRole} isAdminInvite={isAdminInvite} />
      </div>
    </AuthSplitLayout>
  );
}
