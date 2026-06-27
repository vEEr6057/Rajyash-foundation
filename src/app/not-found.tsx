import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";

/** Polished 404 (System layer — "empty/lost" state). */
export default function NotFound() {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="font-display text-6xl font-extrabold tracking-tight text-primary">404</p>
        <h1 className="font-display text-2xl font-bold text-foreground">
          This page wandered off
        </h1>
        <p className="text-muted-foreground">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <Link href={ROUTES.home} className={buttonVariants({ size: "lg" })}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
