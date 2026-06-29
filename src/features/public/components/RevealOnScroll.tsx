// src/features/public/components/RevealOnScroll.tsx
// Client component — scroll-reveal wrapper (design uses data-reveal fade + slide-up).
// Progressive enhancement: children render fully visible on the server and until
// mounted, so no-JS / SSR always shows content. Only after mount (client) do we
// hide-then-reveal on scroll-into-view. Honors prefers-reduced-motion: if reduced,
// content stays visible with no animation. Transform + opacity only (cheap).
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function RevealOnScroll({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Stagger delay in ms (mirrors the design's data-delay). */
  delay?: number;
  className?: string;
  /** Element to render as — keeps semantics (e.g. "section", "li"). */
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  // `armed` = client has mounted AND motion is allowed → we may hide-then-reveal.
  // Until armed, render visible (SSR + no-JS + reduced-motion all stay visible).
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // leave visible, no animation

    const el = ref.current;
    if (!el) return;

    // Already in view on mount (above-fold) → reveal immediately, never hide.
    // Prevents the "empty first paint" where above-fold content flashed hidden.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
      setShown(true);
      return;
    }

    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    // Safety: never leave content stuck hidden if the observer never fires.
    const fallback = setTimeout(() => setShown(true), 1500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  // Hidden state only applies once armed and not yet shown.
  const hidden = armed && !shown;

  // Callback ref writes into our mutable ref — sidesteps the union element typing
  // (div | section | li) that a plain RefObject can't satisfy across all three.
  const setRef = (node: HTMLElement | null) => {
    ref.current = node;
  };

  return (
    <Tag
      ref={setRef}
      className={cn(
        "motion-reduce:!opacity-100 motion-reduce:!transform-none",
        className,
      )}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(20px)" : "none",
        transition:
          "opacity 500ms var(--ease-out, ease-out), transform 500ms var(--ease-out, ease-out)",
        transitionDelay: hidden ? `${delay}ms` : "0ms",
      }}
    >
      {children}
    </Tag>
  );
}
