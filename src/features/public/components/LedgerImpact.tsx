"use client";

import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import { useCountUp } from "@tokens/motion";
import { LeafMark } from "./RescueLine";

/**
 * Provenance ledger (HOMEPAGE-SPEC §5.6): the live-impact data centrepiece, styled
 * like an accounting statement — tabular numerals, hairline rows, and a load-bearing
 * provenance sentence. Numbers come from getCachedImpactReport (real, cached).
 * The coral live-pulse dot is the page's one coral element in this viewport, and the
 * rescue-line terminates here.
 */
export function LedgerImpact({
  servings,
  kg,
  count,
}: {
  servings: number;
  kg: number;
  count: number;
}) {
  const t = useTranslations("landing");
  const r1 = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;
  const r2 = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;
  const r3 = useRef<HTMLElement>(null) as React.RefObject<HTMLElement>;
  useCountUp(r1, servings);
  useCountUp(r2, kg);
  useCountUp(r3, count);

  const rows = [
    { ref: r1, label: t("statMeals"), note: t("statMealsNote") },
    { ref: r2, label: t("statKg"), note: t("statKgNote") },
    { ref: r3, label: t("statDeliveries"), note: t("statDeliveriesNote") },
  ];

  return (
    <div
      className="relative z-10 rounded-[20px] border p-7 sm:p-9"
      style={{
        background: "var(--rj-paper-2)",
        borderColor: "var(--rj-hairline)",
        boxShadow: "var(--rj-shadow)",
        maxWidth: "52rem",
      }}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <span
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--rj-ink-soft)" }}
        >
          {t("impactEyebrow")}
        </span>
        <span
          className="inline-flex items-center gap-2 text-xs font-semibold"
          style={{ color: "var(--rj-ink-soft)" }}
        >
          <span
            className="rj-dot-live inline-block size-2 rounded-full"
            style={{ background: "var(--rj-coral)" }}
            data-rescue-terminus
          />
          {t("impactLive")}
        </span>
      </div>

      <dl>
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-6 py-4"
            style={{ borderTop: i ? "1px solid var(--rj-hairline)" : undefined }}
          >
            <dd
              ref={row.ref as React.RefObject<HTMLSpanElement>}
              className="rj-display tabular-nums"
              style={{
                fontSize: "clamp(2.75rem, 5vw, 4rem)",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                color: "var(--rj-ink)",
              }}
            >
              0
            </dd>
            <dt className="text-right">
              <span className="block text-sm font-semibold" style={{ color: "var(--rj-ink)" }}>
                {row.label}
              </span>
              <span className="block text-sm" style={{ color: "var(--rj-ink-soft)" }}>
                {row.note}
              </span>
            </dt>
          </div>
        ))}
      </dl>

      <p
        className="mt-6 flex items-start gap-2 text-sm leading-relaxed"
        style={{ color: "var(--rj-ink-soft)" }}
      >
        <LeafMark className="mt-0.5 size-4 shrink-0" />
        {t("impactProvenance")}
      </p>
    </div>
  );
}
