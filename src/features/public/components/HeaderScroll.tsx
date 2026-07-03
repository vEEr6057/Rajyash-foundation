"use client";

import { useEffect, useState } from "react";

/**
 * Homepage masthead shell (HOMEPAGE-SPEC §5.1): transparent over the hero, gains a
 * paper background + hairline + shadow once scrolled past 80px. rAF-throttled, no lib.
 */
export function HeaderScroll({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 80);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="rj-home rj-masthead sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-200"
    >
      {children}
    </header>
  );
}
