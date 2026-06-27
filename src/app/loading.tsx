import { HandHeart } from "lucide-react";

/**
 * Branded first-load / route-transition splash (System layer). Full-bleed
 * --splash gradient, a white logo mark with a soft ping, the wordmark beneath.
 * Motion is killed by the global prefers-reduced-motion block in globals.css.
 */
export default function Loading() {
  return (
    <div
      // NOT position:fixed — the route-transition shell (template.tsx) sets a
      // transform, which would scope `fixed` to that box. min-h-dvh fills the
      // viewport via normal flow and centres regardless of ancestor transforms.
      className="grid min-h-[100dvh] w-full place-items-center"
      style={{ background: "linear-gradient(160deg, var(--splash), var(--splash-2))" }}
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-5">
        <span className="relative grid size-20 place-items-center rounded-3xl bg-white text-primary shadow-lg">
          <span className="absolute inset-0 animate-ping rounded-3xl bg-white/30" aria-hidden />
          <HandHeart className="relative size-9" aria-hidden />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-white">
          Rajyash Food Rescue
        </span>
      </div>
    </div>
  );
}
