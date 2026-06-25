// ============================================================
// Rajyash Food-Rescue — MOTION presets for Motion (motion/react)
// Next 15 App Router + Tailwind v4 + shadcn. Pairs with motion.css.
// import { motion, AnimatePresence, useReducedMotion, useInView, animate } from "motion/react";
// ============================================================

export const EASE = {
  standard: [0.2, 0.8, 0.3, 1],   // settle / entrance
  out:      [0.16, 1, 0.3, 1],    // reveals, sheets (expo-out)
  in:       [0.4, 0, 1, 1],       // exits
  inOut:    [0.65, 0, 0.35, 1],   // A→B moves
  back:     [0.34, 1.56, 0.64, 1] // success pops (overshoot)
} as const;

export const DUR = {
  instant: 0.09, fast: 0.14, snappy: 0.2, base: 0.28, slow: 0.42, deliberate: 0.64
} as const;

// Springs. Prefer the tween presets above in the APP; reserve springs for the
// public site and one-shot success moments (cheap because they don't loop).
export const SPRING = {
  snappy: { type: "spring", stiffness: 400, damping: 28, mass: 0.7 }, // buttons, pills, badges
  gentle: { type: "spring", stiffness: 260, damping: 30 },           // bottom sheet, cards
  soft:   { type: "spring", stiffness: 180, damping: 26 }            // public hero, large
} as const;

// ---------- Scroll reveal (PUBLIC) ----------
// <motion.section variants={revealContainer} initial="hidden" whileInView="show"
//   viewport={ { once: true, amount: 0.3, margin: "-10% 0px" } }>
//   <motion.div variants={revealItem} /> ...
export const revealItem = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE.out } }
};
export const revealContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};

// Flatten any reveal/move when the user prefers reduced motion (opacity only).
export function safe<T extends Record<string, any>>(reduced: boolean, variants: T): T {
  if (!reduced) return variants;
  const flat: any = {};
  for (const k of Object.keys(variants)) {
    const v = { ...(variants as any)[k] };
    delete v.y; delete v.x; delete v.scale;
    if (v.transition) v.transition = { duration: 0.001 };
    flat[k] = v;
  }
  return flat;
}

// ---------- Status pill label swap (APP — tween, not spring) ----------
// <AnimatePresence mode="popLayout">
//   <motion.span key={status} {...pillLabel}>{label}</motion.span>
export const pillLabel = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE.standard } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.1 } }
};

// ---------- Claim / accept success (one-shot pop, app + public ok) ----------
export const successPop = {
  idle: { scale: 1 },
  done: { scale: [1, 1.08, 1], transition: { duration: 0.34, ease: EASE.back } }
};

// ---------- Toast (AnimatePresence) ----------
export const toastVariant = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.snappy, ease: EASE.standard } },
  exit:    { opacity: 0, y: 8, transition: { duration: DUR.fast, ease: EASE.in } }
};

// ---------- Bottom sheet (drag-to-dismiss) ----------
// <motion.div variants={sheetVariant} initial="hidden" animate="show" exit="exit"
//   drag="y" dragConstraints={ { top: 0 } } dragElastic={0.15}
//   onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) close(); }} />
export const sheetVariant = {
  hidden: { y: "100%" },
  show:   { y: 0, transition: SPRING.gentle },
  exit:   { y: "100%", transition: { duration: DUR.base, ease: EASE.in } }
};
export const backdropVariant = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: DUR.snappy } },
  exit:   { opacity: 0, transition: { duration: DUR.fast } }
};

// ---------- New-pickup badge bump (APP, cheap) ----------
export const badgeBump = { animate: { scale: [1, 1.22, 1], transition: { duration: 0.18, ease: EASE.back } } };

// ---------- Impact counter (PUBLIC) ----------
// const ref = useRef<HTMLSpanElement>(null);
// useCountUp(ref, 12480);  ->  <span ref={ref} className="tabular-nums">0</span>
import { useEffect, type RefObject } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

export function useCountUp(
  ref: RefObject<HTMLElement>,
  to: number,
  opts: { duration?: number; format?: (n: number) => string } = {}
) {
  const { duration = DUR.deliberate * 2.2, format = (n) => Math.round(n).toLocaleString("en-IN") } = opts;
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!ref.current || !inView) return;
    if (reduced) { ref.current.textContent = format(to); return; }      // land instantly
    const controls = animate(0, to, {
      duration,
      ease: EASE.out,
      onUpdate: (v) => { if (ref.current) ref.current.textContent = format(v); }
    });
    return () => controls.stop();
  }, [inView, to, reduced]);
}

// ---------- App route transition (cheap) ----------
// Prefer the CSS .rj-route-shell class on app/template.tsx (zero JS). If you want
// exit animations on a specific subtree, use AnimatePresence with this tween:
export const appRoute = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.snappy, ease: EASE.standard } },
  exit:    { opacity: 0, transition: { duration: DUR.fast } }
};
