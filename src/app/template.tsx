/**
 * Route-transition shell (MOTION.md §c) — cheap, enter-only fade+rise on every
 * in-app navigation. Zero JS; honours prefers-reduced-motion via globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="rj-route-shell">{children}</div>;
}
