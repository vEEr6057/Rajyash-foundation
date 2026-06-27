"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Global error boundary (System layer — "error" state). Client component, as
 * Next requires for error boundaries. Hardcoded EN copy: this can render when
 * the i18n provider context itself failed, so it must not depend on it.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("route error boundary", {
      err: String(error),
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="font-display text-5xl font-extrabold tracking-tight text-destructive">
          Oops
        </p>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Try again — if it keeps happening, please
          let us know.
        </p>
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
