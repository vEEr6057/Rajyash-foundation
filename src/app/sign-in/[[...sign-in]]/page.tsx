import { SignIn } from "@clerk/nextjs";
import { AuthSplitLayout } from "@/features/auth";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthSplitLayout>
      <SignIn forceRedirectUrl="/portal/dashboard" signUpUrl="/sign-up" />
    </AuthSplitLayout>
  );
}
