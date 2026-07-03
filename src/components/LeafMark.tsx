/**
 * The logo's gold leaf, redrawn as a ~12px inline glyph — the shared brand mark
 * (APP-UI-CHARTER §1.6: empty states, sign-in, loading).
 *
 * Inside the homepage `.rj-home` scope it uses the brand `--rj-gold` / `--rj-paper`
 * vars (unchanged look). Outside that scope those vars are undefined, so it falls
 * back to `currentColor` for the leaf and a transparent vein — letting app callers
 * tint it with `text-gold-ink` / `text-[#F6C445]`.
 */
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
        fill="var(--rj-gold, currentColor)"
        opacity="0.9"
      />
      <path
        d="M6 18C10 13 14 9 19 6"
        stroke="var(--rj-paper, transparent)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
