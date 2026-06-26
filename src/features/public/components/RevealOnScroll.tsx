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

    setArmed(true);

    const el = ref.current;
    if (!el) return;

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
    return () => io.disconnect();
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
        transitionDelay: hidden ? "0ms" : `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
