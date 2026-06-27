import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-semibold shadow-sm">
        🍲 Rajyash Foundation
      </span>
      <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl">
        Rescuing surplus food, with warmth.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Connecting surplus food to people in need across Ahmedabad. Donors give,
        volunteers deliver.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {userId ? (
          <Link
            href={ROUTES.portalDashboard}
            className={buttonVariants({ size: "lg" })}
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href={ROUTES.signUp} className={buttonVariants({ size: "lg" })}>
              Get started
            </Link>
            <Link
              href={ROUTES.signIn}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Sign in
            </Link>
          </>
        )}
      </div>
      <p className="mt-10 text-xs text-subtle-foreground">
        Full public site, donations &amp; impact counter land in Phase 7.
      </p>
    </main>
  );
}
