// src/features/public/components/ImpactCounter.tsx
// Client component — useCountUp uses useEffect + IntersectionObserver (motion/react).
"use client";

import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import { useCountUp } from "@tokens/motion"; // @tokens/* alias added in Plan 07-00

export function ImpactCounter({
  servings,
  kg,
  count,
}: {
  servings: number;
  kg: number;
  count: number;
}) {
  // Namespace: "landing" — flat keys from landing.json (statMeals, statKg, statDeliveries)
  const t = useTranslations("landing");
  // useCountUp expects RefObject<HTMLElement> — use HTMLElement to satisfy the type signature.
  const servingsRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;
  const kgRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;
  const countRef = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;

  // useCountUp handles prefers-reduced-motion internally — no extra guard needed.
  // Signature: (ref, to, opts?) — defaults to en-IN locale formatting.
  useCountUp(servingsRef, servings);
  useCountUp(kgRef, kg);
  useCountUp(countRef, count);

  return (
    <section
      id="impact"
      aria-label={t("impactTitle")}
      className="bg-primary/5 py-16 text-center"
    >
      <div className="mx-auto max-w-5xl px-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          {t("impactEyebrow")}
        </p>
        <h2 className="font-display mb-2 text-2xl font-bold text-foreground sm:text-3xl">
          {t("impactTitle")}
        </h2>
        <p className="mb-10 text-sm text-muted-foreground">{t("impactSub")}</p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Meals */}
          <div className="flex flex-col items-center gap-1">
            <span
              ref={servingsRef}
              className="font-display tabular-nums text-5xl font-extrabold text-primary"
            >
              0
            </span>
            <p className="text-base font-semibold text-foreground">
              {t("statMeals")}
            </p>
            <p className="text-xs text-muted-foreground">{t("statMealsNote")}</p>
          </div>

          {/* Kilograms */}
          <div className="flex flex-col items-center gap-1">
            <span
              ref={kgRef}
              className="font-display tabular-nums text-5xl font-extrabold text-primary"
            >
              0
            </span>
            <p className="text-base font-semibold text-foreground">
              {t("statKg")}
            </p>
            <p className="text-xs text-muted-foreground">{t("statKgNote")}</p>
          </div>

          {/* Deliveries */}
          <div className="flex flex-col items-center gap-1">
            <span
              ref={countRef}
              className="font-display tabular-nums text-5xl font-extrabold text-primary"
            >
              0
            </span>
            <p className="text-base font-semibold text-foreground">
              {t("statDeliveries")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("statDeliveriesNote")}
            </p>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block size-2 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
          {t("impactLive")}
        </p>
      </div>
    </section>
  );
}
