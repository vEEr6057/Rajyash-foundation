// Public Refund & Cancellation Policy — required by Razorpay's website-compliance
// review for payment activation. PUBLIC route; content in the `policies` namespace.
import { PolicyPage } from "@/features/public/components/PolicyPage";

export const metadata = {
  title: "Refund & Cancellation Policy",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return <PolicyPage prefix="refund" sections={4} />;
}
