import { SignUp } from "@clerk/nextjs";
import { AuthSplitLayout } from "@/features/auth/components/AuthSplitLayout";

export const metadata = { title: "Create account — Rajyash Food Porter" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  // Carry the landing-page role intent (e.g. "Become a volunteer" → ?role=volunteer)
  // through the OAuth round-trip so onboarding pre-selects it. Onboarding re-validates
  // against the allowlist, so an unknown role here is harmless.
  const redirectUrl =
    role === "volunteer" || role === "donor" || role === "driver"
      ? `/onboarding?role=${role}`
      : "/onboarding";
  return (
    <AuthSplitLayout>
      <SignUp forceRedirectUrl={redirectUrl} signInUrl="/sign-in" />
    </AuthSplitLayout>
  );
}
