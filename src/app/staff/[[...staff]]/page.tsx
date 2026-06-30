import { SignIn } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { AuthSplitLayout } from "@/features/auth/components/AuthSplitLayout";

export const metadata = { title: "Staff sign in — Rajyash Food Rescue" };

// Dedicated staff (admin/coordinator) entry. Same Clerk auth as everyone, and it
// lands on the admin console. Admin role is granted manually via Clerk metadata
// (never self-selected). /admin stays role-gated in middleware + requireRole, so
// a non-admin who signs in here is refused at /admin — this page is a staff-only
// front door, linked only from the footer.
export default async function StaffSignInPage() {
  const t = await getTranslations("common");
  return (
    <AuthSplitLayout headline={t("staff.title")} subline={t("staff.subtitle")}>
      <div className="w-full max-w-sm space-y-3">
        <div className="text-center lg:text-left">
          {/* h2, not h1 — Clerk's <SignIn> card already renders the page's <h1>. */}
          <h2 className="font-display text-2xl font-bold text-foreground">
            {t("staff.heading")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("staff.hint")}</p>
        </div>
        <SignIn
          routing="path"
          path="/staff"
          forceRedirectUrl="/admin/dashboard"
          signUpUrl="/sign-up"
        />
      </div>
    </AuthSplitLayout>
  );
}
