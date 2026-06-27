import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Create account — Rajyash Food Rescue" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <SignUp forceRedirectUrl="/onboarding" signInUrl="/sign-in" />
    </main>
  );
}
