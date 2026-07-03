"use client";

import { useEffect, useRef } from "react";

/**
 * The signature homepage motion (HOMEPAGE-SPEC §7): a single 1.5px gold SVG path
 * that reads as a "route" (echoing the app's pickup→delivery tracking). It draws on
 * scroll from the hero down to the provenance ledger's coral pulse.
 *
 * - Absolutely positioned inside a `relative` wrapper spanning hero→ledger.
 * - stroke-dashoffset mapped to scroll progress across that band (getTotalLength).
 * - rAF-throttled; listener attached only while the band is on screen.
 * - prefers-reduced-motion → fully drawn, static, no listener.
 * - Decorative only: aria-hidden; carries zero information. Skipped < 768px.
 */
export function RescueLine() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const svg = svgRef.current;
    if (!path || !svg) return;

    const mqMobile = window.matchMedia("(max-width: 767px)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;

    // Static, fully drawn for reduced-motion or mobile — no scroll listener.
    if (mqReduce.matches || mqMobile.matches) {
      path.style.strokeDashoffset = "0";
      return;
    }

    path.style.strokeDashoffset = `${len}`;
    const band = svg.parentElement; // the relative wrapper spanning hero→ledger
    if (!band) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = band.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when band top hits ~70% viewport, 1 when band bottom passes ~40%.
      const start = vh * 0.7;
      const end = -rect.height + vh * 0.4;
      const p = (start - rect.top) / (start - end);
      const progress = Math.max(0, Math.min(1, p));
      path.style.strokeDashoffset = `${len * (1 - progress)}`;
      svg.dataset.arrived = progress >= 0.98 ? "true" : "false";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    let attached = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !attached) {
          window.addEventListener("scroll", onScroll, { passive: true });
          attached = true;
          update();
        } else if (!entry.isIntersecting && attached) {
          window.removeEventListener("scroll", onScroll);
          attached = false;
        }
      },
      { rootMargin: "0px" },
    );
    io.observe(band);

    return () => {
      io.disconnect();
      if (attached) window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      role="presentation"
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full md:block"
      preserveAspectRatio="none"
      viewBox="0 0 100 1000"
      fill="none"
    >
      {/* Gentle vertical S-curve down the page — a "route", not a straight line. */}
      <path
        ref={pathRef}
        d="M 74 14 C 74 120, 22 180, 22 300 S 78 470, 78 600 S 30 760, 34 900"
        stroke="var(--rj-gold)"
        strokeWidth="0.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** The logo's gold leaf, redrawn as a ~12px inline divider/bullet glyph (spec §8). */
export function LeafMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16Z"
        fill="var(--rj-gold)"
        opacity="0.9"
      />
      <path d="M6 18C10 13 14 9 19 6" stroke="var(--rj-paper)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
