"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { reportClientError } from "@/server/observability/reportClientError";

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
    // Fire-and-forget to the server so the client error PERSISTS in Workers Logs
    // (B5). Never let a reporting failure surface — the retry UI is what matters.
    void reportClientError({
      message: String(error),
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    }).catch(() => {});
  }, [error]);

  return (
    <main className="grid min-h-[70dvh] place-items-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="font-display text-5xl font-medium text-destructive">
          Oops
        </p>
        <h1 className="font-display text-2xl font-medium text-foreground">
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
