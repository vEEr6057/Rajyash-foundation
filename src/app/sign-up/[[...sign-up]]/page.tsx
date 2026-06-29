import { SignUp } from "@clerk/nextjs";
import { AuthSplitLayout } from "@/features/auth/components/AuthSplitLayout";

export const metadata = { title: "Create account — Rajyash Food Rescue" };

export default function SignUpPage() {
  return (
    <AuthSplitLayout>
      <SignUp forceRedirectUrl="/onboarding" signInUrl="/sign-in" />
    </AuthSplitLayout>
  );
}
