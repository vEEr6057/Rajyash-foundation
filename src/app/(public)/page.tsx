// src/app/(public)/page.tsx
// Public landing route — replaces src/app/page.tsx placeholder.
// Route group (public) does not affect the URL — still resolves to /.
// This page is PUBLIC and unauthenticated — no auth check here.
import { PublicHeader } from "@/features/public/components/PublicHeader";
import { LandingPage } from "@/features/public/components/LandingPage";
import { PublicFooter } from "@/features/public/components/PublicFooter";

export const metadata = {
  title: "Rajyash Food Rescue — Rescuing surplus food across Ahmedabad",
  description:
    "Connecting surplus food to people in need. Donate food, volunteer to deliver, or support the mission.",
};

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <LandingPage />
      <PublicFooter />
    </>
  );
}
