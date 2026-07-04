// Public Terms & Conditions (Razorpay website-compliance + basic legal hygiene).
// PUBLIC route (listed in middleware isPublicRoute); content lives in the
// `policies` i18n namespace (EN/GU/HI).
import { PolicyPage } from "@/features/public/components/PolicyPage";

export const metadata = {
  title: "Terms & Conditions",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <PolicyPage prefix="terms" sections={6} />;
}
