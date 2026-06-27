import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/features/auth/components/OnboardingForm";

export const metadata = { title: "Welcome — Rajyash Food Rescue" };

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Rajyash Food Rescue</CardTitle>
          <CardDescription>
            A couple of details and you&apos;re in. You can change these later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
