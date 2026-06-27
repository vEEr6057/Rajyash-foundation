// src/features/public/components/ImpactCounter.tsx
// Client component — useCountUp uses useEffect + IntersectionObserver (motion/react).
"use client";

import React, { useRef } from "react";
import { Utensils, Scale, Truck } from "lucide-react";
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

  const cards = [
    {
      ref: servingsRef,
      label: t("statMeals"),
      note: t("statMealsNote"),
      icon: <Utensils className="size-6" aria-hidden />,
      chip: "bg-primary-soft text-primary-soft-foreground",
    },
    {
      ref: kgRef,
      label: t("statKg"),
      note: t("statKgNote"),
      icon: <Scale className="size-6" aria-hidden />,
      chip: "bg-leaf-soft text-leaf-soft-foreground",
    },
    {
      ref: countRef,
      label: t("statDeliveries"),
      note: t("statDeliveriesNote"),
      icon: <Truck className="size-6" aria-hidden />,
      chip: "bg-primary-soft text-primary-soft-foreground",
    },
  ];

  return (
    <section id="impact" aria-label={t("impactTitle")} className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[1.75rem] border border-border bg-surface-2 p-7 sm:p-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-saffron">
                  {t("impactEyebrow")}
                </span>
                <span className="h-px w-11 bg-border-strong" aria-hidden />
              </div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {t("impactTitle")}
              </h2>
              <p className="mt-2 max-w-prose text-sm text-muted-foreground sm:text-base">
                {t("impactSub")}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="rj-dot-live inline-block size-2 rounded-full bg-leaf-bright" aria-hidden="true" />
              {t("impactLive")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cards.map((card, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <span className={`grid size-11 place-items-center rounded-xl ${card.chip}`}>
                  {card.icon}
                </span>
                <span
                  ref={card.ref}
                  className="mt-4 block font-display text-5xl font-extrabold tabular-nums tracking-tight text-foreground"
                >
                  0
                </span>
                <p className="mt-2 text-base font-bold text-foreground">{card.label}</p>
                <p className="text-sm text-muted-foreground">{card.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
