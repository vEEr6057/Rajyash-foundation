// src/app/(public)/page.tsx
// Public landing route — replaces src/app/page.tsx placeholder.
// Route group (public) does not affect the URL — still resolves to /.
// This page is PUBLIC and unauthenticated — no auth check here.
import { PublicHeader } from "@/features/public/components/PublicHeader";
import { LandingPage } from "@/features/public/components/LandingPage";
import { PublicFooter } from "@/features/public/components/PublicFooter";

export const metadata = {
  alternates: { canonical: "/" },
};

// NGO structured data (HOMEPAGE-STANDARDS §1.4). Validate with Google Rich Results Test.
const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "NGO",
  "@id": "https://rajyash-food-rescue.shahveerkeaten.workers.dev/#organization",
  name: "Rajyash Foundation",
  url: "https://rajyash-food-rescue.shahveerkeaten.workers.dev/",
  logo: "https://rajyash-food-rescue.shahveerkeaten.workers.dev/images/rajyash/logo.png",
  description:
    "The social arm of the Rajyash Group — rescuing surplus food and running programmes across Ahmedabad since 2016.",
  foundingDate: "2016",
  areaServed: "Ahmedabad, IN",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Satellite",
    addressLocality: "Ahmedabad",
    addressRegion: "GJ",
    postalCode: "380015",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "general",
    email: "rajyashfoundation@rajyashgroup.com",
    telephone: "+91-9875041206",
  },
  sameAs: [
    "https://www.facebook.com/RajyashFoundation",
    "https://www.instagram.com/rajyashfoundation",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
      />
      <PublicHeader />
      <LandingPage />
      <PublicFooter />
    </>
  );
}
