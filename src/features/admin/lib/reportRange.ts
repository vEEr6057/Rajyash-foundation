/**
 * Format a report's YYYY-MM-DD date range into a compact human label.
 *
 * Both bounds are anchored at UTC midnight (the query strings are date-only, so the
 * day must never drift across timezones). Three shapes:
 *   - same day    → "Jul 4, 2026"
 *   - same month  → "Jul 1 – 4, 2026"
 *   - cross month → "Jun 28, 2026 – Jul 4, 2026"
 *
 * `locale` is the raw next-intl locale ("en" | "gu" | "hi"); Intl localizes the
 * month name from it.
 */
export function formatReportRange(
  fromStr: string,
  toStr: string,
  locale: string,
): string {
  const dFrom = new Date(`${fromStr}T00:00:00Z`);
  const dTo = new Date(`${toStr}T00:00:00Z`);
  const dayOnly = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" });
  const monthDay = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const full = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const sameYear = dFrom.getUTCFullYear() === dTo.getUTCFullYear();
  const sameMonth = sameYear && dFrom.getUTCMonth() === dTo.getUTCMonth();
  const sameDay = sameMonth && dFrom.getUTCDate() === dTo.getUTCDate();

  if (sameDay) return full.format(dFrom); // "Jul 4, 2026"
  if (sameMonth) {
    // Share the month + year across the two days: "Jul 1 – 4, 2026".
    return `${monthDay.format(dFrom)} – ${dayOnly.format(dTo)}, ${dTo.getUTCFullYear()}`;
  }
  // Cross-month (or cross-year): full date on both sides.
  return `${full.format(dFrom)} – ${full.format(dTo)}`;
}
