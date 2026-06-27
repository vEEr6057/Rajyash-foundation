import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in — Rajyash Food Rescue" };

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <SignIn forceRedirectUrl="/portal/dashboard" signUpUrl="/sign-up" />
    </main>
  );
}
