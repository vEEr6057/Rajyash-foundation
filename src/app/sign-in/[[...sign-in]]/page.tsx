import { SignIn } from "@clerk/nextjs";
import { AuthSplitLayout } from "@/features/auth/components/AuthSplitLayout";

export const metadata = { title: "Sign in — Rajyash Food Rescue" };

export default function SignInPage() {
  return (
    <AuthSplitLayout>
      <SignIn forceRedirectUrl="/portal/dashboard" signUpUrl="/sign-up" />
    </AuthSplitLayout>
  );
}
